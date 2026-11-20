const express = require('express');
const helmet = require('helmet');
const { errorHandler, notFoundHandler, requestLogger, createLogger } = require('@nestar/common');
const { createAuthService } = require('./service');
const { authRoutes } = require('./routes');

function createApp({ users, bus, jwtSecret, jwtExpiresIn, bcryptRounds }) {
  const app = express();
  const service = createAuthService({ users, bus, jwtSecret, jwtExpiresIn, bcryptRounds });

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger(createLogger('auth-service')));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));
  app.use('/auth', authRoutes(service, jwtSecret));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
