const { env, envInt, secret, connectDatabase, makeRepository, sharedBus, createLogger } = require('@nestar/common');
const { createApp } = require('./app');
const { registerSubscribers } = require('./subscribers');

const logger = createLogger('notification-service');

async function start() {
  const port = envInt('PORT', 4004);
  const conn = await connectDatabase(env('MONGO_URL', ''), 'nestar_notification');
  const notifications = makeRepository(conn, 'notifications', [[{ userId: 1, read: 1, createdAt: -1 }]]);

  await registerSubscribers(sharedBus(env('REDIS_URL', '')), notifications);
  const app = createApp({ notifications, jwtSecret: secret('JWT_SECRET') });

  return app.listen(port, () => logger.info(`listening on :${port}`, { db: conn ? 'mongo' : 'memory' }));
}

if (require.main === module) {
  start().catch((err) => {
    logger.error('failed to start', { error: err.message });
    process.exit(1);
  });
}

module.exports = { start };
