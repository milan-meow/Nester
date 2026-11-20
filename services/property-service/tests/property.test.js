const request = require('supertest');
const { MemoryRepository, MemoryEventBus, signToken } = require('@nestar/common');
const { createApp } = require('../src/app');

const SECRET = 'test-secret';
const KEY = 'internal-test-key';
const owner = { id: 'owner-1', role: 'owner', name: 'Ann' };
const otherOwner = { id: 'owner-2', role: 'owner', name: 'Ben' };
const seeker = { id: 'seeker-1', role: 'seeker', name: 'Cho' };
const admin = { id: 'admin-1', role: 'admin', name: 'Root' };
const bearer = (u) => ({ Authorization: `Bearer ${signToken(u, SECRET)}` });

const listing = (over = {}) => ({
  title: 'Sunny 2BR apartment near Gangnam',
  description: 'Bright apartment, 5 minutes from the subway, newly renovated kitchen.',
  type: 'apartment',
  purpose: 'rent',
  rentPeriod: 'month',
  price: 1500,
  city: 'Seoul',
  address: '123 Teheran-ro',
  bedrooms: 2,
  bathrooms: 1,
  areaSqm: 70,
  ...over,
});

let app;
let bus;
beforeEach(() => {
  bus = new MemoryEventBus();
  app = createApp({ properties: new MemoryRepository(), bus, jwtSecret: SECRET, internalKey: KEY });
});

const create = (body = listing(), user = owner) => request(app).post('/properties').set(bearer(user)).send(body);

describe('create listing', () => {
  test('owner can post; status starts available; event published', async () => {
    const res = await create().expect(201);
    expect(res.body.property).toMatchObject({ ownerId: 'owner-1', ownerName: 'Ann', status: 'available' });
    expect(bus.published[0].topic).toBe('property.created');
  });

  test('seeker cannot post', async () => {
    await create(listing(), seeker).expect(403);
  });

  test('guest cannot post', async () => {
    await request(app).post('/properties').send(listing()).expect(401);
  });

  test('client cannot set ownerId or status', async () => {
    const res = await create(listing({ ownerId: 'someone-else', status: 'sold' })).expect(201);
    expect(res.body.property.ownerId).toBe('owner-1');
    expect(res.body.property.status).toBe('available');
  });

  test('rent listing needs rentPeriod; sale listing drops it', async () => {
    await create(listing({ rentPeriod: undefined })).expect(400);
    const res = await create(listing({ purpose: 'sale', price: 450000 })).expect(201);
    expect(res.body.property.rentPeriod).toBeUndefined();
  });

  test('rejects bad values', async () => {
    const res = await create(listing({ type: 'castle', price: -5, images: ['javascript:alert(1)'] })).expect(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['images', 'price', 'type']);
  });
});

describe('search', () => {
  beforeEach(async () => {
    await create(listing({ title: 'Cheap studio in Seoul', price: 500, bedrooms: 0 }));
    await create(listing({ title: 'Family house in Busan', type: 'house', purpose: 'sale', price: 300000, city: 'Busan', bedrooms: 4 }));
    await create(listing({ title: 'Corner shop in Seoul', type: 'shop', price: 3000, bedrooms: 0 }));
  });

  test('public, filters combine', async () => {
    const res = await request(app).get('/properties?purpose=rent&city=seo&maxPrice=1000').expect(200);
    expect(res.body.items.map((p) => p.title)).toEqual(['Cheap studio in Seoul']);
  });

  test('type + bedrooms filter', async () => {
    const res = await request(app).get('/properties?type=house&bedrooms=3').expect(200);
    expect(res.body.total).toBe(1);
  });

  test('pagination and sort', async () => {
    const res = await request(app).get('/properties?sort=price_asc&limit=2&page=1').expect(200);
    expect(res.body).toMatchObject({ total: 3, pages: 2, page: 1 });
    expect(res.body.items.map((p) => p.price)).toEqual([500, 3000]);
  });

  test('regex characters in search are treated literally', async () => {
    const res = await request(app).get('/properties?q=(a%2B)%2B$').expect(200);
    expect(res.body.total).toBe(0);
  });

  test('sold / rented listings are hidden from search', async () => {
    const { body } = await request(app).get('/properties?type=shop');
    await request(app).patch(`/internal/properties/${body.items[0].id}/status`).set('x-internal-key', KEY).send({ status: 'rented' }).expect(200);
    const after = await request(app).get('/properties?type=shop');
    expect(after.body.total).toBe(0);
  });

  test('invalid query params give 400', async () => {
    await request(app).get('/properties?limit=1000').expect(400);
  });
});

describe('update & delete', () => {
  let id;
  beforeEach(async () => {
    id = (await create()).body.property.id;
  });

  test('owner can update', async () => {
    const res = await request(app).patch(`/properties/${id}`).set(bearer(owner)).send({ price: 1400 }).expect(200);
    expect(res.body.property.price).toBe(1400);
  });

  test('another owner cannot update or delete', async () => {
    await request(app).patch(`/properties/${id}`).set(bearer(otherOwner)).send({ price: 1 }).expect(403);
    await request(app).delete(`/properties/${id}`).set(bearer(otherOwner)).expect(403);
  });

  test('admin can moderate', async () => {
    await request(app).delete(`/properties/${id}`).set(bearer(admin)).expect(204);
    await request(app).get(`/properties/${id}`).expect(404);
  });

  test('switching to rent without rentPeriod is rejected', async () => {
    const sale = (await create(listing({ purpose: 'sale', rentPeriod: undefined }))).body.property;
    await request(app).patch(`/properties/${sale.id}`).set(bearer(owner)).send({ purpose: 'rent' }).expect(400);
  });

  test('/mine lists only my listings, any status', async () => {
    await create(listing(), otherOwner);
    const res = await request(app).get('/properties/mine').set(bearer(owner)).expect(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('internal routes', () => {
  test('need the internal key', async () => {
    const id = (await create()).body.property.id;
    await request(app).get(`/internal/properties/${id}`).expect(403);
    await request(app).get(`/internal/properties/${id}`).set('x-internal-key', KEY).expect(200);
  });
});

test('internal status compare-and-set: second accept gets 409', async () => {
  const id = (await create()).body.property.id;
  const set = () => request(app).patch(`/internal/properties/${id}/status`).set('x-internal-key', KEY).send({ status: 'rented', expectedStatus: 'available' });
  await set().expect(200);
  await set().expect(409);
});
