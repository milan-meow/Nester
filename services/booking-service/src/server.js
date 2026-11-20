const { env, envInt, connectDatabase, makeRepository, sharedBus, createLogger } = require('@nestar/common');
const { createApp } = require('./app');
const { createPropertyClient } = require('./propertyClient');

const logger = createLogger('booking-service');

async function start() {
  const port = envInt('PORT', 4003);
  const conn = await connectDatabase(env('MONGO_URL', ''), 'nestar_booking');
  const bookings = makeRepository(conn, 'bookings', [
    [{ requesterId: 1 }],
    [{ ownerId: 1, status: 1 }],
    [{ propertyId: 1, status: 1 }],
  ]);

  const app = createApp({
    bookings,
    bus: sharedBus(env('REDIS_URL', '')),
    jwtSecret: env('JWT_SECRET', 'dev-only-secret'),
    propertyClient: createPropertyClient({
      baseUrl: env('PROPERTY_SERVICE_URL', 'http://localhost:4002'),
      internalKey: env('INTERNAL_API_KEY', 'dev-internal-key'),
    }),
  });

  return app.listen(port, () => logger.info(`listening on :${port}`, { db: conn ? 'mongo' : 'memory' }));
}

if (require.main === module) {
  start().catch((err) => {
    logger.error('failed to start', { error: err.message });
    process.exit(1);
  });
}

module.exports = { start };
