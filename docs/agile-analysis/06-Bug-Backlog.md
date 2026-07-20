# Bug Backlog

Severity: **Critical** (data loss/security) · **High** (feature broken) · **Medium** (degraded/misleading) · **Low** (cosmetic). Environment for all items below: local dev, Windows, Chrome, `Frontend folder` on :5173 / `backend` on :3000, MySQL DB at `192.168.1.238:3306`.

## Open bugs (found in this audit, not yet fixed)

**BUG-001 — Appointment checkout silently "succeeds" while the real invoice write fails**
- Module/Feature: Billing / Appointment Checkout
- Description: `Appointments.tsx` calls `confirmOnlyCheckout`/`completeCheckout` (`src/api/billing.ts`) inside a try/catch that only `console.warn`s on failure; the local Context is updated regardless of the API result.
- Steps to Reproduce: 1) Log in. 2) Book/complete an appointment and check out with any payment method. 3) Open browser devtools console. 4) Observe a warning log while the UI shows a success/confetti screen.
- Expected Result: If the invoice cannot be persisted (e.g. migration not applied — currently true, see BUG-002), the user should see a clear error/retry, not a success screen.
- Actual Result: Bill appears completed to staff; nothing is written to the real database.
- Severity: **Critical** (silent data loss — a real business would lose revenue records) · Priority: **P0**
- Screens/Page: `Appointments.tsx` checkout dialog, `FinanceReceiptsModule.tsx` collect-payment flow
- API: `POST /billing/confirm-only`, `POST /billing/checkout`, `POST /billing/:id/collect`
- Suggested Fix: Surface API failures in the UI (toast/blocking error) and don't show the success screen until the API call actually succeeds, or explicitly label local-only saves as "not yet synced."
- Status: **Open — New**

**BUG-002 — Billing and Plans APIs fail against the live database (unapplied migrations)**
- Module/Feature: Billing, Membership & Loyalty
- Description: `npx prisma migrate status` (run 2026-07-07) reports 2 migrations present as files but not applied: `20260707140000_invoice_payment_balance`, `20260707160000_salon_plans`.
- Steps to Reproduce: `cd backend && npx prisma migrate status`
- Expected Result: All migrations applied; billing/plans endpoints work.
- Actual Result: Endpoints throw/fail at the DB layer (missing columns/tables).
- Severity: **Critical** · Priority: **P0**
- API: all `/billing/*` and `/plans/*` endpoints
- Suggested Fix: `npx prisma migrate deploy` from `backend/`. One command, zero new code.
- Status: **Open — New**

**BUG-003 — "Add Customer" form does not persist the customer**
- Module/Feature: Customer Management
- Description: `NewCustomer.tsx`'s submit handler navigates to `/customers` without writing to any Context or seed array.
- Steps to Reproduce: 1) Go to Customers → Add New. 2) Fill valid data, submit. 3) Return to the customer directory.
- Expected Result: New customer appears in the list.
- Actual Result: Customer directory is unchanged; data is silently discarded.
- Severity: **High** (feature appears to work but doesn't) · Priority: **P1**
- Screens/Page: `NewCustomer.tsx`, `Customers.tsx`
- Suggested Fix: Wire the form to a `CustomersContext` (needs to be created — no such context currently exists) or a real API once built.
- Status: **Open — New**

**BUG-004 — No route guard on the authenticated app shell**
- Module/Feature: Authentication
- Description: `RequireAuth.tsx` is fully implemented (redirects to `/landing` if not authenticated) but is never imported by `routes.tsx` or any other file.
- Steps to Reproduce: 1) Clear localStorage / log out. 2) Navigate directly to `http://localhost:5173/` or `/customers`.
- Expected Result: Redirect to `/landing` or `/login`.
- Actual Result: The full app shell renders with no auth check.
- Severity: **Critical** (security) · Priority: **P0**
- Suggested Fix: Wrap the app-shell route element in `<RequireAuth>` in `routes.tsx`.
- Status: **Open — New**

**BUG-005 — Role-based permissions defined but never enforced**
- Module/Feature: Authentication / Administration
- Description: Frontend `SettingsContext.permissions` (role×module matrix) and `RoleContext`, plus backend `authorize()`/`requireManager` middleware, all exist but are not consulted anywhere — `EnterpriseSidebar`'s `filteredNav` is a no-op passthrough despite its name, and every mounted backend route only checks `authenticate` (valid login), never role.
- Steps to Reproduce: Log in as any role (or with any valid account) and access any in-scope page/action.
- Expected Result: Receptionist role, e.g., should not see financial settings or be able to hit manager-only endpoints.
- Actual Result: All authenticated users have identical access.
- Severity: **High** · Priority: **P1**
- Suggested Fix: See Task T-01.7/T-01.8.
- Status: **Open — New**

