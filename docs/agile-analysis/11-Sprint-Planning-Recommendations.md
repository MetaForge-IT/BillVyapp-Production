# Sprint Planning Recommendations

Assumes 2-week sprints, ordered by leverage (impact ÷ effort), not by epic order. Effort estimates from `05-Task-Backlog.md`.

## Sprint 0 (0.5–1 day — do this before Sprint 1 even starts)
Pure unblocking, zero feature work, highest ROI in the entire backlog:
1. T-04.5 / T-08.1 — Apply the 2 pending Prisma migrations (`npx prisma migrate deploy`). Unblocks 9+ endpoints across Billing and Plans instantly.
2. T-01.6 — Wire `RequireAuth.tsx` into `routes.tsx` (BUG-004, security-critical, one-line change).
3. BUG-009 — Confirm with the client whether `billvyapp@ybl` is a real registered UPI VPA before any live demo.
4. GAP-12 — `git init` at the project root.

## Sprint 1 — Make Billing trustworthy
Billing has the most backend investment; make it actually safe to rely on before building more on top of it.
- T-04.6 — Surface checkout API failures visibly instead of silently swallowing them (BUG-001).
- Re-run TC-P05, TC-B07, TC-M01, TC-M02 (currently Blocked/Failed) now that migrations are applied — confirm real persistence end-to-end.
- T-03.2 — Fix `NewCustomer.tsx` to persist (needs a `CustomersContext`, currently missing entirely — smallest viable version: extend local context, defer full API).
- BUG-007 — Remove dead links to `/settings`/`/employees`.

## Sprint 2 — First real backend module beyond Auth/Billing/Plans
Pick **Customers** first — every other domain (Appointments, Billing) references customer data, so a real Customer API unblocks the most downstream work.
- T-03.3 — Customer CRUD API (list/create/update/soft-delete), following the `billing`/`plans` module pattern (controller/service/repository/validators/constants).
- Wire `Customers.tsx` and `NewCustomer.tsx` to the new API, replacing local seed dependency.
- T-99.1 (start) — stand up Vitest for backend, write tests for the new Customer module as the first real coverage in the project.

## Sprint 3 — Appointments backend
- T-04.4 — Appointment CRUD API.
- Wire `NewAppointment.tsx`/`Appointments.tsx` to it.
- Re-verify FIFO queue behavior server-side once appointments are DB-backed (currently only verified client-side).

## Sprint 4 — Security & RBAC hardening
By now the app has real persisted data in 3+ domains, which is exactly when access-control gaps (GAP-05) become dangerous rather than theoretical.
- T-01.7 / T-01.8 — Enforce backend `authorize()`/`requireManager` and wire frontend `RoleContext`/`SettingsContext.permissions` into actual gating.
- T-01.3 — Configure SMTP (unblocks 3 auth flows — can be pulled forward to any sprint with spare capacity; it's independent of everything else).

## Parallel/anytime work (no dependencies, fits any sprint with spare capacity)
- T-99.3 — Remove/archive orphaned dead pages.
- T-99.4 — Fix `Branches.tsx` missing import (or delete with the rest of orphaned code).
- T-99.2 — Add `tsconfig.json` + typecheck gate.
- BUG-008 / T-08.4 — Reconcile the two Membership implementations.

## Sequencing rationale
Services and Inventory backends are intentionally placed after Customers/Appointments even though their UI is equally mature, because nothing else in the app *depends* on them the way Billing depends on Customers+Appointments+Services pricing data. If the team has more parallel capacity, Services/Inventory backends can run concurrently with Sprint 2/3 as a second track.
