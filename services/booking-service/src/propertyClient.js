const { notFound, unavailable } = require('@nestar/common');

/** Talks to property-service's /internal routes. Swap with a fake in tests. */
function createPropertyClient({ baseUrl, internalKey, timeoutMs = 3000 }) {
  async function call(method, path, body) {
    let res;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-internal-key': internalKey },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw unavailable('Property service is not reachable, please try again');
    }
    if (res.status === 404) throw notFound('Property not found');
    if (!res.ok) throw unavailable(`Property service answered ${res.status}`);
    return (await res.json()).property;
  }

  return {
    getProperty: (id) => call('GET', `/internal/properties/${encodeURIComponent(id)}`),
    setStatus: (id, status) => call('PATCH', `/internal/properties/${encodeURIComponent(id)}/status`, { status }),
  };
}

module.exports = { createPropertyClient };
