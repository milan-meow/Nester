const { env, envInt, secret, connectDatabase, makeRepository, sharedBus, createLogger } = require('@nestar/common');
const { createApp } = require('./app');

const logger = createLogger('auth-service');

async function start() {
  const port = envInt('PORT', 4001);
  const mongoUrl = env('MONGO_URL', '');
  const conn = await connectDatabase(mongoUrl, 'nestar_auth');
  const users = makeRepository(conn, 'users', [[{ email: 1 }, { unique: true }]]);
  const bus = sharedBus(env('REDIS_URL', ''));

  const app = createApp({
    users,
    bus,
    jwtSecret: secret('JWT_SECRET'),
    jwtExpiresIn: env('JWT_EXPIRES_IN', '7d'),
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
