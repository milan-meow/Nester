#!/usr/bin/env node
/**
 * End-to-end smoke test THROUGH THE GATEWAY against a running stack
 * (npm run dev, or docker compose up). Exits non-zero on the first failure.
 */
const assert = require('node:assert/strict');

const API = process.env.API_URL || 'http://localhost:8080/api';
const stamp = Date.now();

async function call(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

const step = async (name, fn) => {
  await fn();
  console.log(`  ✔ ${name}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`Smoke test against ${API}`);
  let owner;
  let seeker;
  let property;
  let booking;

  await step('owner registers', async () => {
    const r = await call('POST', '/auth/register', { name: 'Smoke Owner', email: `o${stamp}@t.dev`, password: 'password123', role: 'owner' });
    assert.equal(r.status, 201);
    owner = r.body.token;
  });

  await step('seeker registers', async () => {
    const r = await call('POST', '/auth/register', { name: 'Smoke Seeker', email: `s${stamp}@t.dev`, password: 'password123' });
    assert.equal(r.status, 201);
    seeker = r.body.token;
  });

  await step('owner posts an apartment for rent', async () => {
    const r = await call('POST', '/properties', {
      title: `Smoke flat ${stamp}`, description: 'A flat created by the smoke test, please ignore.', type: 'apartment',
      purpose: 'rent', rentPeriod: 'month', price: 999, city: 'Smoketown', address: '1 Test St', bedrooms: 1,
    }, owner);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    property = r.body.property;
  });

  await step('seeker cannot post a listing', async () => {
    const r = await call('POST', '/properties', {}, seeker);
    assert.equal(r.status, 403);
  });

  await step('guest finds it in search', async () => {
    const r = await call('GET', '/properties?city=smoketown&purpose=rent');
    assert.equal(r.status, 200);
    assert.ok(r.body.items.some((p) => p.id === property.id));
  });

  await step('seeker sends a rent request', async () => {
    const r = await call('POST', '/bookings', { propertyId: property.id, kind: 'rent_request', message: 'Can I move in next month?' }, seeker);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    booking = r.body.booking;
  });

  await step('owner sees it and accepts', async () => {
    const inc = await call('GET', '/bookings/incoming', null, owner);
    assert.ok(inc.body.items.some((b) => b.id === booking.id));
    const r = await call('PATCH', `/bookings/${booking.id}/status`, { status: 'accepted' }, owner);
    assert.equal(r.status, 200, JSON.stringify(r.body));
  });

  await step('listing is now rented and hidden from search', async () => {
    const r = await call('GET', `/properties/${property.id}`);
    assert.equal(r.body.property.status, 'rented');
    const s = await call('GET', '/properties?city=smoketown');
    assert.ok(!s.body.items.some((p) => p.id === property.id));
  });

  await step('both users got notifications', async () => {
    await wait(300); // events are async
    const o = await call('GET', '/notifications', null, owner);
    const s = await call('GET', '/notifications', null, seeker);
    assert.ok(o.body.items.some((n) => n.message.includes('rental request')), JSON.stringify(o.body));
    assert.ok(s.body.items.some((n) => n.message.includes('accepted')), JSON.stringify(s.body));
  });

  console.log('All smoke checks passed ✅');
})().catch((err) => {
  console.error('✘ Smoke test failed:', err.message);
  process.exit(1);
});
