const { env, envInt, connectDatabase, makeRepository, sharedBus, createLogger } = require('@nestar/common');
const { createApp } = require('./app');

const logger = createLogger('property-service');

async function start() {
  const port = envInt('PORT', 4002);
  const conn = await connectDatabase(env('MONGO_URL', ''), 'nestar_property');
  const properties = makeRepository(conn, 'properties', [
    [{ status: 1, purpose: 1, type: 1, price: 1 }],
    [{ city: 1 }],
    [{ ownerId: 1 }],
  ]);

  const app = createApp({
    properties,
    bus: sharedBus(env('REDIS_URL', '')),
    jwtSecret: env('JWT_SECRET', 'dev-only-secret'),
    internalKey: env('INTERNAL_API_KEY', 'dev-internal-key'),
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
