const request = require('supertest');
const { MemoryRepository, MemoryEventBus } = require('@nestar/common');
const { createApp } = require('../src/app');

const SECRET = 'test-secret';
let app;
let bus;

beforeEach(() => {
  bus = new MemoryEventBus();
  app = createApp({ users: new MemoryRepository(), bus, jwtSecret: SECRET, bcryptRounds: 4 });
});

const register = (body) => request(app).post('/auth/register').send(body);
const ann = { name: 'Ann Kim', email: 'Ann@Example.com', password: 'password123', role: 'owner' };

describe('POST /auth/register', () => {
  test('creates a user, returns a token, never returns the password hash', async () => {
    const res = await register(ann).expect(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Ann Kim', email: 'ann@example.com', role: 'owner' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  test('publishes user.registered', async () => {
    await register(ann).expect(201);
    expect(bus.published.map((e) => e.topic)).toContain('user.registered');
  });

  test('defaults role to seeker', async () => {
    const res = await register({ ...ann, role: undefined }).expect(201);
    expect(res.body.user.role).toBe('seeker');
  });

  test('refuses self-assigned admin role', async () => {
    const res = await register({ ...ann, role: 'admin' }).expect(400);
    expect(res.body.error.details[0].field).toBe('role');
  });

  test('rejects duplicate email case-insensitively', async () => {
    await register(ann).expect(201);
    await register({ ...ann, email: 'ann@example.com' }).expect(409);
  });

  test('validates input', async () => {
    const res = await register({ name: 'A', email: 'nope', password: 'short' }).expect(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => register(ann));

  test('works with correct credentials', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'ann@example.com', password: 'password123' }).expect(200);
    expect(res.body.token).toBeDefined();
  });

  test('same 401 for wrong password and unknown email', async () => {
    const a = await request(app).post('/auth/login').send({ email: 'ann@example.com', password: 'wrongpass1' }).expect(401);
    const b = await request(app).post('/auth/login').send({ email: 'ghost@example.com', password: 'whatever1' }).expect(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });
});

describe('/auth/me', () => {
  test('requires a token', async () => {
    await request(app).get('/auth/me').expect(401);
    await request(app).get('/auth/me').set('Authorization', 'Bearer garbage').expect(401);
  });

  test('returns and updates the current user', async () => {
    const { body } = await register({ ...ann, role: 'seeker' });
    const auth = { Authorization: `Bearer ${body.token}` };
    const me = await request(app).get('/auth/me').set(auth).expect(200);
    expect(me.body.user.email).toBe('ann@example.com');

    const upd = await request(app).patch('/auth/me').set(auth).send({ role: 'owner', email: 'x@y.z' }).expect(200);
    expect(upd.body.user.role).toBe('owner');
    expect(upd.body.user.email).toBe('ann@example.com'); // email not editable here
    expect(upd.body.token).not.toBe(body.token);
  });
});

test('GET /auth/users/:id exposes only a public profile', async () => {
  const { body } = await register(ann);
  const res = await request(app).get(`/auth/users/${body.user.id}`).expect(200);
  expect(res.body.user).toEqual({ id: body.user.id, name: 'Ann Kim', role: 'owner', createdAt: expect.any(String) });
});

test('malformed JSON gives 400, not 500', async () => {
  await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{bad').expect(400);
});
