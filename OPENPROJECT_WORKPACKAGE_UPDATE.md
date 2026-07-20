# BillVyapp / Saloon Operating System — OpenProject Work Package Update

> Maps the **actual, verified state of the codebase** (as of 2026-07-07) onto the work-package tree you already created in OpenProject (WP #199–253, screenshot reviewed). Organized the same way your project is: **Epic → Feature → User Story → Task**, plus a dedicated **Bug** section. Where a work package already exists, its OpenProject ID is referenced so you can find-and-update it directly. Items marked **NEW** don't exist in your tree yet and are worth adding.
>
> Status values used below map to OpenProject defaults: **New**, **In progress**, **Closed**, **On hold** (used here for "blocked by an external dependency"), **Rejected** (used for "explicitly out of scope for v1").

---

## ⚠️ Read this first — 3 discrepancies between your plan and the actual build

1. **#204 "Database Schema Design — PostgreSQL"** — the actual database is **MySQL**, not PostgreSQL. Either this was a scope change during build, or the work package title needs correcting. Worth a decision either way before more child tasks get logged under it.
2. **#232 "Employee Module"** — the Employees page/module was **explicitly deleted from the codebase** during a v1 scope-reduction request (client asked to remove Employees, Reports, Marketing, CEO Dashboard, AI Insights, Settings entirely, not just hide them). Recommend moving #232 and its children to **Rejected** for v1, or into a clearly-labeled "Post-v1 / Deferred" phase — right now it's sitting under Phase 2 (MVP Core) as if it's still planned for the current release.
3. **Authentication has no Epic/Feature of its own** anywhere in your current tree, despite being the single most complete, real, working module in the entire codebase (real JWT auth, registration, email verification, password reset — all backed by a live database). Recommended addition under Phase 1 below.

---

## PHASE 1: FOUNDATION & SETUP (Epic #199)

**Recommended status: In progress** *(already set correctly)*

### 1.1 UI/UX Design System & Wireframes (Feature #200) — status: **Closed**
This is done. Tailwind CSS 4 + shadcn/ui (Radix) component library, consistent gold (#D4AF37) / black (#111118) "luxury" theme applied across 50+ pages.

- **#202 Define color palette & brand tokens** → **Closed**. `src/app/design/luxury-tokens.ts`, `src/app/config/brand.ts`.
- **#203 Component library** → **Closed**. Full shadcn/ui set in `components/ui/` (accordion through tooltip, ~50 components).

### 1.2 Database Schema Design (Feature #204) — status: **In progress** (rename title: MySQL not PostgreSQL)
- **#206 Entity-Relationship Diagram (ERD)** → **New**. The Prisma schema encodes all relations, but no standalone ERD diagram artifact was found — worth generating one from `prisma erd` tooling if a visual diagram is a real deliverable, otherwise close this against the schema file itself.
- **#207 Multi-tenant schema design** → **Closed**. Every model is scoped by `salonId` (Salon → User/Customer/Service/Appointment/Invoice/etc., all with `salonId` FK).
- **#208 Prisma schema file** → **Closed**. `backend/prisma/schema.prisma` — **34 models**, far more complete than the number of wired-up API modules (schema was designed ahead of the build-out).

### NEW — 1.3 Authentication & Authorization Module (Feature) — status: **In progress**
Recommend adding this Feature under Phase 1; it's real, tested, working, and currently invisible in your tracker.

- User Story: *"As a salon owner, I want to register and log in securely so that only my staff can access the system."* → **Closed** for login; **On hold** for registration (see below)
  - Task: Registration API (Zod-validated, strong password rules) → **Closed**
  - Task: Login API (JWT access + refresh tokens, bcrypt) → **Closed** — verified live end-to-end
  - Task: Email verification (link + 6-digit OTP) → **On hold** — code complete, **no SMTP credentials configured**, so verification emails cannot send. This blocks real self-registration entirely.
  - Task: Forgot / reset password → **On hold** — same SMTP blocker
  - Task: Session refresh / logout → **Closed**
  - Task: Demo/seeded login for QA (`demo@starrkuts.com`) → **Closed** — workaround until SMTP is configured

---

## PHASE 2: MVP CORE MODULES (Epic #209)

### 2.1 Appointment Management Module (Feature #210) — status: **In progress**

**User Story #211** *"As Front Desk Staff, I want to book a walk-in customer in under 60 seconds…"*
- **#212 Appointment API — CRUD endpoints** → **New**. No backend Appointments module exists yet (only Auth, Billing, and Plans have real APIs).
- **#213 Real-time stylist availability engine** → **New**.
- **#214 Walk-in quick-entry modal** → **Closed (frontend only)**. Full 3-step booking UI (`NewAppointment.tsx`) works for both appointments and walk-ins; not persisted to a database.
- **#215 No-show tracking** → **Closed (frontend only)**. Status model includes `no-show`; UI supports marking it.

**User Story #216** *"As a Customer, I want to book an appointment online with real-time slot availability…"*
- **#217 Public booking page** → **New**. The entire app requires login — there is no unauthenticated/public booking page today.
- **#218 Real-time slot availability API** → **New**.
- **#219 Booking confirmation — WhatsApp + Email** → **On hold**. SMS/WhatsApp provider code exists (MSG91/Twilio/Textlocal, Meta/360dialog/Twilio) but is disabled by config; email blocked by the same SMTP gap as Auth.
- **#220 Cancellation & rescheduling self-serve** → **New**. Staff-side cancel exists; no customer-facing self-serve flow.

**NEW — Task: FIFO appointment/walk-in queue** → **Closed (frontend only)**. Built this sprint: appointments and walk-ins now sort by status (Waiting → In Progress → Completed) then booking order, automatically, with no manual reordering.

### 2.2 Point of Sale & Billing Module (Feature #221) — status: **On hold**
This is the most-built and most-blocked feature in the whole project — flag it as the top priority to unblock.

**User Story #222** *"As Front Desk Staff, I want to generate and share a digital receipt via WhatsApp…"*
- **#223 Invoice creation API** → **On hold**. `POST /api/billing/checkout` and `/confirm-only` are fully built against real `Invoice`/`InvoiceLineItem`/`Payment` tables — **but 2 of the 4 Prisma migrations are not yet applied to the live database**, so these endpoints currently fail. This is a one-command fix (`npx prisma migrate deploy`), not a coding task.
- **#226 POS billing UI** → **Closed**. Full billing dialog: itemized services/products, GST toggle, coupon/gift-card/loyalty redemption, Cash/Card/UPI/Wallet/Split payment methods.
- **#227 Multi-payment support** → **Closed (UI)**. Split payments across methods work in the UI; Card is a manual reference-number field (no real payment gateway integrated).
- WhatsApp receipt sharing specifically → **On hold** (same SMS/WhatsApp blocker).

**NEW — Task: Real UPI QR code generation** → **Closed**. Scannable QR (`qrcode.react`) encoding a live UPI deep link with the actual bill amount. **Needs verification that `billvyapp@ybl` is a real, registered UPI ID** before relying on it with real customers.

**NEW — User Story:** *"As Front Desk Staff, I want to collect a deposit before a big booking and have it automatically applied when the customer is billed, so I don't have to track it manually."* → **Closed (frontend only)**
- Task: Collect Advance Payment (Finance → Receipts → Advance Payments tab) → **Closed (frontend only)**
- Task: Auto-apply advance balance at billing time, reducing amount due → **Closed (frontend only)**
- Task: Persist advances to the database → **New** (currently `AdvancesContext`, resets on refresh — no `Advance` table in the schema yet)

### 2.3 Customer CRM Module (Feature #228) — status: **In progress**

**User Story #229** *"As a Salon Owner, I want to see a customer's full history, spend, and preferences on one screen…"*
- **#230 Customer profile UI** → **Closed (frontend only)**.
- **#231 Visit history timeline** → **Closed (frontend only)**.
- **NEW — Task: Customer CRUD API** → **New**. `Customer` table exists in schema; no API built yet.

### 2.4 Employee Module (Feature #232) — recommend status: **Rejected (for v1)**
See discrepancy note at the top. If keeping it in the tree for a future release, move it out of Phase 2 into a clearly-labeled backlog/deferred phase so it doesn't read as "currently planned MVP work."
- #233 (User Story), #234, #235, #236 → all **Rejected / Deferred**, not started, and — per explicit client instruction — the Employees page and its code were removed from the repository entirely. Restoring this is a "write it again" task, not a "resume" task.

### 2.5 Service Catalog (Feature #237) — status: **In progress**

**User Story #238** *"As an Owner, I want to configure my complete service menu with pricing…"*
- **#239 Service CRUD API** → **New**. `Service`/`ServiceCategory` tables exist; no API built yet.
- **#240 Service catalog admin UI** → **Closed (frontend only)**. Add/edit services, categories, filters — all working.
- **#241 Gender-based pricing and Combo package builder** → **Closed (frontend only)**. Male/Female/Others tabs, Packages tab, member pricing.

**NEW — Task: Bulk upload services (.xlsx/.csv)** → **Closed (frontend only)**. Template download, parse/validate/preview with error and warning rows, duplicate detection. Import doesn't persist yet (same as the rest of Services).

---

## PHASE 3: GROWTH MODULES (Epic #224)

### 3.1 Inventory Management (Feature #242) — status: **In progress**

**User Story #243** *"As an Inventory Staff, I want stock levels to update automatically after each service…"*
- **#245 Supplier management** → **Closed (frontend only)**. Vendors tab: add/view/deactivate.
- **#244 Product/inventory CRUD API** → **New**. `Product`/`StockMovement`/`PurchaseOrder` tables exist; no API built yet.

**NEW — Task: Bulk upload products (new + restock modes)** → **Closed (frontend only)**. Auto-detects new-vs-restock by SKU, previews stock-after and alert-resolution, template download.

### 3.2 Loyalty & Membership Engine (Feature #246) — status: **On hold**

**User Story #247** *"As a Salon Owner, I want loyalty tiers to upgrade automatically based on customer spend…"*
- **#248 Customer loyalty wallet UI** → **Closed (frontend only)**. Points display and redemption at billing time.
- **#249 Membership plan management** → **On hold**. Bigger update than your tracker currently shows: a real backend **Plans module now exists** — `SalonPlan`, `SalonPlanService`, `CustomerPlanEnrollment` tables, plus 5 real endpoints (`GET/POST /api/plans`, `/api/plans/enrollments`, `/api/plans/services`, `/api/plans/customers`). It's blocked by the same un-applied migration as Billing (`20260707160000_salon_plans`). No frontend page calls these endpoints yet — the API exists server-side only.

---

## PHASE 4: ENTERPRISE & MULTI-BRANCH (Epic #225)

### 4.1 Multi-Branch Dashboard (Feature #250) — status: **New**

**User Story #251** *"As a Chain Owner, I want to manage all branches from one login and compare their performance…"*
- **#252 Cross-tenant access model** → **New**. Schema has `salonId` multi-tenancy throughout, plus a stray `branchId` field on `Customer`, but no `Branch` model and no cross-branch access logic exists.
- **#253 Multi-branch consolidated dashboard** → **New**. An orphaned `Branches.tsx` page exists in the frontend (built at some point) but isn't wired into the app's routes — effectively dead code today, not a working dashboard.

---

## Bug workflow (new section — recommend creating a "Bugs" work package type filter/board)

### Fixed this sprint (recommend logging as Closed, for the audit trail)
| Bug | Root cause | Resolution |
|---|---|---|
| Double close-("×") buttons appearing on ~17 dialogs across Inventory, Services, Feedback, Customers, Vendors, Coupons | Shared `DialogContent` auto-renders a default close button; pages also added their own custom one without hiding the default | Added the suppression class to every affected dialog; restyled the default close button so single-X dialogs look intentional |
| New appointments/walk-ins jumped to the top of the list instead of appearing in booking order | Merge logic prepended new items (`[newOnes[0], ...prev]`) instead of appending | Rewrote to append + sort by status-rank then booking-order id (true FIFO) |
| Walk-ins booked via "New Appointment" never appeared in the Walk-ins tab | Merge logic didn't route by `type`, dumped everything into the Appointments list | Routed appointments and walk-ins into their correct lists on merge |
| Blank white screen on `/login` and `/signup` with zero console errors | `LoginPage.tsx` and `SignUpPage.tsx` were found completely empty (0 bytes) | Rebuilt both, wired to the real auth API |
| `prisma migrate status` reported a pending migration that actually already existed in the DB (drift) | Partial/manual prior migration run desynced Prisma's tracking table | Resolved via `prisma migrate resolve --applied`, not a re-run |

### Open — recommend logging these now
| Bug / Gap | Impact | Suggested priority |
|---|---|---|
| 2 Prisma migrations not applied to the live database (`invoice_payment_balance`, `salon_plans`) | Billing (4 endpoints) and Plans (5 endpoints) are fully coded but non-functional | **Highest** — one command unblocks 9 endpoints |
| No SMTP configured | Registration, email verification, password reset all non-functional for real users | **High** |
| UPI VPA `billvyapp@ybl` unverified | If not a real registered ID, the QR code will fail when scanned by GPay/PhonePe/Paytm | **High** — verify before any client demo involving real payment |
| SMS/WhatsApp providers coded but disabled | Booking confirmations, reminders, notify-customer features are all UI-only simulations | Medium |
| No automated tests anywhere in the repo (frontend or backend) | No regression safety net | Medium |

---

## Suggested immediate next actions in OpenProject

1. Update statuses per the tables above (biggest single change: Phase 2 Billing feature #221 and its children should move to **On hold**, not New — it's the most-built, most-blocked part of the app).
2. Add the new **Authentication & Authorization** Feature under Phase 1 — it's your most complete module and currently untracked.
3. Move Employee Module (#232) out of "currently planned MVP" — it's explicitly out of scope for this release.
4. Log the 5 open bugs/gaps above as Bug-type work packages, with "apply pending migrations" as the top-priority one.
5. Correct or clarify #204's PostgreSQL reference against the actual MySQL implementation.
