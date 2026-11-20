const http = require('node:http');
const express = require('express');
const request = require('supertest');
const { signToken } = require('@nestar/common');
const { createApp } = require('../src/app');

const SECRET = 'test-secret';

/** A fake upstream that echoes back what it received. */
function echoServer(name) {
  const app = express();
  app.use(express.json());
  app.all('*', (req, res) => {
    res.json({ service: name, method: req.method, path: req.originalUrl, body: req.body, headers: req.headers });
  });
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => resolve(server));
  });
}

let servers;
let app;

beforeAll(async () => {
  servers = await Promise.all(['auth', 'properties', 'bookings', 'notifications'].map(echoServer));
  const url = (s) => `http://127.0.0.1:${s.address().port}`;
  app = createApp({
    jwtSecret: SECRET,
    routes: {
      auth: url(servers[0]),
      properties: url(servers[1]),
      bookings: url(servers[2]),
      notifications: 'http://127.0.0.1:1', // nothing listens here → 502
    },
  });
});

afterAll(() => Promise.all(servers.map((s) => new Promise((r) => s.close(r)))));

test('health', async () => {
  await request(app).get('/health').expect(200, { status: 'ok', service: 'api-gateway' });
});

test('routes by prefix and strips /api', async () => {
  const res = await request(app).get('/api/properties?city=Seoul').expect(200);
  expect(res.body).toMatchObject({ service: 'properties', path: '/properties?city=Seoul' });
  const b = await request(app).get('/api/bookings/mine').expect(200);
  expect(b.body.path).toBe('/bookings/mine');
});

test('forwards JSON bodies intact', async () => {
  const res = await request(app).post('/api/auth/register').send({ name: 'Ann', email: 'a@b.co' }).expect(200);
  expect(res.body).toMatchObject({ service: 'auth', method: 'POST', body: { name: 'Ann', email: 'a@b.co' } });
});

test('valid token → identity headers; spoofed headers are stripped', async () => {
  const token = signToken({ id: 'u1', role: 'owner', name: 'Ann Kim' }, SECRET);
  const res = await request(app)
    .get('/api/properties/mine')
    .set('Authorization', `Bearer ${token}`)
    .set('x-user-role', 'admin')
    .set('x-internal-key', 'guess')
    .expect(200);
  expect(res.body.headers['x-user-id']).toBe('u1');
  expect(res.body.headers['x-user-role']).toBe('owner');
  expect(decodeURIComponent(res.body.headers['x-user-name'])).toBe('Ann Kim');
  expect(res.body.headers['x-internal-key']).toBeUndefined();
});

test('anonymous request cannot inject identity headers', async () => {
  const res = await request(app).get('/api/properties').set('x-user-id', 'admin-1').expect(200);
  expect(res.body.headers['x-user-id']).toBeUndefined();
});

test('invalid token is rejected at the edge', async () => {
  await request(app).get('/api/bookings/mine').set('Authorization', 'Bearer nope').expect(401);
});

test('adds x-request-id', async () => {
  const res = await request(app).get('/api/properties').expect(200);
  expect(res.headers['x-request-id']).toEqual(expect.any(String));
  expect(res.body.headers['x-request-id']).toBe(res.headers['x-request-id']);
});

test('internal routes are not exposed', async () => {
  await request(app).get('/api/internal/properties/1').expect(404);
  await request(app).get('/internal/properties/1').expect(404);
});

test('upstream down → 502 JSON', async () => {
  const res = await request(app).get('/api/notifications').expect(502);
  expect(res.body.error.code).toBe('BAD_GATEWAY');
});

test('rate limit is per real client IP when behind a proxy (nginx)', async () => {
  const limited = createApp({ jwtSecret: SECRET, rateLimitPerMinute: 2, routes: { auth: 'http://127.0.0.1:1', properties: `http://127.0.0.1:${servers[1].address().port}`, bookings: 'http://127.0.0.1:1', notifications: 'http://127.0.0.1:1' } });
  const as = (ip) => request(limited).get('/api/properties').set('X-Forwarded-For', ip);
  await as('1.1.1.1').expect(200);
  await as('1.1.1.1').expect(200);
  await as('1.1.1.1').expect(429);
  await as('2.2.2.2').expect(200); // a different user must not be blocked
});
