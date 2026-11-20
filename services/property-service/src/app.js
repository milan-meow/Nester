const express = require('express');
const helmet = require('helmet');
const { errorHandler, notFoundHandler, requestLogger, createLogger } = require('@nestar/common');
const { createPropertyService } = require('./service');
const { propertyRoutes, internalRoutes } = require('./routes');

function createApp({ properties, bus, jwtSecret, internalKey }) {
  const app = express();
  const service = createPropertyService({ properties, bus });

  app.use(helmet());
  app.use(express.json({ limit: '200kb' }));
  app.use(requestLogger(createLogger('property-service')));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'property-service' }));
  app.use('/properties', propertyRoutes(service, jwtSecret));
  app.use('/internal', internalRoutes(service, internalKey));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
