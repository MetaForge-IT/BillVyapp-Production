# Test Case Document

`Pass/Fail` reflects either (a) direct evidence gathered during this audit (code trace, live `prisma migrate status` run) or (b) `Not Executed` where the case requires interactive browser execution beyond this audit's static/CLI verification — these are flagged explicitly and should be run before sign-off. `Regression Required` = Yes means re-run this case on every release touching the named module.

## Module: Authentication

| TC ID | Feature | Scenario | Preconditions | Steps | Expected Result | Actual/Pass-Fail | Severity | Regression |
|---|---|---|---|---|---|---|---|---|
| TC-A01 | Registration | Positive — valid registration | None | Submit signup form with valid salon name, email, mobile, matching strong password | 201, Salon+User created, `emailVerifiedAt` null | Pass (verified via code trace of `registration.controller.ts`) | High | Yes |
| TC-A02 | Registration | Negative — weak password | None | Submit password `abc123` (no uppercase) | 400 with Zod validation error | Pass (Zod schema enforces upper/lower/digit/8+) | Medium | Yes |
| TC-A03 | Registration | Negative — password/confirm mismatch | None | `password` ≠ `confirmPassword` | 400, refine error | Pass (schema `.refine`) | Medium | Yes |
| TC-A04 | Registration | Boundary — mobile number length | None | Submit 9-digit and 21-digit numbers | Both rejected (regex bounds 10–20) | Pass (per validator) | Low | Yes |
| TC-A05 | Login | Positive — valid credentials, verified account | Seeded demo account exists | Login with `demo@starrkuts.com`/`Demo@1234` | Access token returned, redirect to Dashboard | Pass (per `VERSION_1_AGILE_BOARD.md`, verified live) | Critical | Yes |
| TC-A06 | Login | Negative — unverified email | Register a new account, don't verify | Attempt login | 403 `EMAIL_NOT_VERIFIED` | Pass (code path confirmed) | High | Yes |
| TC-A07 | Login | Negative — wrong password | Valid account exists | Login with wrong password | Generic invalid-credentials error (no enumeration of which field was wrong) | Not Executed — verify no username enumeration leak | High | Yes |
| TC-A08 | Email Verification | Negative — real self-registration end-to-end | SMTP not configured | Register a brand-new (non-seeded) account, attempt to verify | User can never receive the verification email/OTP | **Fail — confirmed blocked** (SMTP commented out in `.env`) | Critical | Yes |
| TC-A09 | Forgot Password | Negative — nonexistent email | None | Submit forgot-password with an email not in the system | Generic success message (no enumeration) | Pass (code always returns generic message) | Medium | Yes |
| TC-A10 | Session Refresh | Positive — expired access token | Logged in, access token expired | Make any authenticated API call | Axios interceptor silently retries via `/auth/refresh` | Pass (interceptor confirmed in `axios.ts`) | High | Yes |
| TC-A11 | Route Guard | **Negative — access without login** | Logged out / cleared localStorage | Navigate directly to `/` or `/customers` | Should redirect to `/landing` | **Fail — no redirect occurs** (`RequireAuth` unwired, BUG-004) | Critical | Yes |
| TC-A12 | Permission | **Negative — restricted role accessing gated action** | Any two distinct roles | Switch `RoleContext` role, attempt a "manager-only" action | Should be blocked for non-manager roles | **Fail — no role is actually restricted anywhere** (BUG-005) | High | Yes |

## Module: Customer Management

| TC ID | Feature | Scenario | Preconditions | Steps | Expected Result | Actual/Pass-Fail | Severity | Regression |
|---|---|---|---|---|---|---|---|---|
| TC-C01 | Directory Search | Positive — filter by tier | Seed customers loaded | Select "Platinum" tier filter | Grid shows only Platinum customers | Not Executed (UI interactive) | Medium | Yes |
| TC-C02 | Directory Search | Boundary — last-visit date range with no matches | — | Pick a future date range | Empty state renders, no crash | Not Executed | Low | No |
| TC-C03 | Add Customer | **Negative — data not persisted** | On `/customers/new` | Fill valid form, submit | Customer should appear in directory | **Fail — confirmed via code trace**, form discards data (BUG-003) | High | Yes |
| TC-C04 | Add Customer | Validation — required fields | On `/customers/new` | Submit empty form | Inline validation errors on required fields | Not Executed | Medium | Yes |
| TC-C05 | Notify Customer | Negative — WhatsApp/SMS send | Any customer selected | Trigger "Notify" | Should send a real WhatsApp/SMS | **Fail — simulated only**, `WHATSAPP_ENABLED=false` | Medium | Yes |
| TC-C06 | Bulk Coupon Send | Positive — select multiple, send | ≥2 customers in directory | Bulk-select, choose coupon, send | UI confirms send (simulated) | Pass (UI-only, as designed for v1 mock) | Low | No |

