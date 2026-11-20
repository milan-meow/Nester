function env(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (fallback === undefined) throw new Error(`Missing required env var ${name}`);
    return fallback;
  }
  return value;
}

function envInt(name, fallback) {
  const n = Number.parseInt(env(name, String(fallback)), 10);
  if (Number.isNaN(n)) throw new Error(`Env var ${name} must be an integer`);
  return n;
}

const DEV_DEFAULTS = { JWT_SECRET: 'dev-only-secret', INTERNAL_API_KEY: 'dev-internal-key' };

/**
 * Secrets have convenient defaults for local dev, but in production we refuse to
 * start with a default or short secret — anyone could forge tokens otherwise.
 */
function secret(name) {
  const value = env(name, DEV_DEFAULTS[name]);
  if (process.env.NODE_ENV === 'production' && (value === DEV_DEFAULTS[name] || value.length < 32)) {
    throw new Error(`${name} must be set to a random string of at least 32 characters in production`);
  }
  return value;
}

module.exports = { env, envInt, secret };
