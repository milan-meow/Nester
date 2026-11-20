const { randomUUID } = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { readBearer, verifyToken, errorHandler, createLogger, requestLogger } = require('@nestar/common');

/**
 * routes: { auth, properties, bookings, notifications } → upstream base URLs.
 * NOTE: no express.json() here — the proxy must stream the raw body to the service.
 */
function createApp({
  routes, jwtSecret, corsOrigin = '*', rateLimitPerMinute = 300, timeoutMs = 10000,
  trustProxy = 'loopback, linklocal, uniquelocal',
}) {
  const app = express();
  // We sit behind nginx / a load balancer. Without this every user shares the proxy's IP,
  // so one busy user would rate-limit everybody. Only private-network proxies are trusted.
  app.set('trust proxy', trustProxy);
  const logger = createLogger('api-gateway');

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(','), credentials: true }));

  // Correlation id so one user action can be traced through every service's logs.
  app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', req.headers['x-request-id']);
    next();
  });
  app.use(requestLogger(logger));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

  const limiter = rateLimit({ windowMs: 60_000, limit: rateLimitPerMinute, standardHeaders: 'draft-7', legacyHeaders: false });
  // Stricter limit on login/register to slow down password guessing.
  const authLimiter = rateLimit({ windowMs: 60_000, limit: Math.max(10, Math.floor(rateLimitPerMinute / 10)), standardHeaders: 'draft-7', legacyHeaders: false });
  app.use('/api', limiter);
  app.use(['/api/auth/login', '/api/auth/register'], authLimiter);

  // Never let clients set identity headers themselves.
  app.use('/api', (req, res, next) => {
    delete req.headers['x-user-id'];
    delete req.headers['x-user-role'];
    delete req.headers['x-user-name'];
    delete req.headers['x-internal-key'];
    const token = readBearer(req);
    if (token) {
      try {
        const p = verifyToken(token, jwtSecret);
        req.headers['x-user-id'] = p.sub;
        req.headers['x-user-role'] = p.role;
        req.headers['x-user-name'] = encodeURIComponent(p.name || '');
      } catch (err) {
        return next(err); // bad/expired token → 401 at the edge
      }
    }
    return next();
  });

  const proxy = (prefix, target) =>
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathFilter: prefix,
      pathRewrite: { '^/api': '' },
      proxyTimeout: timeoutMs,
      timeout: timeoutMs,
      on: {
        error: (err, req, res) => {
          logger.error('upstream error', { target, error: err.code || err.message });
          if (res.headersSent) return res.end();
          res.writeHead(502, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ error: { code: 'BAD_GATEWAY', message: 'Service temporarily unavailable' } }));
        },
      },
    });

  app.use(proxy('/api/auth', routes.auth));
  app.use(proxy('/api/properties', routes.properties));
  app.use(proxy('/api/bookings', routes.bookings));
  app.use(proxy('/api/notifications', routes.notifications));

  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route ${req.method} ${req.path}` } }));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