## Module: Appointment Management

| TC ID | Feature | Scenario | Preconditions | Steps | Expected Result | Actual/Pass-Fail | Severity | Regression |
|---|---|---|---|---|---|---|---|---|
| TC-P01 | Booking Wizard | Positive — book new customer + service | On `/appointments/new` | Create new customer inline, pick a service, confirm | Appointment appears in Timeline, status Waiting | Not Executed (UI interactive) — expected functional per code trace | High | Yes |
| TC-P02 | Booking Wizard | Boundary — zero services selected | Step 2 of wizard | Attempt to proceed with no services/packages selected | Should block progression with a validation message | Not Executed — verify this guard exists | Medium | Yes |
| TC-P03 | Walk-in | Positive — book as walk-in | — | Toggle visit type to Walk-in, complete flow | Appears in Walk-ins tab, not Appointments tab | Pass (fixed bug — routes correctly by `type` per Bug Backlog resolved list) | High | Yes |
| TC-P04 | Queue Ordering | Positive — FIFO order preserved | 3+ appointments booked in sequence | Book A, B, C in order | Queue displays A, B, C (booking order), re-sorts by status rank as each progresses | Pass (verified by hand-trace of sort comparator) | High | Yes |
| TC-P05 | Checkout | **Negative — invoice persistence** | Migration `invoice_payment_balance` unapplied (current state) | Complete a checkout (any payment method) | Invoice row should exist in MySQL `Invoice` table | **Fail — confirmed via `npx prisma migrate status`**: API call fails, UI shows success anyway (BUG-001/002) | Critical | Yes |
| TC-P06 | Checkout | Positive — GST calculation | Checkout dialog open, GST toggle on | Add ₹1000 of services, enable GST at 18% | Total = ₹1180 | Pass (client-side math verified correct) | High | Yes |
| TC-P07 | Checkout | Boundary — coupon exceeding bill total | Coupon with fixed ₹2000 discount, bill total ₹500 | Apply coupon | Discount should cap at bill total, not go negative | Not Executed — verify cap logic | Medium | Yes |
| TC-P08 | Notify Customer | Negative — template send | Appointment selected | Send "Reminder" template | Should send real WhatsApp/SMS | **Fail — simulated only** | Medium | Yes |

## Module: Billing / POS

| TC ID | Feature | Scenario | Preconditions | Steps | Expected Result | Actual/Pass-Fail | Severity | Regression |
|---|---|---|---|---|---|---|---|---|
| TC-B01 | Split Payment | Positive — cash + card split | Checkout dialog | Split ₹1000 as ₹600 cash / ₹400 card | Both amounts recorded, sum matches total | Not Executed | High | Yes |
| TC-B02 | Split Payment | Boundary — split amounts don't sum to total | Checkout dialog | Enter ₹600 + ₹300 for a ₹1000 bill | Should block submission until sum matches | Not Executed — verify guard | Medium | Yes |
| TC-B03 | UPI QR | Positive — QR encodes correct live amount | Checkout dialog, UPI selected | Change bill amount, inspect QR payload | QR deep link amount matches displayed total | Pass (verified via code — QR built from live state) | High | Yes |
| TC-B04 | UPI QR | **Negative — real payment scan** | Real UPI app | Scan QR and attempt payment | Payment should route to salon's merchant account | **Not Executed / Unverified** — `billvyapp@ybl` registration unconfirmed (BUG-009) | High | Yes |
| TC-B05 | Advance Payment | Positive — collect then auto-apply | Advance collected for a phone number | Book/checkout under same phone number | Balance due reduced by advance amount | Pass (verified by hand-trace) | Medium | Yes |
| TC-B06 | Refund | Permission — PIN gate | Refund flow open | Enter wrong PIN | Refund blocked | Not Executed — demo PIN is hardcoded `1234`, verify wrong-PIN rejection | Medium | Yes |
| TC-B07 | Pending Payments | **Negative — collect on a pending invoice** | Migration unapplied | Attempt to collect payment on a pending invoice | Should update Invoice/Payment tables | **Fail — confirmed blocked** (BUG-002) | Critical | Yes |

## Module: Service Catalog & Pricing

