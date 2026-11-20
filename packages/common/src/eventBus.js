const { EventEmitter } = require('node:events');

/**
 * Domain events: { topic, payload, occurredAt }.
 * Same API for both buses:  publish(topic, payload)  subscribe(topic, handler)  close()
 */

class MemoryEventBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.published = []; // handy for assertions in tests
  }

  async publish(topic, payload) {
    const event = { topic, payload, occurredAt: new Date().toISOString() };
    this.published.push(event);
    // Deliver asynchronously, like a real broker would.
    setImmediate(() => this.emitter.emit(topic, event));
  }

  async subscribe(topic, handler) {
    this.emitter.on(topic, (event) => {
      Promise.resolve(handler(event)).catch((err) => console.error(`[bus] handler for ${topic} failed`, err));
    });
  }

  async close() {
    this.emitter.removeAllListeners();
  }
}

class RedisEventBus {
  constructor(redisUrl) {
    const Redis = require('ioredis');
    this.pub = new Redis(redisUrl);
    this.sub = new Redis(redisUrl);
    this.handlers = new Map();
    this.sub.on('message', (channel, message) => {
      let event;
      try {
        event = JSON.parse(message);
      } catch {
        return console.error('[bus] dropped malformed message on', channel);
      }
      for (const handler of this.handlers.get(channel) || []) {
        Promise.resolve(handler(event)).catch((err) => console.error(`[bus] handler for ${channel} failed`, err));
      }
    });
  }

  async publish(topic, payload) {
    const event = { topic, payload, occurredAt: new Date().toISOString() };
    try {
      await this.pub.publish(`nestar.${topic}`, JSON.stringify(event));
    } catch (err) {
      // Events are fire-and-forget: never fail the user's request because the bus is down.
      console.error('[bus] publish failed', topic, err.message);
    }
  }

  async subscribe(topic, handler) {
    const channel = `nestar.${topic}`;
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      await this.sub.subscribe(channel);
    }
    this.handlers.get(channel).push(handler);
  }

  async close() {
    await Promise.allSettled([this.pub.quit(), this.sub.quit()]);
  }
}

function makeEventBus(redisUrl) {
  return redisUrl ? new RedisEventBus(redisUrl) : new MemoryEventBus();
}

/** Shared bus for when all services run in ONE process (scripts/dev.js). */
let sharedMemoryBus;
function sharedBus(redisUrl) {
  if (redisUrl) return new RedisEventBus(redisUrl);
  sharedMemoryBus = sharedMemoryBus || new MemoryEventBus();
  return sharedMemoryBus;
}

const Topics = Object.freeze({
  USER_REGISTERED: 'user.registered',
  PROPERTY_CREATED: 'property.created',
  PROPERTY_UPDATED: 'property.updated',
  PROPERTY_DELETED: 'property.deleted',
  BOOKING_CREATED: 'booking.created',
  BOOKING_STATUS_CHANGED: 'booking.status_changed',
});

module.exports = { MemoryEventBus, RedisEventBus, makeEventBus, sharedBus, Topics };
