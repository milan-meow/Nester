const { validate, badRequest, forbidden, notFound, Topics } = require('@nestar/common');
const { propertySchema, updateSchema, searchSchema, statusSchema } = require('./schemas');

// User text goes into a regex → escape it, otherwise "(a+)+$" could hang the server (ReDoS).
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
};

function checkRentPeriod(data) {
  if (data.purpose === 'rent' && !data.rentPeriod) {
    throw badRequest('Validation failed', [{ field: 'rentPeriod', message: 'is required for rentals' }]);
  }
  if (data.purpose === 'sale') delete data.rentPeriod;
}

function createPropertyService({ properties, bus }) {
  async function getOrThrow(id) {
    const p = await properties.findById(id);
    if (!p) throw notFound('Property not found');
    return p;
  }

  function assertCanEdit(property, user) {
    if (property.ownerId !== user.id && user.role !== 'admin') {
      throw forbidden('Only the owner can change this listing');
    }
  }

  return {
    async create(user, input) {
      const data = validate(propertySchema, input);
      checkRentPeriod(data);
      const property = await properties.create({
        ...data,
        ownerId: user.id,
        ownerName: user.name,
        status: 'available',
      });
      await bus.publish(Topics.PROPERTY_CREATED, {
        propertyId: property.id, ownerId: property.ownerId, title: property.title,
      });
      return property;
    },

    async search(query) {
      const q = validate(searchSchema, query);
      const filter = { status: 'available' };
      if (q.purpose) filter.purpose = q.purpose;
      if (q.type) filter.type = q.type;
      if (q.city) filter.city = { $regex: `^${escapeRegex(q.city)}`, $options: 'i' };
      if (q.q) filter.title = { $regex: escapeRegex(q.q), $options: 'i' };
      if (q.bedrooms !== undefined) filter.bedrooms = { $gte: q.bedrooms };
      if (q.minPrice !== undefined || q.maxPrice !== undefined) {
        filter.price = {};
        if (q.minPrice !== undefined) filter.price.$gte = q.minPrice;
        if (q.maxPrice !== undefined) filter.price.$lte = q.maxPrice;
      }

      const skip = (q.page - 1) * q.limit;
      const [items, total] = await Promise.all([
        properties.find(filter, { sort: SORTS[q.sort], skip, limit: q.limit }),
        properties.count(filter),
      ]);
      return { items, page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) };
    },

    async mine(user) {
      return properties.find({ ownerId: user.id });
    },

    get: getOrThrow,

    async update(user, id, input) {
      const existing = await getOrThrow(id);
      assertCanEdit(existing, user);
      const patch = validate(updateSchema, input, { partial: true });
      const merged = { ...existing, ...patch };
      checkRentPeriod(merged);
      if (merged.purpose === 'sale') patch.rentPeriod = null;
      const updated = await properties.updateById(id, patch);
      await bus.publish(Topics.PROPERTY_UPDATED, { propertyId: id, ownerId: existing.ownerId, changes: Object.keys(patch) });
      return updated;
    },

    async remove(user, id) {
      const existing = await getOrThrow(id);
      assertCanEdit(existing, user);
      await properties.deleteById(id);
      await bus.publish(Topics.PROPERTY_DELETED, { propertyId: id, ownerId: existing.ownerId, title: existing.title });
    },

    /** Internal: called by booking-service when a deal is accepted. */
    async setStatus(id, input) {
      await getOrThrow(id);
      const { status } = validate(statusSchema, input);
      return properties.updateById(id, { status });
    },
  };
}

module.exports = { createPropertyService, escapeRegex };
