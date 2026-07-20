# Gap Analysis Report

## GAP-01 — No backend module exists for 8 of 11 in-scope business domains
Customers, Appointments, Services/Packages, Inventory/Vendors/Purchase Orders, Coupons, Notifications, Feedback, and Salon Settings have Prisma models but **no controller/service/repository at all** — not "built but disconnected," genuinely absent. This is the single largest gap in the project.
- Recommendation: Prioritize Appointments and Customers first (they're prerequisites for Billing to have real data to bill against), then Services/Inventory. Use the existing `billing`/`plans` module structure (controller/service/repository/validators/constants) as the template — it's a good, repeatable pattern already proven in this codebase.

## GAP-02 — Two fully-coded backend modules are non-functional due to 2 unapplied migrations
`billing` and `plans` are the most mature backend code in the repo, yet neither works today. This is not a missing-feature gap, it's a **deployment gap** — the fix is `npx prisma migrate deploy`, no development work required.
- Recommendation: Apply immediately; re-run the Billing/Plans test cases in `07-Test-Cases.md` (currently marked Blocked/Failed) to confirm.

## GAP-03 — Silent failure masks broken persistence (data integrity gap, not just a missing feature)
Every real API call from the frontend (`billing.ts`, `plans.ts`) is wrapped in try/catch that swallows failures with only a console warning. Staff-facing UI shows success regardless. This means **the gap above (GAP-02) is currently invisible to end users**, which is worse than the API simply not existing — it creates false confidence that bills are recorded.
- Recommendation: Treat as P0. Add visible error handling before treating Billing as "done" even after migrations are applied.

## GAP-04 — Duplicate/inconsistent Membership implementation
A real Plans API exists and works (once GAP-02 is fixed) but is only wired into `FinanceReceiptsModule.tsx`'s Memberships sub-tab. The primary `/memberships` page (`Memberships.tsx`) is a completely separate, hardcoded UI with no relationship to the real data.
- Recommendation: Decide on one source of truth and retire the other; see Task T-08.4.

## GAP-05 — No RBAC enforcement despite full RBAC design existing
Both frontend (`SettingsContext.permissions`, `RoleContext`) and backend (`authorize()`, `requireManager`) have complete role-permission scaffolding that is never invoked. Combined with GAP-06, this means **the app currently has no meaningful access control at all** beyond "is logged in."
- Recommendation: Wire both sides before any multi-staff production rollout — this is a security gap, not a feature gap.

## GAP-06 — No route guard on the authenticated app shell
`RequireAuth.tsx` exists, fully implemented, and is never imported. The app is reachable without logging in.
- Recommendation: One-line fix (wrap the app-shell route). Should ship before GAP-05 even needs to matter, since right now roles are moot when auth itself isn't gated.

## GAP-07 — SMTP not configured; blocks 3 auth flows
Self-registration, resend-verification, and forgot-password are all dead ends for any non-seeded user.
- Recommendation: Configure a transactional email provider (SendGrid/SES/Postmark/etc.) — the `email` module already supports arbitrary SMTP, so this is a config task, not a code task.

## GAP-08 — SMS/WhatsApp providers coded but disabled
Every "Notify Customer" action across Customers, Appointments, and Feedback modules is a simulated success. Real provider code (MSG91/Twilio/Textlocal; Meta/360dialog/Twilio) exists and is disabled purely by `.env` flags and missing credentials.
- Recommendation: Business decision needed on which provider/vendor to activate; then it's a config task.

## GAP-09 — No payment gateway integration
"Card" payment is a manual reference-number field; there is no Razorpay/Stripe/PayPal (or India-specific gateway) integration anywhere in the codebase. UPI is real (QR/deep-link) but its merchant VPA is unverified (BUG-009).
- Recommendation: If online/card-present payment settlement is a real v1 requirement, this is currently 0% built and should be scoped as a new Epic, not assumed to exist because UPI does.

## GAP-10 — Zero automated test coverage
No test files, no test runner configured, no CI gate implied by `package.json` scripts in either frontend or backend.
- Recommendation: Establish a baseline (Vitest for both, given Vite is already the frontend build tool) before adding more backend modules — every new module built without tests compounds this debt.

## GAP-11 — No real typecheck gate on the frontend
No root `tsconfig.json`; `npm run build` is `vite build` (esbuild transpile only). Type errors can ship silently.
- Recommendation: Add `tsconfig.json` + a `tsc --noEmit` script, wire into CI if/when CI exists.

## GAP-12 — Repo root is not under version control
The project root (`C:\Users\Harish\Desktop\salonproject`) is not a git repository. This directly explains why the `LoginPage.tsx`/`SignUpPage.tsx` 0-byte-file incident (Bug Backlog, resolved) had no history to recover from and could recur silently.
- Recommendation: `git init` at the root (excluding `node_modules`, `.env`) — low effort, meaningfully reduces risk of unrecoverable data loss on source files.

## GAP-13 — Dead/orphaned code inflates perceived scope
`Invoices.tsx`, `Payments.tsx`, `Orders.tsx`, `Branches.tsx`, and 5 `Accounting*.tsx` pages are fully-built but 100% unrouted — they will confuse any new engineer or auditor into thinking more is "built" than actually ships to a user.
- Recommendation: Delete, or move to a clearly-labeled `_archive/` folder outside `src/`, so `src/app/pages/` only contains reachable code.

## GAP-14 — Missing validations/permissions/notifications/reports not yet built (per audit brief categories)
| Category | Gap |
|---|---|
| Missing functionality | Public/customer-facing booking; payment gateway; branch management; employee scheduling/attendance/incentives; reports/analytics of any kind |
| Incomplete workflows | Appointment→Invoice→Payment chain breaks at the DB layer (GAP-02); Membership plan creation has no update/delete endpoint despite a validator existing for it |
| Missing validations | No server-side validation exists at all for Customer/Appointment/Service/Inventory domains (client-only) since there's no backend to validate against |
| Missing permissions | See GAP-05 |
| Missing APIs | See GAP-01 |
| Missing UI components | Settings/Administration UI (data model exists, no UI); Edit-profile-and-save UI |
| Missing reports | All — Reports/Analytics module was removed entirely, and Dashboard has no real aggregation query behind it |
| Missing notifications | Real email/SMS/WhatsApp delivery (GAP-07/08); Notification CRUD API |
| Missing integrations | Payment gateway (GAP-09); any external calendar/booking integration |
