# Nestar — API Reference

Base URL (through the gateway): `http://localhost:8080/api`
Auth: `Authorization: Bearer <token>` — get a token from register or login.
Errors always look like:

```json
{ "error": { "code": "BAD_REQUEST", "message": "Validation failed", "details": [{ "field": "price", "message": "must be >= 1" }] } }
```

| Code | Meaning |
|---|---|
| 400 | Invalid input (see `details`) |
| 401 | Missing / invalid / expired token |
| 403 | Logged in, but not allowed (wrong role, not the owner) |
| 404 | Not found |
| 409 | Conflict (duplicate email, request already decided, listing no longer available) |
| 429 | Too many requests |
| 502 / 503 | A service is down — try again |

---

## Auth — `auth-service`

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | – | `name, email, password (≥8), role: seeker\|owner, phone?` | `201 { user, token }` |
| POST | `/auth/login` | – | `email, password` | `{ user, token }` |
| GET | `/auth/me` | ✔ | – | `{ user }` |
| PATCH | `/auth/me` | ✔ | `name?, phone?, role?: seeker\|owner` | `{ user, token }` (fresh token) |
| GET | `/auth/users/:id` | – | – | `{ user: { id, name, role, createdAt } }` |

```bash
curl -X POST localhost:8080/api/auth/register -H 'content-type: application/json' \
  -d '{"name":"Ann Kim","email":"ann@example.com","password":"password123","role":"owner"}'
```

## Properties — `property-service`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/properties` | – | Search **available** listings. Query: `purpose=sale\|rent`, `type=house\|apartment\|shop`, `city` (prefix, case-insensitive), `q` (title contains), `minPrice`, `maxPrice`, `bedrooms` (minimum), `sort=newest\|price_asc\|price_desc`, `page`, `limit (≤50)`. Returns `{ items, page, limit, total, pages }` |
| GET | `/properties/mine` | ✔ | My listings, any status |
| GET | `/properties/:id` | – | `{ property }` |
| POST | `/properties` | owner/admin | `title, description, type, purpose, price, rentPeriod (rent only: month\|year), currency?, city, address, bedrooms?, bathrooms?, areaSqm?, images? (≤10 URLs)` → `201 { property }` |
| PATCH | `/properties/:id` | listing owner/admin | Any create field + `status: available\|pending\|sold\|rented` |
| DELETE | `/properties/:id` | listing owner/admin | `204` |

Internal only (not exposed by the gateway, needs `x-internal-key`):
`GET /internal/properties/:id`, `PATCH /internal/properties/:id/status { status, expectedStatus? }` → `409` if `expectedStatus` doesn't match.

## Bookings — `booking-service`

All routes need a token.

| Method | Path | Notes |
|---|---|---|
| POST | `/bookings` | `propertyId, kind: offer\|rent_request\|viewing, amount (offer), visitDate (viewing, future), moveInDate?, message?` → `201 { booking }` |
| GET | `/bookings/mine` | Requests I sent |
| GET | `/bookings/incoming?status=` | Requests on my listings |
| GET | `/bookings/:id` | Only requester, listing owner or admin |
| PATCH | `/bookings/:id/status` | `{ status: accepted\|rejected (owner) \| cancelled (requester), reply? }` |

Rules: no requests on your own listing · `offer` only on sale, `rent_request` only on rent · one pending request per kind per listing · accepting an offer → listing `sold`, a rent request → `rented`, and other pending requests are auto-rejected.

## Notifications — `notification-service`

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications?unread=true` | `{ items (latest 50), unreadCount }` |
| PATCH | `/notifications/:id/read` | Mark one read (404 if not yours) |
| PATCH | `/notifications/read-all` | `{ updated }` |

## Events (Redis channels `nestar.<topic>`)

| Topic | Publisher | Payload |
|---|---|---|
| `user.registered` | auth | `userId, name, role` |
| `property.created` | property | `propertyId, ownerId, title` |
| `property.updated` | property | `propertyId, ownerId, title, status, changes[]` |
| `property.deleted` | property | `propertyId, ownerId, title` |
| `booking.created` | booking | `bookingId, propertyId, propertyTitle, kind, ownerId, requesterId, requesterName, amount?, visitDate?` |
| `booking.status_changed` | booking | `bookingId, propertyId, propertyTitle, kind, status, ownerId, requesterId` |

Every service also has `GET /health`.
