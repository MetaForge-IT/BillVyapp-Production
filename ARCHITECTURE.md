# The Starr Kuts — High-Level Architecture

> **Status:** Target architecture (approved design).  
> **Last reviewed:** 2026-07-01  
> **Repo layout:** `Frontend folder/` (SPA prototype) · `Backend folder/` (placeholder)

---

## 1. Architecture diagram (target)

```
                         Users
                           │
                           ▼
                Next.js + TypeScript
             (Tailwind CSS + ShadCN UI)
                           │
                     Zustand State
                           │
                        Axios API
                           │
                           ▼
                Node.js + Express.js
                           │
      ┌──────────────────────────────────────┐
      │              Middleware              │
      │ • JWT Authentication                 │
      │ • OAuth Authentication               │
      │ • Request Validation                 │
      │ • Logging                            │
      │ • Error Handling                     │
      └──────────────────────────────────────┘
                           │
                           ▼
                 Controllers → Services
                           │
                           ▼
                       Prisma ORM
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
    PostgreSQL                         Redis Cache
          │
          ├──────────────┐
          ▼              ▼
      AWS S3      Microsoft Graph / SMTP
 (File Storage)      (Email Service)

──────────────────────────────────────────────
GitHub → GitHub Actions → Docker → AWS EC2
                                  │
                                Nginx
                                  │
                         Sentry + Grafana
```

---

## 2. Layer-by-layer analysis

### 2.1 Presentation — Next.js + TypeScript + Tailwind + ShadCN

| Aspect | Assessment |
|--------|------------|
| **Purpose** | SSR/SSG-capable salon dashboard, marketing pages, role-based UI |
| **Strengths** | SEO for landing/pricing; API routes for BFF patterns; strong TS ecosystem |
| **Fit for salon SaaS** | Excellent for multi-branch, public booking pages, and admin consoles |
| **Current repo** | **Vite + React SPA** with same visual stack (Tailwind + Radix/ShadCN). Not Next.js yet |

**Recommendation:** Migrate to Next.js when you need SSR, auth cookies on server, or `/api` BFF. Until then, Vite SPA + Express API is valid.

---

### 2.2 Client state — Zustand

| Aspect | Assessment |
|--------|------------|
| **Purpose** | Lightweight global state (user session, cart, filters, UI prefs) |
| **Strengths** | Minimal boilerplate vs Redux; works well with React Query for server state |
| **Pattern** | Zustand for client UI state; server data via Axios + React Query/SWR |
| **Current repo** | **React Context** (`RoleContext`, `AppointmentContext`, etc.) + local `useState` |

**Recommendation:** Introduce Zustand per domain store (`useAuthStore`, `useAppointmentStore`) as API integration begins.

---

### 2.3 API client — Axios

| Aspect | Assessment |
|--------|------------|
| **Purpose** | HTTP to Express with interceptors (JWT refresh, error normalization) |
| **Strengths** | Mature interceptors, timeout, cancel tokens |
| **Current repo** | **No HTTP client** — all data from seed files in `src/app/data/` |

---

### 2.4 Application server — Node.js + Express

| Aspect | Assessment |
|--------|------------|
| **Purpose** | REST (or GraphQL) API for salon operations |
| **Structure** | `routes → controllers → services → repositories (Prisma)` |
| **Current repo** | **Backend folder empty** |

**Suggested module boundaries (match existing UI):**

- `auth` — login, JWT, OAuth, roles (admin, manager, stylist, receptionist)
- `appointments` — scheduling, slots, reminders
- `customers` — CRM, loyalty, memberships
- `services` — catalog, packages, pricing
- `finance` — receipts, invoices, payments, GST
- `inventory` — stock, POs, vendors
- `notifications` — in-app + email triggers
- `files` — S3 presigned uploads (receipts, product images)

---

### 2.5 Middleware stack

| Middleware | Role |
|------------|------|
| **JWT** | Stateless API auth; access + refresh tokens |
| **OAuth** | Google/Microsoft social login for staff |
| **Validation** | Zod/Joi on body/query/params — reject bad input before controllers |
| **Logging** | Structured JSON (pino/winston) — request ID, user ID, latency |
| **Error handling** | Single handler → consistent `{ code, message, details }` + Sentry capture |

