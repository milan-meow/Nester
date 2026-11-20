const { randomUUID } = require('node:crypto');

/**
 * Both repositories expose the same async API so services don't care which one they get:
 *   create(doc) findById(id) findOne(filter) find(filter, {sort, skip, limit})
 *   count(filter) updateById(id, patch) deleteById(id) clear()
 *
 * Filters support: equality, { $gte, $lte, $in, $ne }, and { $regex, $options: 'i' }.
 */

function matchValue(actual, cond) {
  if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
    if ('$gte' in cond && !(actual >= cond.$gte)) return false;
    if ('$lte' in cond && !(actual <= cond.$lte)) return false;
    if ('$in' in cond && !cond.$in.includes(actual)) return false;
    if ('$ne' in cond && actual === cond.$ne) return false;
    if ('$regex' in cond) {
      const re = new RegExp(cond.$regex, cond.$options || '');
      if (typeof actual !== 'string' || !re.test(actual)) return false;
    }
    return true;
  }
  return actual === cond;
}

const matches = (doc, filter = {}) =>
  Object.entries(filter).every(([key, cond]) => matchValue(doc[key], cond));

class MemoryRepository {
  constructor() {
    this.items = new Map();
  }

  async create(doc) {
    const now = new Date().toISOString();
    const item = { ...doc, id: randomUUID(), createdAt: now, updatedAt: now };
    this.items.set(item.id, item);
    return { ...item };
  }

  async findById(id) {
    const item = this.items.get(id);
    return item ? { ...item } : null;
  }

  async findOne(filter) {
    for (const item of this.items.values()) if (matches(item, filter)) return { ...item };
    return null;
  }

  async find(filter = {}, { sort = { createdAt: -1 }, skip = 0, limit = 1000 } = {}) {
    const [[sortKey, dir]] = Object.entries(sort);
    return [...this.items.values()]
      .filter((i) => matches(i, filter))
      .sort((a, b) => (a[sortKey] > b[sortKey] ? dir : a[sortKey] < b[sortKey] ? -dir : 0))
      .slice(skip, skip + limit)
      .map((i) => ({ ...i }));
  }

  async count(filter = {}) {
    let n = 0;
    for (const item of this.items.values()) if (matches(item, filter)) n += 1;
    return n;
  }

  async updateById(id, patch) {
    const item = this.items.get(id);
    if (!item) return null;
    const updated = { ...item, ...patch, id, updatedAt: new Date().toISOString() };
    this.items.set(id, updated);
    return { ...updated };
  }

  async updateMany(filter, patch) {
    let n = 0;
    for (const [id, item] of this.items) {
      if (matches(item, filter)) {
        this.items.set(id, { ...item, ...patch, updatedAt: new Date().toISOString() });
        n += 1;
      }
    }
    return n;
  }

  async deleteById(id) {
    return this.items.delete(id);
  }

  async clear() {
    this.items.clear();
  }
}

class MongoRepository {
  /** @param {import('mongoose').Connection} connection */
  constructor(connection, collectionName, indexes = []) {
    const mongoose = require('mongoose');
    const schema = new mongoose.Schema(
      { id: { type: String, unique: true, index: true } },
      { strict: false, versionKey: false, collection: collectionName },
    );
    indexes.forEach(([fields, opts]) => schema.index(fields, opts));
    this.model = connection.models[collectionName] || connection.model(collectionName, schema);
  }

  static clean(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest;
  }

  async create(doc) {
    const now = new Date().toISOString();
    const created = await this.model.create({ ...doc, id: randomUUID(), createdAt: now, updatedAt: now });
    return MongoRepository.clean(created.toObject());
  }

  async findById(id) {
    return MongoRepository.clean(await this.model.findOne({ id }).lean());
  }

  async findOne(filter) {
    return MongoRepository.clean(await this.model.findOne(filter).lean());
  }

  async find(filter = {}, { sort = { createdAt: -1 }, skip = 0, limit = 1000 } = {}) {
    const docs = await this.model.find(filter).sort(sort).skip(skip).limit(limit).lean();
    return docs.map(MongoRepository.clean);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async updateById(id, patch) {
    const { id: _ignored, ...safe } = patch;
    const doc = await this.model
      .findOneAndUpdate({ id }, { $set: { ...safe, updatedAt: new Date().toISOString() } }, { new: true })
      .lean();
    return MongoRepository.clean(doc);
  }

  async updateMany(filter, patch) {
    const res = await this.model.updateMany(filter, { $set: { ...patch, updatedAt: new Date().toISOString() } });
    return res.modifiedCount;
  }

  async deleteById(id) {
    const res = await this.model.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async clear() {
    await this.model.deleteMany({});
  }
}

/** Connects to MongoDB when a URL is given; otherwise falls back to memory (local dev). */
async function connectDatabase(mongoUrl, dbName) {
  if (!mongoUrl) return null;
  const mongoose = require('mongoose');
  const conn = mongoose.createConnection(mongoUrl, { dbName });
  await conn.asPromise();
  return conn;
}

function makeRepository(connection, collectionName, indexes) {
  return connection ? new MongoRepository(connection, collectionName, indexes) : new MemoryRepository();
}

module.exports = { MemoryRepository, MongoRepository, connectDatabase, makeRepository, matches };
