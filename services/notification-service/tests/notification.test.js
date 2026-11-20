const request = require('supertest');
const { MemoryRepository, MemoryEventBus, signToken, Topics } = require('@nestar/common');
const { createApp } = require('../src/app');
const { registerSubscribers, builders } = require('../src/subscribers');

const SECRET = 'test-secret';
const ann = { id: 'ann', role: 'owner', name: 'Ann' };
const cho = { id: 'cho', role: 'seeker', name: 'Cho' };
const bearer = (u) => ({ Authorization: `Bearer ${signToken(u, SECRET)}` });
const flush = () => new Promise((r) => setTimeout(r, 10));

let app;
let bus;
beforeEach(async () => {
  bus = new MemoryEventBus();
  const notifications = new MemoryRepository();
  await registerSubscribers(bus, notifications);
  app = createApp({ notifications, jwtSecret: SECRET });
});

describe('message builders', () => {
  test('booking.created → owner', () => {
    const [n] = builders[Topics.BOOKING_CREATED]({ ownerId: 'ann', requesterName: 'Cho', kind: 'rent_request', propertyTitle: 'Flat' });
    expect(n).toMatchObject({ userId: 'ann', message: 'Cho sent a rental request for "Flat".' });
  });

  test('status accepted → requester; cancelled → owner', () => {
    const base = { ownerId: 'ann', requesterId: 'cho', kind: 'offer', propertyTitle: 'House' };
    expect(builders[Topics.BOOKING_STATUS_CHANGED]({ ...base, status: 'accepted' })[0]).toMatchObject({
      userId: 'cho', message: 'Your purchase offer for "House" was accepted 🎉.',
    });
    expect(builders[Topics.BOOKING_STATUS_CHANGED]({ ...base, status: 'cancelled' })[0]).toMatchObject({
      userId: 'ann', message: 'A purchase offer for "House" was cancelled.',
    });
  });
});

describe('inbox API', () => {
  beforeEach(async () => {
    await bus.publish(Topics.USER_REGISTERED, { userId: 'ann', name: 'Ann' });
    await bus.publish(Topics.BOOKING_CREATED, { ownerId: 'ann', requesterName: 'Cho', kind: 'offer', propertyTitle: 'House' });
    await bus.publish(Topics.USER_REGISTERED, { userId: 'cho', name: 'Cho' });
    await flush();
  });

  test('each user sees only their own notifications', async () => {
    const res = await request(app).get('/notifications').set(bearer(ann)).expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.unreadCount).toBe(2);
    expect(res.body.items.every((n) => n.userId === 'ann')).toBe(true);
  });

  test('mark one / all as read', async () => {
    const { body } = await request(app).get('/notifications').set(bearer(ann));
    await request(app).patch(`/notifications/${body.items[0].id}/read`).set(bearer(ann)).expect(200);
    expect((await request(app).get('/notifications').set(bearer(ann))).body.unreadCount).toBe(1);
    await request(app).patch('/notifications/read-all').set(bearer(ann)).expect(200);
    expect((await request(app).get('/notifications?unread=true').set(bearer(ann))).body.items).toHaveLength(0);
  });

  test("cannot touch someone else's notification", async () => {
    const { body } = await request(app).get('/notifications').set(bearer(ann));
    await request(app).patch(`/notifications/${body.items[0].id}/read`).set(bearer(cho)).expect(404);
  });

  test('requires login', async () => {
    await request(app).get('/notifications').expect(401);
  });
});