---

### 2.6 Data — Prisma + PostgreSQL + Redis

| Store | Use case |
|-------|----------|
| **PostgreSQL** | Source of truth: users, appointments, customers, transactions |
| **Redis** | Session cache, rate limiting, appointment slot locks, hot KPI caches |
| **Prisma** | Type-safe migrations, relations, multi-tenant `salonId` / `branchId` |

**Multi-tenancy note:** Salon SaaS should scope all queries by `organizationId` or `branchId` from JWT claims.

---

### 2.7 External services

| Service | Use case |
|---------|----------|
| **AWS S3** | Receipt PDFs, customer photos, bulk import files |
| **Microsoft Graph / SMTP** | Appointment reminders, birthday coupons, password reset |

---

### 2.8 DevOps & observability

```
GitHub (source) → GitHub Actions (test, build, push image)
                         → Docker image → AWS EC2
                                    → Nginx (TLS, static, reverse proxy)
                                    → Sentry (errors) + Grafana (metrics/logs)
```

| Component | Role |
|-----------|------|
| **Docker** | Reproducible API + worker containers |
| **EC2** | Initial deployment target; scale to ECS/EKS later |
| **Nginx** | SSL termination, gzip, rate limit, upstream to Node |
| **Sentry** | Frontend + backend exception tracking |
| **Grafana** | Dashboards for API latency, DB connections, queue depth |

---

## 3. Current vs target gap matrix

| Component | Target | Current (`Frontend folder`) |
|-----------|--------|----------------------------|
| Framework | Next.js | Vite + React |
| UI | Tailwind + ShadCN | Tailwind + ShadCN/Radix ✅ |
| State | Zustand | React Context |
| API | Axios → Express | None (seed data) |
| Backend | Express + Prisma | Not started |
| Database | PostgreSQL | In-memory seeds |
| Cache | Redis | None |
| Auth | JWT + OAuth | Mock login UI only |
| Storage | AWS S3 | None |
| Email | Graph/SMTP | None |
| CI/CD | GitHub Actions + Docker | None |
| Hosting | EC2 + Nginx | Local Vite dev server |
| Monitoring | Sentry + Grafana | None |

---

## 4. Strengths of this architecture

1. **Clear separation** — UI, API, and data layers are independently scalable.
2. **Familiar stack** — TypeScript end-to-end; large hiring pool.
3. **Prisma** — Fast schema iteration for salon domain (appointments, loyalty, inventory).
4. **Redis** — Critical for booking concurrency (prevent double-booking).
5. **Observability baked in** — Sentry + Grafana from day one reduces production blind spots.

---

## 5. Risks & recommendations

| Risk | Mitigation |
|------|------------|
| Next.js migration cost | Defer until SSR/auth cookies needed; ship API first with Vite SPA |
| Redis ops overhead | Start with PostgreSQL advisory locks; add Redis when traffic grows |
| EC2 single point of failure | Use ALB + 2 instances or move to ECS when SLA matters |
| JWT in SPA | Prefer httpOnly cookies via BFF or Next.js API routes to reduce XSS token theft |
| Monolith Express | Acceptable for v1; extract workers (email, reminders) to queue later |

---

## 6. Suggested implementation phases

### Phase 1 — API foundation
- Express + Prisma + PostgreSQL
- Auth (JWT), validation, error middleware
- CRUD: customers, appointments, services

### Phase 2 — Frontend integration
- Axios client + Zustand stores
- Replace seed data with API calls
- Loading/error states in existing pages

### Phase 3 — Platform services
- Redis caching, S3 uploads, email notifications
- Role-based API guards matching UI roles

### Phase 4 — Production
- Docker, GitHub Actions, EC2, Nginx
- Sentry + Grafana dashboards

### Phase 5 — Optional Next.js migration
- Move marketing + dashboard to App Router if SSR/SEO required

---

## 7. References in this repo

- **UI modules:** `Frontend folder/src/app/pages/` (Dashboard, Appointments, Customers, Finance, Inventory, …)
- **Roles:** `Frontend folder/src/app/context/RoleContext.tsx`
- **Seed data:** `Frontend folder/src/app/data/`
- **Cursor rule (AI memory):** `.cursor/rules/salon-target-architecture.mdc`
