/**
 * Pure business rules — no I/O, so they're trivial to unit-test.
 */

const KINDS = ['offer', 'rent_request', 'viewing'];
const STATUSES = ['pending', 'accepted', 'rejected', 'cancelled'];

/** Which kinds make sense for which listing purpose. */
const ALLOWED_KINDS = { sale: ['offer', 'viewing'], rent: ['rent_request', 'viewing'] };

/** Who may move a booking from pending → X. Final states can't change. */
const TRANSITIONS = {
  accepted: 'owner',
  rejected: 'owner',
  cancelled: 'requester',
};

/** Property status after a booking of this kind is accepted. */
const PROPERTY_STATUS_ON_ACCEPT = { offer: 'sold', rent_request: 'rented', viewing: null };

function bookingProblem(property, user, data, now = new Date()) {
  if (property.ownerId === user.id) return 'You cannot make a request on your own listing';
  if (property.status !== 'available') return 'This listing is no longer available';
  if (!ALLOWED_KINDS[property.purpose].includes(data.kind)) {
    return property.purpose === 'sale'
      ? 'This property is for sale — send an offer or book a viewing'
      : 'This property is for rent — send a rent request or book a viewing';
  }
  if (data.kind === 'offer' && !(data.amount > 0)) return 'An offer needs an amount';
  if (data.kind === 'viewing') {
    if (!data.visitDate) return 'A viewing needs a visit date';
    if (new Date(data.visitDate) <= now) return 'The visit date must be in the future';
  }
  return null;
}

/** Returns 'owner' | 'requester' | null for who is allowed to make this transition. */
function whoCanSet(booking, nextStatus) {
  if (booking.status !== 'pending') return null;
  return TRANSITIONS[nextStatus] || null;
}

module.exports = { KINDS, STATUSES, ALLOWED_KINDS, PROPERTY_STATUS_ON_ACCEPT, bookingProblem, whoCanSet };
