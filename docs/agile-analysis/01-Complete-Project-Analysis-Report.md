# Complete Project Analysis Report

## 1. What this application is

BillVyapp ("The Starr Kuts") is a single-tenant-per-login salon management SaaS: appointment booking, POS billing/checkout, customer CRM, service catalog, inventory, memberships, feedback, and notifications, built for a single salon's staff (not a public-facing consumer booking site). Originally scaffolded via Figma Make, then hand-built out with a real Express/Prisma/MySQL backend for authentication and (partially) billing.

## 2. Architecture snapshot

**Frontend:** `Frontend folder/` — React 18, React Router 7 (`createBrowserRouter`, data-router style), Vite 6.3.5, Tailwind CSS 4, shadcn/ui (Radix), MUI 7, Framer Motion, Recharts. No `tsconfig.json` at the root — `npm run build` is `vite build` only (esbuild transpile, no `tsc` typecheck gate). Dev server: `http://localhost:5173`.

**Backend:** `backend/` — Express + Prisma ORM + Zod validation, MySQL 8 (`saloon_app` DB at `192.168.1.238:3306`). JWT auth (access token in response body, refresh token in httpOnly cookie). 34-model Prisma schema, but only 3 modules (`auth`, `billing`, `plans`) have any HTTP routes at all.

**Persistence reality:** Every other business domain (Customers, Appointments, Services, Packages, Inventory, Vendors, Purchase Orders, Coupons, Notifications, Feedback, Membership Tiers, Salon Settings) exists as a fully-designed Prisma model with **zero backend code** (no controller/service/repository) and is driven entirely by React Context + hardcoded seed arrays in the frontend. Nothing typed into these pages survives a page refresh unless it's routed through `billing` or `plans`.

## 3. Route/navigation scope ("VERSION-1 CLIENT SCOPE")

`Frontend folder/src/app/routes.tsx` is explicitly and intentionally narrowed via inline comments. Three tiers exist:

1. **Reachable in v1:** Dashboard, Appointments (+ walk-ins/queue folded in), Customers, Finance (receipts tab only), Services (+ packages/pricing/coupons as sub-tabs), Inventory, Memberships, Feedback, Profile, Help, Notifications.
2. **Gated but code-intact** (single-line revert restores them): `/coupons` (redirects to `/`, though the same code is reachable as a sub-tab of Services), `/billing`, `/invoices`, `/payments`, `/walkins`, `/queue`, `/packages`, `/pricing`, `/vendors`, `/orders` (all redirect into their v1-scope equivalents).
3. **Permanently removed — source files no longer exist:** Employees, Reports/Analytics, Marketing, CEO Dashboard, AI Insights, Settings/Administration. Only stale-link redirect stubs remain in the router; there is nothing to restore without rewriting from scratch.

There is also a fourth, previously-undocumented category: **orphaned pages** that exist as files but are never imported by the router or anything else — 100% dead code left from an earlier full-app scaffold: `Invoices.tsx`, `Payments.tsx`, `Orders.tsx` (a literal "coming soon" stub), `Branches.tsx` (contains a `// Missing import` bug), and five standalone `Accounting*.tsx` pages superseded by an also-unrouted `FinanceAccountingModule.tsx`.

## 4. What actually talks to the backend

| Frontend surface | Backend call | Status |
|---|---|---|
| Login/Signup/Forgot/Reset password pages | `src/api/auth.ts` → `/api/auth/*` | **Working** (except email-dependent steps — see §5) |
| `Appointments.tsx` checkout dialog | `src/api/billing.ts` → `/api/billing/confirm-only`, `/checkout` | Coded correctly, **fails at runtime** — migration not applied (§5); failure is silently swallowed (try/catch → `console.warn`), so the UI never visibly breaks and local Context state is the real source of truth regardless of API outcome |
| `FinanceReceiptsModule.tsx` (Pending tab) | `/api/billing/:invoiceId/collect` | Same as above |
| `FinanceReceiptsModule.tsx` (Memberships tab) | `src/api/plans.ts` → `/api/plans*` | Same as above (`salon_plans` migration) |
| Everything else (Dashboard, Customers, Services, Inventory, Memberships-display, Feedback, Notifications, MyProfile, NewCustomer, and all gated/orphaned pages) | None | Confirmed via repo-wide grep for `apiClient.`/`axios.`/`fetch(` under `src/app` — zero matches |

## 5. The two facts that block the most functionality

1. **2 Prisma migrations exist as files but are not applied to the live DB** (`npx prisma migrate status`, verified 2026-07-07): `20260707140000_invoice_payment_balance`, `20260707160000_salon_plans`. This alone is why `billing` and `plans` — the two best-built backend modules — don't actually persist anything today. Fix: `npx prisma migrate deploy` from `backend/` (one command, no new code).
2. **SMTP is not configured** (`backend/.env` has all `SMTP_*` vars commented out). Registration works and creates a real DB row, but the user can never receive a verification email/OTP and is permanently stuck at `EMAIL_NOT_VERIFIED`. Forgot-password and resend-verification have the same blocker. A seeded demo account (`prisma/seed.ts`) bypasses this for QA/demo purposes only.

## 6. Security/architecture gaps found (not features — structural issues)

- **`RequireAuth.tsx`** (a route-guard component) is fully built but **never imported anywhere**. The authenticated app shell has no actual login gate — the app is reachable at `/` etc. without ever logging in, relying only on individual pages' own (nonexistent) checks.
- **RBAC is designed but not enforced anywhere.** `SettingsContext` defines a full role×module permissions matrix; `RoleContext` defines 5 roles. Neither is consulted by the sidebar (`filteredNav` is a no-op passthrough despite the name) or by any route. Backend mirrors this: `authenticate`, `requireManager`, `authorize(...roles)` all exist in `auth.middleware.ts`, but only bare `authenticate` (valid-login-only, no role check) is used by any mounted route.
- **No payment gateway integration** anywhere (no Razorpay/Stripe/PayPal). "Card" payment is a manual reference-number field. UPI is a real scannable QR code with a live deep-link, but the merchant VPA (`billvyapp@ybl`) has not been verified as a real registered ID.
- **No automated tests** anywhere in frontend or backend (zero `*.test.*`/`*.spec.*` files, no test script in `backend/package.json`).
- **SMS/WhatsApp are fully coded provider abstractions** (MSG91/Twilio/Textlocal; Meta/360dialog/Twilio) but disabled by config (`SMS_ENABLED=false`, `WHATSAPP_ENABLED=false`) — every "notify customer" UI action in the app is a simulated success with no real message sent.

## 7. Overall maturity read

This is a well-designed, professionally-scaffolded frontend (consistent design system, sensible component architecture, real state management via Context) sitting on top of an intentionally-scoped but still very early backend. The Prisma schema is more mature than the API surface built against it — a common and reasonable sequencing for a schema-first project, but it means most "features" in the app today are convincing UI prototypes, not working software, and should be reported to stakeholders as such rather than as "done."
