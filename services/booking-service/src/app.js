const express = require('express');
const helmet = require('helmet');
const { errorHandler, notFoundHandler, requestLogger, createLogger } = require('@nestar/common');
const { createBookingService } = require('./service');
const { bookingRoutes } = require('./routes');

function createApp({ bookings, bus, propertyClient, jwtSecret, service: injected }) {
  const app = express();
  const service = injected || createBookingService({ bookings, bus, propertyClient });

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger(createLogger('booking-service')));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'booking-service' }));
  app.use('/bookings', bookingRoutes(service, jwtSecret));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
