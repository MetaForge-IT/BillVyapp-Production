# User Story Backlog

Priority: **P0** (v1 blocking) · **P1** (v1 important) · **P2** (nice-to-have/post-v1). Status reflects current code reality, not intent.

---
## EPIC-01 Authentication & Account Security

**US-01.1** — As a Salon Owner, I want to register my salon and create a manager account so that I can start using the system.
- Business Value: entry point for every paying customer.
- Acceptance Criteria: form validates salon name/full name/email/mobile/password (8+ chars, upper/lower/number)/confirm-password match; submitting creates a Salon + User row; duplicate email is rejected.
- Priority: P0 · Dependencies: none · **Status: Functional** (`POST /auth/register` verified against live DB)

**US-01.2** — As a new registrant, I want to verify my email via link or 6-digit OTP so that my account is activated.
- Business Value: prevents fake/typo emails from accessing the system.
- Acceptance Criteria: verification email sent on register; clicking link or entering OTP sets `emailVerifiedAt`; expired/invalid tokens rejected with a clear error.
- Priority: P0 · Dependencies: US-01.1, working SMTP · **Status: Blocked** — code complete, SMTP not configured, so step 1 ("email sent") never happens for a real user.

**US-01.3** — As a registered user, I want to log in with email/password and stay signed in ("remember me") so that I don't have to re-authenticate constantly.
- Acceptance Criteria: valid credentials issue an access token (body) + refresh token (httpOnly cookie); unverified email returns `EMAIL_NOT_VERIFIED`; wrong password returns a generic invalid-credentials error (no user enumeration); `rememberMe` extends cookie lifetime.
- Priority: P0 · Dependencies: US-01.1/01.2 · **Status: Functional**

**US-01.4** — As a logged-in user, I want my session to silently refresh so that I'm not logged out mid-task.
- Acceptance Criteria: a 401 on any API call triggers one automatic `/auth/refresh` retry via the axios interceptor before failing.
- Priority: P0 · **Status: Functional**

**US-01.5** — As a user who forgot their password, I want to request and complete a password reset so that I can regain access.
- Acceptance Criteria: forgot-password always returns a generic success message regardless of whether the email exists (no enumeration); reset-password enforces the same strong-password rules and invalidates the token after use.
- Priority: P0 · Dependencies: working SMTP · **Status: Blocked** (email delivery)

**US-01.6** — As a Salon Manager, I want role-based permissions so that receptionists can't access financial settings.
- Acceptance Criteria: a role×module permission matrix exists and is enforced on both the API and the UI nav.
- Priority: P1 · **Status: Bug Found** — `SettingsContext.permissions` and backend `authorize()`/`requireManager` both exist but neither is wired to any actual check; every logged-in user currently has identical access.

**US-01.7** — As a security-conscious operator, I want unauthenticated visitors blocked from the authenticated app shell so that data isn't exposed.
- Acceptance Criteria: navigating to `/`, `/customers`, etc. without a valid session redirects to `/landing` or `/login`.
- Priority: P0 · **Status: Bug Found** — `RequireAuth.tsx` exists but is never imported by `routes.tsx`; the app shell has no active guard today.

---
## EPIC-02 Dashboard

**US-02.1** — As a Salon Manager, I want a single-screen overview of today's revenue, appointments, and alerts so that I can start my day informed.
- Acceptance Criteria: KPI tiles, trend charts, today's schedule, and critical alerts render without error; "New Appointment" quick action navigates to the booking flow.
- Priority: P1 · **Status: UI Completed** (all data is hardcoded — no dashboard aggregation API exists)

---
## EPIC-03 Customer Management

**US-03.1** — As Front Desk Staff, I want to search and filter the customer directory (tier/status/birthday/inactivity/gender/last-visit range) so that I can find a customer quickly.
- Acceptance Criteria: each filter narrows the grid/list correctly; grid/list toggle preserves the active filter set.
- Priority: P0 · **Status: UI Completed** (local seed data, 7 rows)

**US-03.2** — As Front Desk Staff, I want to add a new customer so that I can start tracking their visits.
- Acceptance Criteria: form validates required fields; submitting a valid form persists a new customer record retrievable on the next page load.
- Priority: P0 · **Status: Bug Found** — `NewCustomer.tsx`'s "Add Customer" button navigates back to `/customers` without writing to any context or seed array; the customer is never actually created.

