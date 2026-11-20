const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('./errors');

function signToken(user, secret, expiresIn = '7d') {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, secret, { expiresIn });
}

function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch {
    throw unauthorized('Invalid or expired token');
  }
}

function readBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * Attaches req.user = { id, role, name } when a valid token is present.
 * `required: false` lets public routes still know who is calling.
 */
function authenticate(secret, { required = true } = {}) {
  return (req, res, next) => {
    const token = readBearer(req);
    if (!token) return required ? next(unauthorized()) : next();
    try {
      const payload = verifyToken(token, secret);
      req.user = { id: payload.sub, role: payload.role, name: payload.name };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden(`Requires role: ${roles.join(' or ')}`));
    return next();
  };
}

/** For service-to-service routes under /internal – shared key, never exposed by the gateway. */
function requireInternalKey(key) {
  return (req, res, next) =>
    req.headers['x-internal-key'] === key ? next() : next(forbidden('Internal route'));
}

module.exports = { signToken, verifyToken, authenticate, requireRole, requireInternalKey, readBearer };
