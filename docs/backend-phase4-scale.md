# Phase 4 — Scale (read replicas, snapshots, rate limits, FULLTEXT)

## 1. Precomputed dashboard snapshots

When salon data changes (billing, appointments, customers), the API:

1. Clears the Redis key `dashboard:{salonId}`
2. **Rebuilds** the dashboard immediately (when Redis is available)

The next `GET /api/dashboard` is served from cache without a cold DB compute.

**Env:**

```env
REDIS_URL=redis://redis:6379
DASHBOARD_PRECOMPUTE=true
REDIS_DASHBOARD_SNAPSHOT_TTL_SECONDS=60
```

Set `DASHBOARD_PRECOMPUTE=false` to only invalidate (Phase 1 behavior).

---

## 2. Read replica for reporting

Optional second connection for **read-heavy** paths:

- Dashboard aggregates
- Global search

**Env:**

```env
DATABASE_URL="mysql://writer:pass@primary-host:3306/new_salon_app?connection_limit=10"
DATABASE_URL_READ="mysql://reader:pass@replica-host:3306/new_salon_app?connection_limit=10"
```

When `DATABASE_URL_READ` is omitted, all reads use the primary (safe default).

**AWS RDS:** create a read replica in the same region, use its endpoint for `DATABASE_URL_READ`.

All writes (checkout, mutations) always use `DATABASE_URL` (primary).

---

## 3. Rate limiting

| Layer | Default | Scope |
|-------|---------|--------|
| Login | 10 req / min / IP | `POST /api/auth/login`, `/login/verify-otp`, `/login/resend-otp` only |

Uses **Redis store** when `REDIS_URL` is set (shared across app instances); otherwise in-memory per process.

**Env:**

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_AUTH_MAX=10
```

Disabled automatically in `NODE_ENV=test`.

429 responses include standard `RateLimit-*` headers.

---

## 4. FULLTEXT search

MySQL FULLTEXT indexes on:

- `customers.full_name`
- `services.name`, `services.display_name`

Global search uses FULLTEXT for terms **≥ 3 characters**; shorter terms fall back to `LIKE`/`contains`.

**Deploy migration:**

```bash
cd backend
npx prisma migrate deploy
```

Migration: `20260822180000_phase4_fulltext_search`

---

## Production checklist

1. `REDIS_URL` — snapshots + distributed rate limits  
2. `DATABASE_URL_READ` — when RDS read replica exists  
3. Run Phase 2 + Phase 4 migrations  
4. Tune rate limits if legitimate clients hit 429  
5. Monitor replica lag; if lag > few seconds, dashboard may be slightly stale (acceptable for KPIs)
