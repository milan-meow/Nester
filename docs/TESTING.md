# Nestar — Testing

## The test pyramid we use

```
            ▲   E2E smoke (scripts/smoke.js) — 9 steps through the real gateway
           ▲▲▲  Integration (Supertest) — each service's HTTP API with in-memory DB + bus
         ▲▲▲▲▲▲ Unit — pure rules (booking rules, validator, repositories, JWT, message builders)
```

| Layer | Tool | Where | Speed |
|---|---|---|---|
| Unit | Jest | `packages/common/tests`, `services/booking-service/tests/rules.test.js`, builders in notification tests | ms |
| Integration | Jest + Supertest | `services/*/tests/*.test.js` | ~1 s per service |
| Contract-ish | Gateway tests with echo upstreams | `services/api-gateway/tests` | ~1 s |
| End-to-end | Node script | `scripts/smoke.js` | ~1 s |
| Manual / UI | Browser + Playwright screenshots | – | – |

**Why in-memory?** `createApp()` takes its dependencies (repository, event bus, property client) as arguments. Tests pass `MemoryRepository` / `MemoryEventBus` / a fake property client, so no MongoDB, Redis or network is needed and tests run in a second. `MongoRepository` and `RedisEventBus` implement the same methods.

## Run

```bash
npm test                         # all services
npm test -w services/booking-service
cd services/booking-service && npx jest --watch

npm run dev & npm run smoke      # end-to-end through the gateway
```

## Current results

| Package | Tests | Line coverage* |
|---|---|---|
| @nestar/common | 9 | – |
| api-gateway | 10 | 100% |
| auth-service | 12 | 100% |
| property-service | 19 | 100% |
| booking-service | 25 | 89% |
| notification-service | 6 | 98% |
| **Total** | **81** + 9-step smoke test | |

\* `src/` excluding `server.js` (the infrastructure wiring). Booking's uncovered lines are the real HTTP `propertyClient`, which the smoke test covers.

## What we test, specifically

- **Security:** password hash never returned · admin can't be self-assigned · same 401 message for wrong email / wrong password · spoofed `x-user-*` and `x-internal-key` headers stripped by the gateway · `/internal` not reachable from outside · users can't read others' bookings/notifications · mass-assignment (`ownerId`, `status`) ignored on create · regex characters in search treated literally (ReDoS) · production refuses default secrets.
- **Business rules:** every booking rule in `rules.js` · status transitions · property becomes sold/rented · rivals auto-rejected · pending requests closed when a listing is deleted or closed.
- **Resilience:** property-service down → `503` and booking stays pending · upstream down → gateway `502` JSON · malformed JSON → `400`.
- **Concurrency:** two simultaneous accepts on the same listing → exactly one `200`, one `409`.

## Writing a new test

Bug fix? Write the failing test first, see it fail, then fix. See [CODE_REVIEW.md](CODE_REVIEW.md) for examples.
