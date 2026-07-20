# Task Backlog

Legend for layer columns: ✅ Done · 🟡 Partial/Blocked · ⬜ Not Started · ➖ N/A for this task.
Effort in ideal engineer-days (S=0.5-1, M=1-3, L=3-5, XL=5+).

## EPIC-01 Authentication & Account Security

| Task | Description | FE | BE | DB | API | Validation | Testing | Docs | Module | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-01.1 | Registration form + API wiring | ✅ | ✅ | ✅ | ✅ | ✅ (Zod) | ⬜ | ⬜ | auth | M | Done |
| T-01.2 | Login form + JWT issuance/refresh cookie | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | auth | M | Done |
| T-01.3 | Configure SMTP provider (host/port/creds) | ➖ | ⬜ | ➖ | ➖ | ➖ | ⬜ | ⬜ | auth/email | S | **Not Started — top-priority unblock** |
| T-01.4 | Email verification UI (link + OTP entry) | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | auth | M | Blocked on T-01.3 |
| T-01.5 | Forgot/reset password flow | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | auth | M | Blocked on T-01.3 |
| T-01.6 | Wire `RequireAuth.tsx` into `routes.tsx` app-shell route | ✅ (exists) | ➖ | ➖ | ➖ | ➖ | ⬜ | ⬜ | routing | S | **Not Started — component built, not imported** |
| T-01.7 | Enforce `authorize()`/`requireManager` on protected backend routes per role | ➖ | ✅ (exists) | ➖ | ⬜ | ⬜ | ⬜ | ⬜ | auth | M | Not Started (middleware exists, unused) |
| T-01.8 | Consult `SettingsContext.permissions`/`RoleContext` in sidebar nav filtering | 🟡 (no-op today) | ➖ | ➖ | ➖ | ➖ | ⬜ | ⬜ | layout | M | Not Started |

## EPIC-03 Customer Management

| Task | Description | FE | BE | DB | API | Validation | Testing | Docs | Module | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-03.1 | Customer directory UI (search/filter/grid-list) | ✅ | ⬜ | ✅(schema) | ⬜ | ➖ | ⬜ | ⬜ | customers | L | UI Done, no API |
| T-03.2 | Fix `NewCustomer.tsx` to actually persist the new customer | ⬜ (bug) | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | customers | S (fix) / L (full API) | **Bug — cosmetic no-op today** |
| T-03.3 | Customer CRUD API (list/create/update/soft-delete) | ➖ | ⬜ | ✅(schema exists) | ⬜ | ⬜ | ⬜ | ⬜ | customers | L | Not Started |
| T-03.4 | Customer 360° detail view | ✅ | ⬜ | ✅ | ⬜ | ➖ | ⬜ | ⬜ | customers | M | UI Done |
| T-03.5 | Notify customer via WhatsApp/SMS | ✅ | 🟡 (provider coded, disabled) | ➖ | 🟡 | ⬜ | ⬜ | ⬜ | customers/notifications | S (config only) | Blocked — flip `SMS_ENABLED`/`WHATSAPP_ENABLED` + creds |

## EPIC-04 Appointment Management

| Task | Description | FE | BE | DB | API | Validation | Testing | Docs | Module | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-04.1 | 3-step booking wizard (customer/services/confirm) | ✅ | ⬜ | ✅(schema) | ⬜ | ✅ (client-side) | ⬜ | ⬜ | appointments | L | UI Done |
| T-04.2 | Walk-in visit-type toggle | ✅ | ⬜ | ➖ | ➖ | ✅ | ⬜ | ⬜ | appointments | S | UI Done |
| T-04.3 | FIFO queue sort (status-rank + booking-order) | ✅ | ⬜ | ➖ | ➖ | ➖ | ⬜ | ⬜ | appointments | S | Done (fixed this cycle, was buggy — BUG-03) |
| T-04.4 | Appointment CRUD API | ➖ | ⬜ | ✅(schema) | ⬜ | ⬜ | ⬜ | ⬜ | appointments | L | Not Started |
| T-04.5 | **Apply `20260707140000_invoice_payment_balance` migration** | ➖ | ➖ | ⬜ | ➖ | ➖ | ⬜ | ⬜ | billing | S | **Not Started — one command, highest leverage task in the project** |
| T-04.6 | Surface a visible error/retry when checkout API fails (currently silent) | ⬜ | ➖ | ➖ | ➖ | ⬜ | ⬜ | ⬜ | appointments/billing | M | **Not Started — data-integrity risk, see RISK-01** |

## EPIC-05 Billing / Point of Sale

| Task | Description | FE | BE | DB | API | Validation | Testing | Docs | Module | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-05.1 | Checkout dialog (GST/discount/coupon/split payment) | ✅ | ⬜ | ➖ | ➖ | ✅ | ⬜ | ⬜ | billing | XL | UI Done |
| T-05.2 | UPI QR generation | ✅ | ➖ | ➖ | ➖ | ➖ | ⬜ | ⬜ | billing | S | Done — **verify `billvyapp@ybl` is a real registered VPA** |
| T-05.3 | `POST /billing/confirm-only` | ➖ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | billing | already built | **Blocked by T-04.5** |
| T-05.4 | `POST /billing/checkout` | ➖ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | billing | already built | Blocked by T-04.5 |
| T-05.5 | `GET /billing/pending`, `POST /billing/:id/collect` | ➖ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | billing | already built | Blocked by T-04.5 |
| T-05.6 | Advance payments — persist to DB (`Advance` model + API) | ➖ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | billing | M | Not Started |
| T-05.7 | Refund PIN — replace hardcoded demo PIN with per-manager credential | 🟡 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | billing | M | Not Started |
| T-05.8 | Payment gateway integration (Razorpay/Stripe) for online card settlement | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | billing | XL | Not Started |

