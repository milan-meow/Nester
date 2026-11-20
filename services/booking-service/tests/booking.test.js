const request = require('supertest');
const { MemoryRepository, MemoryEventBus, signToken, notFound, unavailable } = require('@nestar/common');
const { createApp } = require('../src/app');

const SECRET = 'test-secret';
const owner = { id: 'owner-1', role: 'owner', name: 'Ann' };
const tenant = { id: 'tenant-1', role: 'seeker', name: 'Cho' };
const tenant2 = { id: 'tenant-2', role: 'seeker', name: 'Dae' };
const stranger = { id: 'x', role: 'seeker', name: 'X' };
const bearer = (u) => ({ Authorization: `Bearer ${signToken(u, SECRET)}` });

/** In-memory stand-in for property-service. */
function fakePropertyClient() {
  const props = new Map([
    ['flat', { id: 'flat', title: 'Nice flat', ownerId: 'owner-1', purpose: 'rent', status: 'available' }],
    ['house', { id: 'house', title: 'Big house', ownerId: 'owner-1', purpose: 'sale', status: 'available' }],
  ]);
  return {
    props,
    down: false,
    async getProperty(id) {
      if (this.down) throw unavailable();
      if (!props.has(id)) throw notFound('Property not found');
      return { ...props.get(id) };
    },
    async setStatus(id, status) {
      if (this.down) throw unavailable();
      props.get(id).status = status;
      return { ...props.get(id) };
    },
  };
}

let app;
let bus;
let props;
beforeEach(() => {
  bus = new MemoryEventBus();
  props = fakePropertyClient();
  app = createApp({ bookings: new MemoryRepository(), bus, propertyClient: props, jwtSecret: SECRET });
});

const book = (user, body) => request(app).post('/bookings').set(bearer(user)).send(body);
const setStatus = (user, id, status) => request(app).patch(`/bookings/${id}/status`).set(bearer(user)).send({ status });

describe('create', () => {
  test('tenant sends a rent request → pending + event with owner id', async () => {
    const res = await book(tenant, { propertyId: 'flat', kind: 'rent_request', message: 'Hi!' }).expect(201);
    expect(res.body.booking).toMatchObject({ status: 'pending', ownerId: 'owner-1', requesterId: 'tenant-1', propertyTitle: 'Nice flat' });
    expect(bus.published.at(-1)).toMatchObject({ topic: 'booking.created', payload: { ownerId: 'owner-1' } });
  });

  test('business rules are enforced', async () => {
    await book(owner, { propertyId: 'flat', kind: 'rent_request' }).expect(400);
    await book(tenant, { propertyId: 'flat', kind: 'offer', amount: 10 }).expect(400);
    await book(tenant, { propertyId: 'house', kind: 'offer' }).expect(400);
  });

  test('no duplicate pending request', async () => {
    await book(tenant, { propertyId: 'flat', kind: 'rent_request' }).expect(201);
    await book(tenant, { propertyId: 'flat', kind: 'rent_request' }).expect(409);
  });

  test('unknown property → 404; property-service down → 503', async () => {
    await book(tenant, { propertyId: 'nope', kind: 'viewing', visitDate: '2099-01-01' }).expect(404);
    props.down = true;
    await book(tenant, { propertyId: 'flat', kind: 'rent_request' }).expect(503);
  });

  test('requires login', async () => {
    await request(app).post('/bookings').send({ propertyId: 'flat', kind: 'rent_request' }).expect(401);
  });
});

describe('status workflow', () => {
  test('owner accepts offer → property sold, rivals auto-rejected', async () => {
    const a = (await book(tenant, { propertyId: 'house', kind: 'offer', amount: 400000 })).body.booking;
    const b = (await book(tenant2, { propertyId: 'house', kind: 'offer', amount: 390000 })).body.booking;

    const res = await setStatus(owner, a.id, 'accepted').expect(200);
    expect(res.body.booking.status).toBe('accepted');
    expect(props.props.get('house').status).toBe('sold');

    const rival = await request(app).get(`/bookings/${b.id}`).set(bearer(tenant2)).expect(200);
    expect(rival.body.booking.status).toBe('rejected');
    const statusEvents = bus.published.filter((e) => e.topic === 'booking.status_changed');
    expect(statusEvents).toHaveLength(2);
  });

  test('accepted rent request → property rented', async () => {
    const a = (await book(tenant, { propertyId: 'flat', kind: 'rent_request' })).body.booking;
    await setStatus(owner, a.id, 'accepted').expect(200);
    expect(props.props.get('flat').status).toBe('rented');
  });

  test('accepted viewing does not change the property', async () => {
    const v = (await book(tenant, { propertyId: 'house', kind: 'viewing', visitDate: '2099-01-01T10:00:00Z' })).body.booking;
    await setStatus(owner, v.id, 'accepted').expect(200);
    expect(props.props.get('house').status).toBe('available');
  });

  test('only the owner can accept/reject, only the requester can cancel', async () => {
    const a = (await book(tenant, { propertyId: 'flat', kind: 'rent_request' })).body.booking;
    await setStatus(tenant, a.id, 'accepted').expect(403);
    await setStatus(stranger, a.id, 'rejected').expect(403);
    await setStatus(owner, a.id, 'cancelled').expect(403);
    await setStatus(tenant, a.id, 'cancelled').expect(200);
    await setStatus(owner, a.id, 'accepted').expect(409); // already final
  });

  test('if property-service fails while accepting, booking stays pending', async () => {
    const a = (await book(tenant, { propertyId: 'flat', kind: 'rent_request' })).body.booking;
    props.down = true;
    await setStatus(owner, a.id, 'accepted').expect(503);
    props.down = false;
    const after = await request(app).get(`/bookings/${a.id}`).set(bearer(owner));
    expect(after.body.booking.status).toBe('pending');
  });
});

describe('listing & privacy', () => {
  test('mine / incoming / get visibility', async () => {
    const a = (await book(tenant, { propertyId: 'flat', kind: 'rent_request' })).body.booking;
    expect((await request(app).get('/bookings/mine').set(bearer(tenant))).body.items).toHaveLength(1);
    expect((await request(app).get('/bookings/incoming').set(bearer(owner))).body.items).toHaveLength(1);
    expect((await request(app).get('/bookings/incoming?status=accepted').set(bearer(owner))).body.items).toHaveLength(0);
    await request(app).get(`/bookings/${a.id}`).set(bearer(stranger)).expect(403);
  });
});
