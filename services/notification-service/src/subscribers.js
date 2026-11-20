const { Topics } = require('@nestar/common');

const KIND_LABEL = { offer: 'a purchase offer', rent_request: 'a rental request', viewing: 'a viewing request' };

/**
 * Turns domain events into notifications. Each builder returns a list of
 * { userId, type, message, link } — zero, one or many recipients.
 */
const builders = {
  [Topics.USER_REGISTERED]: (p) => [
    { userId: p.userId, type: 'welcome', message: `Welcome to Nestar, ${p.name}! 🏡`, link: '/' },
  ],

  [Topics.PROPERTY_CREATED]: (p) => [
    { userId: p.ownerId, type: 'property', message: `Your listing "${p.title}" is live.`, link: `/properties/${p.propertyId}` },
  ],

  [Topics.BOOKING_CREATED]: (p) => [
    {
      userId: p.ownerId,
      type: 'booking',
      message: `${p.requesterName} sent ${KIND_LABEL[p.kind] || 'a request'} for "${p.propertyTitle}".`,
      link: '/dashboard',
    },
  ],

  [Topics.BOOKING_STATUS_CHANGED]: (p) => {
    const label = KIND_LABEL[p.kind] || 'request';
    if (p.status === 'cancelled') {
      return [{ userId: p.ownerId, type: 'booking', message: `A ${label.replace(/^an? /, '')} for "${p.propertyTitle}" was cancelled.`, link: '/dashboard' }];
    }
    const verb = p.status === 'accepted' ? 'accepted 🎉' : 'declined';
    return [{ userId: p.requesterId, type: 'booking', message: `Your ${label.replace(/^an? /, '')} for "${p.propertyTitle}" was ${verb}.`, link: '/dashboard' }];
  },
};

async function registerSubscribers(bus, notifications) {
  for (const [topic, build] of Object.entries(builders)) {
    await bus.subscribe(topic, async (event) => {
      const items = build(event.payload || {}).filter((n) => n.userId);
      for (const n of items) await notifications.create({ ...n, read: false, sourceTopic: topic });
    });
  }
}

module.exports = { registerSubscribers, builders };