## EPIC-06 Service Catalog & Pricing

| Task | Description | FE | BE | DB | API | Validation | Testing | Docs | Module | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-06.1 | Service/category/package management UI | ✅ | ⬜ | ✅(schema) | ⬜ | ✅ | ⬜ | ⬜ | services | L | UI Done |
| T-06.2 | Bulk upload services parser + preview | ✅ | ⬜ | ➖ | ⬜ | ✅ | ⬜ | ⬜ | services | M | UI Done, local-only import |
| T-06.3 | Service/Package/Coupon CRUD API | ➖ | ⬜ | ✅(schema) | ⬜ | ⬜ | ⬜ | ⬜ | services | L | Not Started |

## EPIC-07 Inventory Management

| Task | Description | FE | BE | DB | API | Validation | Testing | Docs | Module | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-07.1 | Stock/vendor/PO/usage-log UI | ✅ | ⬜ | ✅(schema) | ⬜ | ✅ | ⬜ | ⬜ | inventory | XL | UI Done |
| T-07.2 | Bulk upload products (new + restock) | ✅ | ⬜ | ➖ | ⬜ | ✅ | ⬜ | ⬜ | inventory | M | UI Done, local-only |
| T-07.3 | Product/Vendor/PurchaseOrder CRUD API | ➖ | ⬜ | ✅(schema) | ⬜ | ⬜ | ⬜ | ⬜ | inventory | L | Not Started |

## EPIC-08 Membership & Loyalty

| Task | Description | FE | BE | DB | API | Validation | Testing | Docs | Module | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-08.1 | **Apply `20260707160000_salon_plans` migration** | ➖ | ➖ | ⬜ | ➖ | ➖ | ⬜ | ⬜ | plans | S | Not Started — one command |
| T-08.2 | Plans API (list/create plans, list services/customers, enrollments) | ➖ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | plans | already built | Blocked by T-08.1 |
| T-08.3 | Plan update/delete endpoint (validator exists, no route) | ➖ | ⬜ | ➖ | ⬜ | 🟡 (schema exists) | ⬜ | ⬜ | plans | S | Not Started |
| T-08.4 | Wire `Memberships.tsx` UI to real Plans API (replace hardcoded tiers) | ⬜ | ➖ | ➖ | ⬜ | ➖ | ⬜ | ⬜ | plans/memberships | L | Not Started |

## EPIC-09 Feedback & EPIC-10 Notifications

| Task | Description | FE | BE | DB | API | Validation | Testing | Docs | Module | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-09.1 | Feedback list/reply/request-feedback UI | ✅ | ⬜ | ✅(schema) | ⬜ | ✅ | ⬜ | ⬜ | feedback | M | UI Done |
| T-09.2 | Feedback CRUD API | ➖ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | feedback | M | Not Started |
| T-10.1 | Notification center UI (bell/panel/page) | ✅ | ⬜ | ✅(schema) | ⬜ | ✅ | ⬜ | ⬜ | notifications | M | UI Done |
| T-10.2 | Notification CRUD API | ➖ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | notifications | M | Not Started |
| T-10.3 | Enable SMS/WhatsApp providers (flip config + creds) | ➖ | ✅ (coded) | ➖ | ➖ | ➖ | ⬜ | ⬜ | sms/whatsapp | S | Not Started (config only) |

## EPIC-11 Profile & Help

| Task | Description | FE | BE | DB | API | Validation | Testing | Docs | Module | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-11.1 | Profile view + edit-and-save | ✅ (view only) | ⬜ | ✅(User model) | ⬜ | ⬜ | ⬜ | ⬜ | profile | M | Partial — no save path |
| T-11.2 | Fix dead links to `/settings`, `/employees` in Profile/Help | ⬜ (bug) | ➖ | ➖ | ➖ | ➖ | ⬜ | ⬜ | profile/help | S | **Bug — Not Started** |

## Cross-cutting / Technical Debt Tasks

| Task | Description | Module | Effort | Status |
|---|---|---|---|---|
| T-99.1 | Add automated test infrastructure (Vitest/Jest) — zero tests exist today, frontend or backend | all | L | Not Started |
| T-99.2 | Add a `tsconfig.json` + `tsc --noEmit` build gate — currently `vite build` provides no real typecheck | frontend build | S | Not Started |
| T-99.3 | Remove or clearly quarantine orphaned dead pages (`Invoices.tsx`, `Payments.tsx`, `Orders.tsx`, `Branches.tsx`, 5x `Accounting*.tsx`) | cleanup | S | Not Started |
| T-99.4 | Fix `Branches.tsx` `// Missing import` bug (moot while unrouted, but flagged) | cleanup | S | Not Started |
| T-99.5 | Reconcile duplicate Membership implementations (real Plans API vs. hardcoded `Memberships.tsx`) | plans | (tracked as T-08.4) | Not Started |
