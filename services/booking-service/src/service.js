const { validate, badRequest, forbidden, notFound, conflict, Topics } = require('@nestar/common');
const { KINDS, PROPERTY_STATUS_ON_ACCEPT, bookingProblem, whoCanSet } = require('./rules');

const createSchema = {
  propertyId: { type: 'string', required: true, max: 64 },
  kind: { type: 'string', required: true, enum: KINDS },
  amount: { type: 'number', min: 1 },
  visitDate: { type: 'date' },
  moveInDate: { type: 'date' },
  message: { type: 'string', max: 1000 },
};

const statusSchema = {
  status: { type: 'string', required: true, enum: ['accepted', 'rejected', 'cancelled'] },
  reply: { type: 'string', max: 1000 },
};

function createBookingService({ bookings, bus, propertyClient }) {
  async function getOrThrow(id) {
    const b = await bookings.findById(id);
    if (!b) throw notFound('Booking not found');
    return b;
  }

  async function publishStatus(booking) {
    await bus.publish(Topics.BOOKING_STATUS_CHANGED, {
      bookingId: booking.id,
      propertyId: booking.propertyId,
      propertyTitle: booking.propertyTitle,
      kind: booking.kind,
      status: booking.status,
      ownerId: booking.ownerId,
      requesterId: booking.requesterId,
    });
  }

  return {
    async create(user, input) {
      const data = validate(createSchema, input);
      const property = await propertyClient.getProperty(data.propertyId);

      const problem = bookingProblem(property, user, data);
      if (problem) throw badRequest(problem);

      const duplicate = await bookings.findOne({
        propertyId: property.id, requesterId: user.id, kind: data.kind, status: 'pending',
      });
      if (duplicate) throw conflict('You already have a pending request of this kind for this listing');

      const booking = await bookings.create({
        ...data,
        propertyTitle: property.title,
        propertyPurpose: property.purpose,
        ownerId: property.ownerId,
        requesterId: user.id,
        requesterName: user.name,
        status: 'pending',
      });

      await bus.publish(Topics.BOOKING_CREATED, {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        propertyTitle: booking.propertyTitle,
        kind: booking.kind,
        ownerId: booking.ownerId,
        requesterId: booking.requesterId,
        requesterName: booking.requesterName,
        amount: booking.amount,
        visitDate: booking.visitDate,
      });
      return booking;
    },

    async get(user, id) {
      const b = await getOrThrow(id);
      if (![b.ownerId, b.requesterId].includes(user.id) && user.role !== 'admin') throw forbidden();
      return b;
    },

    mine: (user) => bookings.find({ requesterId: user.id }),

    incoming: (user, status) => bookings.find(status ? { ownerId: user.id, status } : { ownerId: user.id }),

    async changeStatus(user, id, input) {
      const { status, reply } = validate(statusSchema, input);
      const booking = await getOrThrow(id);

      const allowed = whoCanSet(booking, status);
      if (!allowed) throw conflict(`This request is already ${booking.status}`);
      const actorId = allowed === 'owner' ? booking.ownerId : booking.requesterId;
      if (user.id !== actorId) throw forbidden(`Only the ${allowed} can mark this request as ${status}`);

      // Accepting a deal changes the property first: if that fails, the booking stays pending.
      const newPropertyStatus = status === 'accepted' ? PROPERTY_STATUS_ON_ACCEPT[booking.kind] : null;
      // Compare-and-set on property-service, so two parallel accepts can't both succeed.
      if (newPropertyStatus) {
        await propertyClient.setStatus(booking.propertyId, newPropertyStatus, 'available');
      }

      const updated = await bookings.updateById(id, { status, reply, decidedAt: new Date().toISOString() });
      await publishStatus(updated);

      // The property is gone → politely reject the other pending offers / rent requests.
      if (newPropertyStatus) {
        const others = await bookings.find({
          propertyId: booking.propertyId, status: 'pending', kind: { $in: ['offer', 'rent_request', 'viewing'] },
        });
        for (const other of others) {
          const rejected = await bookings.updateById(other.id, {
            status: 'rejected', reply: 'Another request was accepted for this listing', decidedAt: new Date().toISOString(),
          });
          await publishStatus(rejected);
        }
      }
      return updated;
    },
  };
}

module.exports = { createBookingService };
