const { env, envInt, createLogger } = require('@nestar/common');
const { createApp } = require('./app');

const logger = createLogger('api-gateway');

function start() {
  const port = envInt('PORT', envInt('GATEWAY_PORT', 8080));
  const app = createApp({
    jwtSecret: env('JWT_SECRET', 'dev-only-secret'),
    corsOrigin: env('CORS_ORIGIN', 'http://localhost:5173'),
    rateLimitPerMinute: envInt('RATE_LIMIT_PER_MINUTE', 300),
    routes: {
      auth: env('AUTH_SERVICE_URL', 'http://localhost:4001'),
      properties: env('PROPERTY_SERVICE_URL', 'http://localhost:4002'),
      bookings: env('BOOKING_SERVICE_URL', 'http://localhost:4003'),
      notifications: env('NOTIFICATION_SERVICE_URL', 'http://localhost:4004'),
    },
  });
  return app.listen(port, () => logger.info(`listening on :${port}`));
}

if (require.main === module) start();

module.exports = { start };
