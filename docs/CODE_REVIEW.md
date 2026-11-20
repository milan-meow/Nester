# Nestar — Code Review: Mistakes Found & Fixed

After the first version of every service was working and green, we did a deliberate review pass: read each service against the use cases, ran the stack end-to-end, clicked through the UI, and asked *"what would break in real life?"*. Each problem below got a test that **failed first**, then a fix. Commit hashes are in `git log`.

| # | Severity | Where | Mistake | Fix | Commit |
|---|---|---|---|---|---|
| 1 | 🔴 High | booking-service | **Double booking race.** Accepting a request read the property status, then wrote it in a second call. Two "Accept" clicks in parallel both saw `available` and both succeeded — two tenants for one flat. | property-service got an atomic compare-and-set (`expectedStatus`); booking-service uses it. A test with simulated network latency reproduces the race. | `fix(booking): prevent two requests…` |
| 2 | 🔴 High | api-gateway | **One user could rate-limit everyone.** Behind nginx, every request arrives from nginx's IP, so all users shared a single rate-limit bucket. | `trust proxy` for private-network proxies (configurable with `TRUST_PROXY`). Test sends different `X-Forwarded-For` IPs. | `fix(gateway): rate-limit by real client IP…` |
| 3 | 🟠 Medium | booking-service | **Orphaned requests.** Deleting a listing, or the owner marking it sold themselves, left requests "pending" forever. | booking-service subscribes to `property.deleted` / `property.updated` and rejects pending requests with a reason. Event-driven, no coupling. | `fix(booking): close pending requests…` |
| 4 | 🟠 Medium | all services | **Default secrets in production.** `JWT_SECRET` fell back to `dev-only-secret`; forgetting to set it would let anyone forge tokens. | `secret()` helper: with `NODE_ENV=production`, missing / default / short (< 32 chars) secrets stop the service at startup. | `fix(security): refuse to start…` |
| 5 | 🟡 Low | docker-compose | **Healthcheck never passed.** `["CMD", "wget", ".../$PORT/health"]` — exec form doesn't expand `$PORT`. | Switched to `CMD-SHELL`. Caught by reading `docker compose config` output. | `build: add Docker…` |
| 6 | 🟡 Low | frontend | Area showed as **"60 M²"** — the whole line had `text-transform: capitalize`. | Capitalize only the type word. | `fix(frontend): …` |
| 7 | 🟡 Low | frontend | **Shops saved `bedrooms: 1`.** The field is hidden for shops but its default was still submitted. | Force `bedrooms = 0` for shops. | `fix(frontend): …` |
| 8 | 🟡 Low | frontend | Broken / blocked image URLs left a **flat grey box**. | Branded gradient layered under every photo. | `fix(frontend): …` |
| 9 | 🟡 Low | root | `npm run lint` called ESLint, which was **never installed** → command failed. | Removed until linting is properly set up (tracked as a next step). | `fix(chore): remove lint/format…` |
| 10 | ⚪ Info | tests | Coverage looked like ~30–60% because it counted shared-library code (Mongo/Redis adapters) in every service. | `collectCoverageFrom: src/**, !server.js` → real numbers 89–100%. | `test: …` |

## Things we checked and were already right

- Password hash is stripped from every response (`publicUser`).
- Users cannot give themselves `admin` (`role` enum is `seeker|owner` only).
- Login returns the **same** message for unknown email and wrong password.
- Clients can't set `ownerId`, `status` or `id` — the validator drops unknown keys and the service sets them.
- Search text is regex-escaped (no ReDoS via `?q=(a+)+$`).
- Gateway strips spoofed `x-user-*` and `x-internal-key` headers.
- `/properties/mine` is declared before `/properties/:id` (otherwise "mine" is treated as an id).
- No `express.json()` in the gateway (it would consume the body before proxying).

## Known limitations (accepted for v1)

- `ownerName` / `requesterName` are copied at creation time; renaming your account doesn't update old listings.
- Events are fire-and-forget over Redis pub/sub: if notification-service is down, those notifications are lost. v2: Redis Streams or RabbitMQ with durable queues + an outbox table.
- `http-proxy` (used by `http-proxy-middleware`) prints a Node `util._extend` deprecation warning. Harmless; goes away when upstream updates.
- Images are URLs; there's no upload service yet.
