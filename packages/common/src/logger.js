function createLogger(service) {
  const log = (level) => (msg, extra = {}) => {
    if (process.env.NODE_ENV === 'test') return;
    console.log(JSON.stringify({ time: new Date().toISOString(), level, service, msg, ...extra }));
  };
  return { info: log('info'), warn: log('warn'), error: log('error') };
}

/** Express middleware: one JSON log line per request. */
function requestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info('request', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
        requestId: req.headers['x-request-id'],
      });
    });
    next();
  };
}

module.exports = { createLogger, requestLogger };
