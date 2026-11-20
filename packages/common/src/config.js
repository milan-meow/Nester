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

module.exports = { env, envInt };
