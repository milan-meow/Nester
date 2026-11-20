#!/usr/bin/env node
/**
 * Starts every backend service in ONE Node process for local development.
 * With no MONGO_URL/REDIS_URL set, services use in-memory stores and share one
 * in-memory event bus, so you can try the whole platform with zero setup.
 */
const services = [
  ['auth-service', 4001],
  ['property-service', 4002],
  ['booking-service', 4003],
  ['notification-service', 4004],
  ['api-gateway', 8080],
];

(async () => {
  for (const [name, port] of services) {
    process.env.PORT = String(port); // read synchronously by each start()
    const { start } = require(`../services/${name}/src/server.js`);
    await start();
  }
  console.log('\n🏡 Nestar backend ready → http://localhost:8080/api  (Ctrl+C to stop)\n');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