**US-03.3** — As a Salon Manager, I want a 360° customer view (visit history, loyalty, preferences) so that I can personalize service.
- Priority: P1 · **Status: UI Completed** (mock data)

**US-03.4** — As Front Desk Staff, I want to send a birthday coupon to all eligible customers in bulk so that I can drive repeat visits without manual work per customer.
- Priority: P1 · **Status: UI Completed** (simulated send, no real WhatsApp/SMS dispatch)

**US-03.5** — As Front Desk Staff, I want to notify a customer via WhatsApp/SMS from their profile so that I can confirm or remind them about a visit.
- Priority: P1 · Dependencies: SMS/WhatsApp provider enablement · **Status: Blocked**

---
## EPIC-04 Appointment Management

**US-04.1** — As Front Desk Staff, I want to book an appointment in under 60 seconds via a 3-step wizard (customer → services → confirm) so that walk-ins don't wait.
- Acceptance Criteria: customer step supports search-existing or create-new; service step supports services/packages/products with live price calc; confirm step shows a summary and success screen.
- Priority: P0 · **Status: UI Completed** (`AppointmentContext` local only, resets on refresh)

**US-04.2** — As Front Desk Staff, I want walk-ins to use the identical booking flow with a visit-type toggle so that I don't need to learn two systems.
- Priority: P0 · **Status: UI Completed**

**US-04.3** — As Front Desk Staff, I want appointments and walk-ins to queue in true booking order (FIFO) so that no one is served out of turn.
- Acceptance Criteria: sort key = status rank (Waiting < In Progress < Completed) then booking-order id; new entries append, not prepend.
- Priority: P0 · **Status: Functional** (verified correct by hand-trace this cycle; this exact defect was previously found and fixed — see Bug Backlog BUG-03)

**US-04.4** — As Front Desk Staff, I want to check out a completed appointment (confirm-only or full payment) so that billing is recorded.
- Acceptance Criteria: checkout dialog supports GST toggle, coupon/gift-card/loyalty redemption, split payment, and calls the real billing API to persist the invoice.
- Priority: P0 · Dependencies: Prisma migration `invoice_payment_balance` applied · **Status: Blocked** — API call is made and fails today, but the failure is swallowed (try/catch → console.warn) so the local Context still shows success. This is a **silent data-integrity gap**: staff believe a bill is recorded when it is not, in the live database.
- **This gap should be flagged to the Product Owner as the single highest-severity issue in the whole audit** (see Risk Assessment RISK-01).

**US-04.5** — As Front Desk Staff, I want to edit, cancel, or delete an appointment so that I can handle changes/no-shows.
- Priority: P1 · **Status: UI Completed**

---
## EPIC-05 Billing / Point of Sale

**US-05.1** — As Front Desk Staff, I want an itemized checkout screen (services + products + combos) with GST, discounts, coupons, and split payments so that I can bill any scenario.
- Priority: P0 · **Status: UI Completed** (fully functional client-side math, correct GST calc verified)

**US-05.2** — As a Customer, I want to scan a UPI QR code to pay instantly so that I don't need cash or card.
- Acceptance Criteria: QR encodes a real UPI deep link with the live bill amount.
- Priority: P0 · **Status: Functional** but **Needs Improvement** — merchant VPA `billvyapp@ybl` has not been verified as a real registered ID; if it isn't, every scan fails silently for the customer.

**US-05.3** — As Front Desk Staff, I want to collect an advance deposit and have it auto-apply at final billing so that large bookings (e.g. bridal packages) are handled without manual tracking.
- Priority: P1 · **Status: UI Completed**, no `Advance` table in Prisma — resets on refresh.

**US-05.4** — As a Salon Manager, I want a searchable receipts register with view/email/print so that I can retrieve past transactions.
- Priority: P1 · **Status: UI Completed** (email/print are simulated, not real)

**US-05.5** — As a Salon Manager, I want refunds to require a manager PIN so that refunds can't be issued unilaterally.
- Priority: P1 · **Status: UI Completed** (demo PIN `1234`, not a real per-user credential)

**US-05.6** — As Front Desk Staff, I want to collect payment on a pending (confirm-only) invoice later so that "bill now, pay later" works.
- Priority: P0 · Dependencies: migration applied · **Status: Blocked**

---
## EPIC-06 Service Catalog & Pricing

