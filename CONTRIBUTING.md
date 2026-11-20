# Contributing to Nestar

Thanks for helping! Here's everything you need, in the order you'll need it.

## 1. Set up

```bash
git clone https://github.com/<your-username>/nestar.git
cd nestar
npm install
npm test          # everything should be green before you start
npm run dev       # backend on :8080 (in-memory, no Docker needed)
npm run seed      # demo users + listings
npm run dev -w frontend   # http://localhost:5173
```

## 2. Pick something to work on

- Look at issues labelled **good first issue** or **help wanted**.
- Comment "I'll take this" so nobody else starts the same thing.
- Bigger idea? Open an issue first so we can agree on the approach.

## 3. Branch, code, commit

```bash
git checkout develop && git pull
git checkout -b feat/property-map-search
```

Branch names: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `test/…`.

Commit messages follow **Conventional Commits** — `type(scope): what changed`:

```
feat(property): add map bounding-box search
fix(booking): reject viewing dates in the past
docs(api): document /bookings/incoming status filter
test(auth): cover duplicate email with different casing
```

Scopes: `gateway`, `auth`, `property`, `booking`, `notification`, `frontend`, `common`, `docs`, `ci`.

## 4. House rules

- **Business rules go in `service.js` / `rules.js`, not in routes.** Routes only parse and respond.
- **Every bug fix comes with a test** that fails before the fix.
- **No cross-service imports.** Talk over HTTP or events.
- **Validate every input** with the schema helper — never trust `req.body`.
- **Never commit `.env`**, tokens or real user data.

## 5. Open a pull request

- Target the `develop` branch.
- Fill in the PR template.
- CI must be green (tests, smoke test, Docker build).
- One approval from a maintainer is needed to merge. We squash-merge.

## 6. Reviewing others' PRs

Be kind and specific. "This could leak the password hash in `/users/:id` — can we use `publicUser()`?" helps more than "security issue".