| TC ID | Feature | Scenario | Preconditions | Steps | Expected Result | Actual/Pass-Fail | Severity | Regression |
|---|---|---|---|---|---|---|---|---|
| TC-S01 | Bulk Upload | Positive — valid CSV | Template downloaded | Fill template correctly, upload | Preview shows all rows valid, import commits | Pass (parse/validate/preview verified working per code) | Medium | Yes |
| TC-S02 | Bulk Upload | Negative — malformed rows | — | Upload CSV with missing price column | Row flagged as error in preview, not imported | Not Executed — verify error-row UI | Medium | Yes |
| TC-S03 | Bulk Upload | Boundary — duplicate service name | — | Upload a service name that already exists | Flagged as duplicate warning | Not Executed | Low | Yes |
| TC-S04 | Gender Pricing | Positive — correct price shown per gender tag | Catalog loaded | View a "Female"-tagged service in billing | Price resolves via `resolveServicePrice` correctly | Pass (verified in code) | Medium | Yes |
| TC-S05 | Coupons | Positive — create and send coupon | On Services → Coupons tab | Create coupon, send to a customer | Coupon appears in list, send confirms (simulated) | Pass (UI functional) | Low | No |

## Module: Inventory Management

| TC ID | Feature | Scenario | Preconditions | Steps | Expected Result | Actual/Pass-Fail | Severity | Regression |
|---|---|---|---|---|---|---|---|---|
| TC-I01 | Stock Deduction | Positive — auto-deduct on appointment complete | Product linked to a service | Complete an appointment using that service | Product stock quantity decreases by linked amount | Pass (verified via `ProductsContext.deductBySku` code trace) | High | Yes |
| TC-I02 | Low Stock Alert | Boundary — stock exactly at min-stock threshold | Product stock = minStock | View Inventory page | Should trigger "low" status banner | Not Executed — verify boundary is inclusive | Medium | Yes |
| TC-I03 | Manual Adjustment | Positive — subtract with reason | Product selected | Adjust stock -5, reason "Damaged" | Stock reduced, audit log entry created | Pass (verified in code — `stockLog`) | Medium | Yes |
| TC-I04 | Bulk Upload | Positive — restock mode auto-detect by SKU | Existing SKU in system | Upload CSV with that SKU and a quantity | Detected as restock, not new-product | Pass (verified in code) | Medium | Yes |
| TC-I05 | Purchase Order | Positive — create → ship → deliver | — | Walk a PO through its full lifecycle | Status transitions correctly at each stage | Not Executed | Medium | Yes |

## Module: Membership & Loyalty

| TC ID | Feature | Scenario | Preconditions | Steps | Expected Result | Actual/Pass-Fail | Severity | Regression |
|---|---|---|---|---|---|---|---|---|
| TC-M01 | Plans API | Positive — create a plan | Migration applied (currently not) | `POST /plans` with valid payload | 201, plan created | **Blocked — cannot execute** until BUG-002 fixed | Critical | Yes |
| TC-M02 | Plans API | Positive — enroll a customer | Plan exists, migration applied | `POST /plans/enrollments` | Enrollment created, wallet/service totals set | **Blocked — cannot execute** | Critical | Yes |
| TC-M03 | Memberships UI | **Negative — consistency with real Plans data** | A plan created via Finance → Memberships | View main `/memberships` page | Should reflect the same plan/enrollment | **Fail — confirmed disconnected**, two separate implementations (BUG-008) | Medium | Yes |

## Module: Feedback & Notifications

| TC ID | Feature | Scenario | Preconditions | Steps | Expected Result | Actual/Pass-Fail | Severity | Regression |
|---|---|---|---|---|---|---|---|---|
| TC-F01 | Feedback Reply | Positive — reply to a review | Feedback list loaded | Type reply, submit | Reply attached to that review's card | Pass (local state confirmed functional) | Low | No |
| TC-F02 | Request Feedback | Negative — send via WhatsApp | — | Trigger "Request Feedback" modal, choose WhatsApp | Should send a real message | **Fail — simulated only** | Medium | Yes |
| TC-N01 | Notification Panel | Positive — mark all read | Unread notifications present | Click "mark all read" | Badge count clears | Pass (local state confirmed functional) | Low | No |
| TC-N02 | Role-filtered Feed | Positive — role switch changes visible notifications | RoleContext role changed | Switch role, view Notifications page | Feed filters per role | Pass (filter logic confirmed in code) | Low | No |

## Performance & Non-functional considerations (flagged, not yet load-tested)

| Area | Consideration | Status |
|---|---|---|
| `Appointments.tsx` (3,666 lines) | Single-file complexity risk for render performance and maintainability as data grows beyond seed-scale | Not Executed — no load testing performed |
| Inventory bulk upload | Parser behavior with large (1000+ row) CSV files untested | Not Executed |
| Backend | No load/stress testing performed against `billing`/`auth` endpoints | Not Executed |
| Bundle size | No production build size audit performed (`npm run build` not benchmarked) | Not Executed |
