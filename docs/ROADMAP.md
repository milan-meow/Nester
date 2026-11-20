# Nestar — Project Roadmap

A realistic plan for a small team (2–4 developers) over about **12 weeks**. Each phase ends with something you can demo.

```mermaid
gantt
    title Nestar roadmap
    dateFormat  YYYY-MM-DD
    section Plan & Design
    Requirements & use cases        :p1, 2026-11-23, 7d
    Architecture & API contracts    :p2, after p1, 7d
    section Build (MVP)
    Repo, CI, shared library        :b1, after p2, 4d
    Auth service                    :b2, after b1, 5d
    Property service                :b3, after b1, 8d
    Booking service                 :b4, after b2, 7d
    Notification service            :b5, after b4, 4d
    API gateway                     :b6, after b2, 4d
    Frontend                        :b7, after b3, 14d
    section Quality
    Tests & code review             :q1, after b5, 7d
    Bug-fix & hardening             :q2, after q1, 5d
    section Ship
    Docker, staging deploy          :s1, after q2, 4d
    Demo & presentation             :s2, after s1, 2d
```

---

## Phase 0 — Idea & scope (week 1)

**Goal:** agree what we're building and what we're *not* building yet.

- Problem: property seekers jump between agencies, Facebook groups and classifieds; owners can't easily see who's serious.
- MVP scope: listings (house / apartment / shop) for **sale** or **rent**, search & filters, offers / rental requests / viewing requests, notifications, owner dashboard.
- Out of scope for v1: online payment, chat, maps API, reviews, mobile app.
- Deliverables: problem statement, user personas, this roadmap.

## Phase 1 — Requirements & use cases (week 1–2)

- Identify actors: Guest, Seeker (buyer/tenant), Owner (seller/landlord/agent), Admin.
- Write use cases and the diagram → [USE_CASES.md](USE_CASES.md).
- Non-functional requirements: p95 API latency < 300 ms, services deploy independently, passwords hashed, JWT auth, 80%+ test coverage on business logic.

## Phase 2 — Architecture & design (week 2)

- Split the domain into services by **business capability** → [ARCHITECTURE.md](ARCHITECTURE.md).
- Database-per-service; communication = sync REST via gateway + async events on Redis.
- Define API contracts → [API.md](API.md).
- Agree folder layout → [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md).
- Wireframes for: Home/search, Listing detail, Post listing, Dashboard, Login/Register.

## Phase 3 — Foundation (week 3)

- Monorepo with npm workspaces, ESLint, Prettier, `.editorconfig`.
- `@nestar/common` shared library: config, errors, JWT middleware, validation, repositories, event bus.
- GitHub Actions CI running tests on every pull request.
- Docker Compose with MongoDB + Redis.

## Phase 4 — Backend services (weeks 4–6)

| Order | Service | Done when |
|---|---|---|
| 1 | auth-service | register, login, `/me`, roles, tests green |
| 2 | property-service | CRUD, search filters, pagination, owner-only edits |
| 3 | api-gateway | routing, JWT check, rate-limit, CORS, health |
| 4 | booking-service | offers / rent requests / viewings, status workflow |
| 5 | notification-service | consumes events, inbox per user, mark-read |

## Phase 5 — Frontend (weeks 6–8)

- React + Vite, React Router, a small `api.js` client.
- Pages: Home & search, Listing detail, Login/Register, Post listing, Dashboard (my listings, requests in/out, notifications).

## Phase 6 — Testing & quality (weeks 9–10)

- Unit tests for business rules (status transitions, ownership checks).
- Integration tests per service with Supertest (in-memory repositories).
- End-to-end smoke test through the gateway.
- Formal code review; findings and fixes logged in [CODE_REVIEW.md](CODE_REVIEW.md).

## Phase 7 — Deployment (week 11)

- Build images per service, push to a registry (GitHub Container Registry).
- Staging on a single VM with Docker Compose, or on Render / Railway / Fly.io.
- Managed MongoDB (Atlas) and Redis (Upstash) for production.

## Phase 8 — Launch & presentation (week 12)

- Demo script, slides, retrospective.

## After v1 — what's next

1. Image upload to S3-compatible storage (MinIO locally).
2. Map search (Leaflet + OpenStreetMap).
3. In-app chat service (WebSocket).
4. Payments for deposits (Stripe / Toss Payments).
5. Kubernetes + Helm, centralized logging (Loki), tracing (OpenTelemetry).