**US-06.1** — As a Salon Owner, I want to manage my full service menu (categories, pricing, gender tags, member pricing) so that billing and booking always reflect current prices.
- Priority: P0 · **Status: UI Completed** (local `SERVICE_CATALOG`, shared correctly across billing/appointments/pricing via `resolveServicePrice`)

**US-06.2** — As a Salon Owner, I want to bulk-upload my service menu from Excel/CSV so that I don't enter each service manually.
- Acceptance Criteria: template download, parse, per-row validation with error/warning display, duplicate detection, preview before commit.
- Priority: P1 · **Status: UI Completed** (import verified working end-to-end in-browser; not persisted beyond session)

**US-06.3** — As a Salon Owner, I want to create discount coupons and send them to customers so that I can run promotions.
- Priority: P1 · **Status: UI Completed** (gated at top-level route, reachable as a Services sub-tab)

---
## EPIC-07 Inventory Management

**US-07.1** — As Inventory Staff, I want product stock to auto-deduct when a service using that product is completed so that stock stays accurate without manual entry.
- Priority: P0 · **Status: Functional** (local — `ProductsContext.deductBySku/deductByName` triggered from appointment completion)

**US-07.2** — As Inventory Staff, I want low-stock/out-of-stock alerts with a one-click reorder so that I never run out of retail product.
- Priority: P1 · **Status: UI Completed**

**US-07.3** — As Inventory Staff, I want to bulk-upload products (new items and restocks, auto-detected by SKU) so that large inventory updates aren't manual.
- Priority: P1 · **Status: UI Completed** (verified working in-browser; local only)

**US-07.4** — As Inventory Staff, I want to manage vendors and purchase orders (create/ship/deliver/delete) so that I can track supplier relationships.
- Priority: P1 · **Status: UI Completed**

---
## EPIC-08 Membership & Loyalty

**US-08.1** — As a Salon Owner, I want to define membership plans (wallet-based or service-limit-based) and enroll customers so that I can sell prepaid packages.
- Priority: P1 · Dependencies: migration applied · **Status: Blocked** (backend fully coded, no frontend page calls it yet — a "built but not wired" gap, distinct from most other gaps in this app which are "wired to nothing on the backend at all")

**US-08.2** — As a Customer, I want to see my membership tier and loyalty points so that I understand my benefits.
- Priority: P1 · **Status: UI Completed** — but this is a *second, disconnected* implementation (`Memberships.tsx` hardcoded tiers) that does not read from the real Plans API above. See Gap Analysis GAP-04.

---
## EPIC-09 Feedback & Reviews

**US-09.1** — As a Salon Manager, I want to see and reply to customer feedback with sentiment/rating breakdown so that I can address service issues.
- Priority: P2 · **Status: UI Completed** (local seed data)

**US-09.2** — As a Salon Manager, I want to request feedback from a customer via WhatsApp/SMS/email so that I can grow my review count.
- Priority: P2 · Dependencies: provider enablement · **Status: Blocked**

---
## EPIC-10 Notifications

**US-10.1** — As any staff role, I want an in-app notification center (bell + full page, filterable, mark-read) so that I don't miss important events.
- Priority: P1 · **Status: UI Completed** (static seed, `RoleContext`-filtered)

**US-10.2** — As a Salon Owner, I want notifications delivered by email/SMS/WhatsApp, not just in-app, so that staff see alerts even when not logged in.
- Priority: P2 · Dependencies: SMTP + SMS/WhatsApp enablement · **Status: Blocked**

---
## EPIC-11 Profile & Help

**US-11.1** — As a logged-in user, I want to view my profile and find help/FAQ content so that I can self-serve support questions.
- Priority: P2 · **Status: UI Completed**, **Bug Found** — profile page's "Settings" quick link and one Help FAQ tile point at removed routes (`/settings`, `/employees`), producing dead-end navigation.

---
## EPIC-12–17 Descoped/Not-Started Modules

No user stories are actionable today since no source code exists — see Gap Analysis for recommendations if/when these re-enter scope. One exception:

**US-16.1** — As a Salon Owner, I want to configure salon-wide settings (working hours, financial rules, notification preferences, RBAC) so that the system matches how my business runs.
- Priority: P2 (post-v1) · **Status: Backend Completed (data model only)** — `SettingsContext` fully models this; no UI page consumes it since Settings was removed. Recommend this be the reference spec if/when Settings re-enters scope, rather than rebuilding from zero.
