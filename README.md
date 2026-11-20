# 🏡 Nestar

**Buy, sell or rent houses, apartments and shops — built as a microservices platform.**

Nestar connects property **owners** (sellers, landlords, agents) with **seekers** (buyers, tenants). Owners post listings; seekers search, save, and send purchase offers, rental requests or viewing requests; owners accept or reject; everybody gets notified.

```
Browser ──► React app (5173) ──► API Gateway (8080) ──┬─► auth-service         (4001)  MongoDB: nestar_auth
                                                       ├─► property-service     (4002)  MongoDB: nestar_property
                                                       ├─► booking-service      (4003)  MongoDB: nestar_booking
                                                       └─► notification-service (4004)  MongoDB: nestar_notification
                                     services publish/subscribe domain events on Redis ▲
```

## Quick start

```bash
# Option A – everything in Docker
cp .env.example .env
docker compose up --build
# open http://localhost:5173

# Option B – local dev, no Docker (in-memory databases + in-memory event bus)
npm install
npm run dev            # starts all 5 backend processes
npm run dev -w frontend
```

## Run the tests

```bash
npm test               # unit + integration tests for every service
```

## Documentation

| Doc | What's inside |
|---|---|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phase-by-phase plan from idea to launch |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, service boundaries, events, data model |
| [docs/USE_CASES.md](docs/USE_CASES.md) | Actors, use-case diagram, main flows |
| [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) | Why every folder is where it is |
| [docs/API.md](docs/API.md) | Every endpoint, through the gateway |
| [docs/TESTING.md](docs/TESTING.md) | Test strategy and how to run it |
| [docs/CODE_REVIEW.md](docs/CODE_REVIEW.md) | Mistakes we found and how we fixed them |
| [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) | Branching, commits, pushing to GitHub |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |

## Tech stack

Node.js 20+ · Express · MongoDB (Mongoose) · Redis pub/sub · JWT · React 18 + Vite · Jest + Supertest · Docker Compose · GitHub Actions

## License

MIT
