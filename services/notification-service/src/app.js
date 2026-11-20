const express = require('express');
const helmet = require('helmet');
const { errorHandler, notFoundHandler, requestLogger, createLogger } = require('@nestar/common');
const { notificationRoutes } = require('./routes');

function createApp({ notifications, jwtSecret }) {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '50kb' }));
  app.use(requestLogger(createLogger('notification-service')));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));
  app.use('/notifications', notificationRoutes(notifications, jwtSecret));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
