const { env, envInt, secret, connectDatabase, makeRepository, sharedBus, createLogger } = require('@nestar/common');
const { createApp } = require('./app');
const { createPropertyClient } = require('./propertyClient');
const { createBookingService } = require('./service');
const { registerSubscribers } = require('./subscribers');

const logger = createLogger('booking-service');

async function start() {
  const port = envInt('PORT', 4003);
  const conn = await connectDatabase(env('MONGO_URL', ''), 'nestar_booking');
  const bookings = makeRepository(conn, 'bookings', [
    [{ requesterId: 1 }],
    [{ ownerId: 1, status: 1 }],
    [{ propertyId: 1, status: 1 }],
  ]);

  const bus = sharedBus(env('REDIS_URL', ''));
  const propertyClient = createPropertyClient({
    baseUrl: env('PROPERTY_SERVICE_URL', 'http://localhost:4002'),
    internalKey: secret('INTERNAL_API_KEY'),
  });
  const service = createBookingService({ bookings, bus, propertyClient });
  await registerSubscribers(bus, service);

  const app = createApp({ service, jwtSecret: secret('JWT_SECRET') });

  return app.listen(port, () => logger.info(`listening on :${port}`, { db: conn ? 'mongo' : 'memory' }));
}

if (require.main === module) {
  start().catch((err) => {
    logger.error('failed to start', { error: err.message });
    process.exit(1);
  });
}

module.exports = { start };
