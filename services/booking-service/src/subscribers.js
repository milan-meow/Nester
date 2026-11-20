const { Topics } = require('@nestar/common');

/**
 * Keeps bookings consistent when a listing changes outside the booking flow:
 * the owner deletes it, or marks it sold/rented themselves.
 */
async function registerSubscribers(bus, service) {
  await bus.subscribe(Topics.PROPERTY_DELETED, ({ payload }) =>
    service.closePendingForProperty(payload.propertyId, 'This listing was removed by the owner'));

  await bus.subscribe(Topics.PROPERTY_UPDATED, ({ payload }) => {
    if (payload.status && payload.status !== 'available') {
      return service.closePendingForProperty(payload.propertyId, `This listing is now ${payload.status}`);
    }
    return undefined;
  });
}

module.exports = { registerSubscribers };
