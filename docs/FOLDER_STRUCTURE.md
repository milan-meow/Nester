# Nestar — Folder Structure

One **monorepo** (npm workspaces). Every service is independent — its own `package.json`, `Dockerfile`, tests and database — but they share one repo so a single pull request can change an API and its caller together.

```
nestar/
├── .github/
│   ├── workflows/ci.yml          # run tests on every push & PR
│   └── pull_request_template.md
├── docs/                         # planning & design — read these first
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── USE_CASES.md
│   ├── FOLDER_STRUCTURE.md
│   ├── API.md
│   ├── TESTING.md
│   ├── CODE_REVIEW.md
│   ├── GIT_WORKFLOW.md
│   └── diagrams/                 # PlantUML + Mermaid sources
│
├── packages/
│   └── common/                   # @nestar/common – shared, no business logic
│       └── src/
│           ├── config.js         # env helpers
│           ├── errors.js         # AppError + error middleware
│           ├── auth.js           # JWT sign/verify, requireAuth, requireRole
│           ├── validate.js       # tiny schema validator
│           ├── repository.js     # MemoryRepository + MongoRepository (same API)
│           ├── eventBus.js       # MemoryEventBus + RedisEventBus (same API)
│           └── logger.js
│
├── services/
│   ├── api-gateway/
│   │   ├── src/{app.js, server.js}
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── app.js            # builds the Express app (used by tests)
│   │   │   ├── server.js         # wires real DB + bus, starts listening
│   │   │   ├── routes.js         # HTTP layer only
│   │   │   ├── service.js        # business rules (testable without HTTP)
│   │   │   └── schemas.js        # input validation
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── property-service/         # same layout
│   ├── booking-service/          # same layout + propertyClient.js
│   └── notification-service/     # same layout + subscribers.js
│
├── frontend/                     # React + Vite
│   ├── src/
│   │   ├── api.js                # one place that talks to the gateway
│   │   ├── auth.jsx              # login state (context)
│   │   ├── components/           # Navbar, PropertyCard, Filters...
│   │   ├── pages/                # Home, PropertyDetail, Login, Register, NewProperty, Dashboard
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── Dockerfile
│   └── vite.config.js
│
├── scripts/
│   ├── dev.js                    # start all services locally in one terminal
│   └── seed.js                   # demo users + listings
├── docker-compose.yml
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
├── package.json                  # workspaces + root scripts
└── README.md
```

## Rules we follow

1. **`app.js` vs `server.js`.** `app.js` exports `createApp(deps)` and never opens ports or DB connections. Tests call `createApp` with in-memory fakes. `server.js` is the only file that touches real infrastructure.
2. **`routes.js` is thin.** Parse request → call `service.js` → send response. Business rules live in `service.js`, so they're testable without HTTP.
3. **Nothing service-specific in `packages/common`.** If only one service uses it, it lives in that service.
4. **No cross-service imports.** `booking-service` never `require`s `property-service`. It calls it over HTTP.
5. **Tests sit next to the service** in `tests/`, named `*.test.js`.
