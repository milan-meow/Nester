const { validate, MemoryRepository, MemoryEventBus, signToken, verifyToken, AppError } = require('../src');

describe('validate', () => {
  const schema = {
    name: { type: 'string', required: true, min: 2 },
    price: { type: 'number', min: 0 },
    kind: { type: 'string', enum: ['a', 'b'], default: 'a' },
  };

  test('keeps known keys, trims strings, applies defaults, drops unknown keys', () => {
    const out = validate(schema, { name: '  Bob  ', price: '10', role: 'admin' });
    expect(out).toEqual({ name: 'Bob', price: 10, kind: 'a' });
  });

  test('collects every error', () => {
    expect.assertions(2);
    try {
      validate(schema, { price: -1, kind: 'z' });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.details.map((d) => d.field).sort()).toEqual(['kind', 'name', 'price']);
    }
  });

  test('partial mode skips required checks and defaults', () => {
    expect(validate(schema, { price: 5 }, { partial: true })).toEqual({ price: 5 });
  });
});

describe('MemoryRepository', () => {
  test('create / find with operators / update / delete', async () => {
    const repo = new MemoryRepository();
    const a = await repo.create({ city: 'Seoul', price: 100 });
    await repo.create({ city: 'Busan', price: 300 });
    expect(a.id).toBeDefined();
    expect(await repo.count({ price: { $gte: 200 } })).toBe(1);
    expect(await repo.find({ city: { $regex: 'seo', $options: 'i' } })).toHaveLength(1);
    const updated = await repo.updateById(a.id, { price: 150, id: 'hacked' });
    expect(updated).toMatchObject({ id: a.id, price: 150 });
    expect(await repo.deleteById(a.id)).toBe(true);
    expect(await repo.findById(a.id)).toBeNull();
  });

  test('returned objects are copies (callers cannot mutate the store)', async () => {
    const repo = new MemoryRepository();
    const a = await repo.create({ n: 1 });
    a.n = 99;
    expect((await repo.findById(a.id)).n).toBe(1);
  });
});

describe('MemoryEventBus', () => {
  test('delivers published events to subscribers', async () => {
    const bus = new MemoryEventBus();
    const got = new Promise((resolve) => bus.subscribe('x.y', resolve));
    await bus.publish('x.y', { hello: 'world' });
    await expect(got).resolves.toMatchObject({ topic: 'x.y', payload: { hello: 'world' } });
  });
});

describe('JWT helpers', () => {
  test('round-trips and rejects bad tokens', () => {
    const token = signToken({ id: 'u1', role: 'owner', name: 'Ann' }, 's3cret');
    expect(verifyToken(token, 's3cret')).toMatchObject({ sub: 'u1', role: 'owner' });
    expect(() => verifyToken(token, 'wrong')).toThrow(AppError);
  });
});

describe('secret()', () => {
  const { secret } = require('../src');
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  test('dev default is fine outside production', () => {
    delete process.env.JWT_SECRET;
    expect(secret('JWT_SECRET')).toBe('dev-only-secret');
  });

  test('production refuses default or short secrets', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => secret('JWT_SECRET')).toThrow(/at least 32/);
    process.env.JWT_SECRET = 'short';
    expect(() => secret('JWT_SECRET')).toThrow();
    process.env.JWT_SECRET = 'x'.repeat(40);
    expect(secret('JWT_SECRET')).toHaveLength(40);
  });
});