**BUG-006 — `Branches.tsx` has a missing icon import**
- Module/Feature: Multi-Branch (orphaned page)
- Description: File defines an inline `Scissors` SVG with a `// Missing import` comment instead of importing from `lucide-react` like every other page.
- Severity: **Low** (page is unrouted/dead code, so currently unreachable) · Priority: **P3**
- Suggested Fix: Either delete the file (it's dead code) or fix the import if the page is ever restored.
- Status: **Open — New**

**BUG-007 — Dead navigation links to removed routes**
- Module/Feature: Profile / Help & Support
- Description: `MyProfile.tsx` has a quick-action link to `/settings`; `HelpSupport.tsx` has a quick-topic tile to `/employees` and FAQ copy referencing "Employees"/"Reports" workflows — all of these routes redirect to `/` per the v1 descope.
- Steps to Reproduce: Go to My Profile → click the Settings quick action, or Help & Support → click the Employees tile.
- Expected Result: Either the link is removed, or it goes somewhere real.
- Actual Result: User is silently bounced to the Dashboard with no explanation.
- Severity: **Medium** · Priority: **P2**
- Suggested Fix: Remove these links/FAQ references now that the underlying pages are permanently gone.
- Status: **Open — New**

**BUG-008 — Two disconnected Membership implementations**
- Module/Feature: Membership & Loyalty
- Description: `Memberships.tsx` shows hardcoded Platinum/Gold/Silver/Basic tiers with static member data; the real backend (`SalonPlan`/`CustomerPlanEnrollment`, 5 working endpoints) is only called from `FinanceReceiptsModule.tsx`'s Memberships sub-tab — a different UI surface entirely.
- Expected Result: One source of truth for membership plans, visible consistently across the app.
- Actual Result: A manager could create a real plan via Finance → Memberships and never see it reflected on the main `Memberships.tsx` page, or vice versa.
- Severity: **Medium** (confusing, not yet data-lossy since neither is production-critical) · Priority: **P2**
- Suggested Fix: See Task T-08.4.
- Status: **Open — New**

**BUG-009 — UPI merchant VPA unverified**
- Module/Feature: Billing / UPI Payment
- Description: The QR code encodes `billvyapp@ybl` as the payee VPA; nothing in the codebase confirms this is a real, registered merchant ID.
- Severity: **High** (if unregistered, every real customer payment attempt fails at the point of sale) · Priority: **P1**
- Suggested Fix: Confirm with the client/payment processor before any live demo or production use.
- Status: **Open — New**

**BUG-010 — No automated tests anywhere**
- Module/Feature: Cross-cutting
- Description: Zero `*.test.*`/`*.spec.*` files in frontend or backend; no test script in `backend/package.json`.
- Severity: **Medium** (no regression safety net, compounds risk of every other bug recurring silently) · Priority: **P1**
- Suggested Fix: See Task T-99.1.
- Status: **Open — New**

## Resolved bugs (fixed in prior sessions — carried forward for audit trail, per `OPENPROJECT_WORKPACKAGE_UPDATE.md`)

| Bug | Module | Root Cause | Resolution | Status |
|---|---|---|---|---|
| Duplicate close (×) buttons on ~17 dialogs (Inventory/Services/Feedback/Customers/Vendors/Coupons) | Shared UI | `DialogContent` auto-renders a default close button; several screens also added a custom one without suppressing the default | Suppression class added; default close button restyled | Closed |
| New appointments/walk-ins prepended instead of appended, breaking booking order | Appointments | Merge logic used `[newOnes[0], ...prev]` — also only merged the first of multiple new bookings | Rewrote to append + sort by status-rank then booking-order id | Closed |
| Walk-ins booked via "New Appointment" never appeared in the Walk-ins tab | Appointments | Merge logic didn't route by `type` | Routed by `type` on merge | Closed |
| `Notifications` panel "View all" linked to `/reports` instead of `/notifications` | Notifications | Stale link from pre-descope routing | Fixed link target | Closed |
| `LoginPage.tsx` / `SignUpPage.tsx` found completely empty (0 bytes) → blank white screen, no console errors | Auth | Unknown/unconfirmed (no git history at root to blame); recurred at least twice | Rebuilt both from scratch, matching `ForgotPasswordPage.tsx` styling, wired to real `authService` | Closed (recommend adding git version control at the project root as a preventive measure — currently not a git repo) |
| `prisma migrate status` reported a pending migration that already existed in the DB (drift) | Backend/DB | Partial/manual prior migration run desynced Prisma's tracking table | `npx prisma migrate resolve --applied` instead of re-running SQL | Closed |
