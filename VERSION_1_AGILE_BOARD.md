# BillVyapp — Version 1 Agile Workflow Board (Page-by-Page)

> Companion to `VERSION_1_OVERVIEW.md` (architecture/scope) and `VERSION_1_FEATURE_TRACKER.md` (flat module checklist). This document reviews the app **one page at a time**, tracking each feature as a Frontend story and a Backend story separately — the way a real sprint board would — since in this codebase those two are very often at different stages. Last verified against the actual code: 2026-07-07.

## Status vocabulary (Kanban columns)

| Status | Meaning |
|---|---|
| 🔵 **Backlog** | Planned, not started |
| 🟠 **To Do** | Scoped and ready to pick up |
| 🟡 **In Progress** | Actively being built / partially working |
| 🟣 **In Review / QA** | Built and functions in the browser, not yet verified end-to-end or not backend-integrated |
| 🔴 **Blocked** | Built, but can't run due to an external dependency (missing migration, missing credentials, etc.) |
| ✅ **Done** | Complete, verified, and working end-to-end (UI + backend + persisted) |

---

## Sprint board summary (page-level rollup)

| Page | Frontend | Backend | Overall |
|---|---|---|---|
| Landing / Login / Signup / Forgot / Reset Password | ✅ Done | ✅ Done (auth) / 🔴 Blocked (email-dependent flows) | 🟣 In Review |
| Dashboard | 🟣 In Review | 🔵 Backlog | 🟣 In Review |
| Customers | 🟣 In Review | 🔵 Backlog | 🟣 In Review |
| Appointments | 🟣 In Review | 🔵 Backlog | 🟣 In Review |
| Services | 🟣 In Review | 🔵 Backlog | 🟣 In Review |
| Billing / Finance | 🟣 In Review | 🔴 Blocked | 🔴 Blocked |
| Inventory | 🟣 In Review | 🔵 Backlog | 🟣 In Review |
| Memberships / Plans | 🟣 In Review | 🔴 Blocked | 🔴 Blocked |
| Feedback | 🟣 In Review | 🔵 Backlog | 🟣 In Review |
| Notifications | 🟣 In Review | 🔵 Backlog | 🟣 In Review |
| Profile / Help | 🟣 In Review | 🔵 Backlog | 🟣 In Review |

---

## 1. Landing / Login / Signup / Forgot Password / Reset Password

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| Landing (marketing) page | ✅ Done | — (static) | ✅ Done | |
| Login form | ✅ Done | ✅ Done | ✅ Done | Verified live: real JWT issued, redirects to Dashboard |
| Signup form | ✅ Done | ✅ Done | 🔴 Blocked | Registration API works, but the account can't be verified/logged into afterward (see below) |
| Email verification (link + OTP) | 🟣 In Review | ✅ Done (code) | 🔴 Blocked | No SMTP configured — verification email can never be sent for a real signup |
| Resend verification | 🟣 In Review | ✅ Done (code) | 🔴 Blocked | Same SMTP blocker |
| Forgot password | 🟣 In Review | ✅ Done (code) | 🔴 Blocked | Same SMTP blocker |
| Reset password | ✅ Done | ✅ Done | ✅ Done | Works once a valid reset token exists — token delivery is what's blocked |
| Demo login (workaround) | ✅ Done | ✅ Done | ✅ Done | `demo@starrkuts.com` / `Demo@1234`, seeded pre-verified — the only login path guaranteed to work today |
| Session refresh / logout | ✅ Done | ✅ Done | ✅ Done | |

**Sprint note:** the one blocking dependency across this entire page group is a single item — **SMTP credentials**. Unblocking that unblocks 3 features at once.

---

## 2. Dashboard

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| KPI tiles (revenue, appointments, customers, staff, satisfaction) | ✅ Done | 🔵 Backlog | 🟣 In Review | Mock numbers, no dashboard API exists |
| Revenue & appointment trend charts | ✅ Done | 🔵 Backlog | 🟣 In Review | Mock data |
| Today's schedule widget | ✅ Done | 🔵 Backlog | 🟣 In Review | Mock data |
| Critical alerts widget | ✅ Done | 🔵 Backlog | 🟣 In Review | Mock data |
| "New Appointment" quick action | ✅ Done | n/a | ✅ Done | Navigates to real booking flow |

---

## 3. Customers

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| Customer directory (search/filter) | ✅ Done | 🔵 Backlog | 🟣 In Review | Local seed data (`Customer` table exists in schema, no API yet) |
| Add new customer | ✅ Done | 🔵 Backlog | 🟣 In Review | Form works, doesn't persist |
| Customer detail (loyalty, visit history) | ✅ Done | 🔵 Backlog | 🟣 In Review | Mock |
| Notify customer (WhatsApp/SMS) | ✅ Done | 🔴 Blocked | 🔴 Blocked | SMS/WhatsApp providers coded but disabled |
| Birthday coupon bulk send | ✅ Done | 🔵 Backlog | 🟣 In Review | UI simulation only |
| Send coupon to customer | ✅ Done | 🔵 Backlog | 🟣 In Review | |

---

## 4. Appointments

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| Book appointment (customer → services → confirm) | ✅ Done | 🔵 Backlog | 🟣 In Review | 3-step flow, verified working, not persisted |
| Walk-in booking | ✅ Done | 🔵 Backlog | 🟣 In Review | Same flow, `type: "walk-in"` |
| Staff auto-assignment | ✅ Done | n/a | ✅ Done | Manual picker intentionally removed; defaults to first staff member |
| Status flow (Waiting → In Progress → Completed) | ✅ Done | 🔵 Backlog | 🟣 In Review | Real client-side state machine |
| FIFO queue sorting | ✅ Done | 🔵 Backlog | 🟣 In Review | Sort logic verified correct by hand-trace (status rank + booking-order id); no backend to match against |
| Bill an appointment | ✅ Done | 🔴 Blocked | 🔴 Blocked | Calls real checkout API, currently fails against un-migrated DB (tolerated gracefully — UI still completes locally) |
| Notify customer (templates, WhatsApp/SMS) | ✅ Done | 🔴 Blocked | 🔴 Blocked | Same SMS/WhatsApp blocker as Customers page |
| Edit walk-in modal | ✅ Done | 🔵 Backlog | 🟣 In Review | |

---

## 5. Services

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| Service catalog (list/add/edit, category + gender filters) | ✅ Done | 🔵 Backlog | 🟣 In Review | `Service`/`ServiceCategory` tables exist, no API |
| Bulk upload services (.xlsx/.csv) | ✅ Done | 🔵 Backlog | 🟣 In Review | Parse/validate/preview verified working; import is local-only |
| Packages tab | ✅ Done | 🔵 Backlog | 🟣 In Review | |
| Coupons tab | 🔴 Blocked (intentional) | 🔵 Backlog | 🚫 Out of scope | Route gated — hidden from nav, redirects to Dashboard. Code intact, one-line revert to restore. |
| Incentive Settings (staff commission) | 🚫 Removed | n/a | 🚫 Out of scope | Removed from this page per explicit request |

---

## 6. Billing / Finance

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| Receipts register (Sales) | ✅ Done | 🔴 Blocked | 🔴 Blocked | Local `ReceiptsContext`; real `Invoice` API exists but blocked by pending migration |
| Confirm-only checkout (bill now, pay later) | ✅ Done | 🔴 Blocked | 🔴 Blocked | `POST /billing/confirm-only` built, migration `invoice_payment_balance` not applied |
| Complete-payment checkout | ✅ Done | 🔴 Blocked | 🔴 Blocked | `POST /billing/checkout` built, same migration blocker |
| Collect payment on pending invoice | ✅ Done | 🔴 Blocked | 🔴 Blocked | `POST /billing/:invoiceId/collect` built, same blocker |
| List pending invoices | ✅ Done | 🔴 Blocked | 🔴 Blocked | `GET /billing/pending` built, same blocker |
| Payment methods (Cash/Card/UPI/Wallet/Split) | ✅ Done | n/a | 🟣 In Review | Card = manual ref field, no real gateway |
| UPI QR code | ✅ Done | n/a | ✅ Done | Real scannable QR, live amount — verify `billvyapp@ybl` is a real VPA |
| GST calculation | ✅ Done | n/a | ✅ Done | Client-side calc, correct math, manual on/off toggle |
| Coupon / gift card / loyalty redemption at billing | ✅ Done | 🔵 Backlog | 🟣 In Review | |
| **Advance payments — collect** | ✅ Done | 🔵 Backlog | 🟣 In Review | Built this session (`AdvancesContext`); fully functional, no DB table |
| **Advance payments — auto-apply at billing** | ✅ Done | 🔵 Backlog | 🟣 In Review | Verified by hand-trace; deducts balance correctly in-session |
| Refunds register + PIN approval | ✅ Done | 🔵 Backlog | 🟣 In Review | Demo PIN `1234` |

**Sprint note:** this page has the most backend code written of any page in the app, and also the most blocked functionality — **applying the 2 pending migrations is the single highest-leverage next task** in the whole project.

---

## 7. Inventory

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| Product catalog + stock levels | ✅ Done | 🔵 Backlog | 🟣 In Review | `Product` table exists, no API |
| Low-stock / out-of-stock alerts | ✅ Done | 🔵 Backlog | 🟣 In Review | |
| Bulk upload products (new + restock modes) | ✅ Done | 🔵 Backlog | 🟣 In Review | Parse/validate/preview verified working |
| Vendors | ✅ Done | 🔵 Backlog | 🟣 In Review | |
| Purchase orders | ✅ Done | 🔵 Backlog | 🟣 In Review | |
| Manual stock adjustment | ✅ Done | 🔵 Backlog | 🟣 In Review | |

---

## 8. Memberships / Plans

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| Membership tier display | ✅ Done | 🔵 Backlog | 🟣 In Review | Placeholder pricing — needs real client tiers |
| Plans backend — create plan | n/a | ✅ Done (code) | 🔴 Blocked | `POST /plans` built, migration `salon_plans` not applied |
| Plans backend — enroll customer | n/a | ✅ Done (code) | 🔴 Blocked | `POST /plans/enrollments` built, same blocker |
| Plans backend — list plans/enrollments/services/customers | n/a | ✅ Done (code) | 🔴 Blocked | 4 GET endpoints built, same blocker |
| Frontend wired to Plans API | 🔵 Backlog | — | 🔵 Backlog | No page currently calls the Plans endpoints — they exist server-side only so far |

---

## 9. Feedback

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| Feedback list + detail view | ✅ Done | 🔵 Backlog | 🟣 In Review | `Feedback` table exists, no API |
| Request feedback (send review link) | ✅ Done | 🔴 Blocked | 🔴 Blocked | No real review platform / SMS-WhatsApp connected |

---

## 10. Notifications

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| In-app bell + unread badge | ✅ Done | 🔵 Backlog | 🟣 In Review | `Notification` table exists, no API |
| Notification panel (mark read/all read) | ✅ Done | 🔵 Backlog | 🟣 In Review | |
| Full notifications page | ✅ Done | 🔵 Backlog | 🟣 In Review | |
| Role-filtered notification feed | ✅ Done | 🔵 Backlog | 🟣 In Review | |
| SMS notifications | 🔵 Backlog | 🔴 Blocked | 🔴 Blocked | Providers coded, disabled by config |
| WhatsApp notifications | 🔵 Backlog | 🔴 Blocked | 🔴 Blocked | Providers coded, disabled by config |
| Email notifications | 🔵 Backlog | 🔴 Blocked | 🔴 Blocked | SMTP blocker |

---

## 11. Profile / Help

| Feature | Frontend | Backend | Overall | Notes |
|---|---|---|---|---|
| My Profile page | ✅ Done | 🔵 Backlog | 🟣 In Review | Static display, no edit-and-save-to-API yet |
| Help & Support page | ✅ Done | n/a | ✅ Done | Static content page |
| Header profile dropdown (avatar/name/role → My Profile / Help / Sign Out) | ✅ Done | n/a | ✅ Done | Currently in the header |
| Move profile menu to sidebar bottom | 🟠 To Do | n/a | 🟠 To Do | Requested, scoped, not started |

---

## Removed from v1 scope (not tracked as backlog — deleted intentionally)

Employees · Reports/Analytics · Marketing · CEO Dashboard · AI Insights · Settings/Administration — 🚫 code no longer exists in the repo.

---

## Suggested next sprint (highest leverage first)

1. **Apply the 2 pending Prisma migrations** (`invoice_payment_balance`, `salon_plans`) — unblocks 9+ features across Billing and Plans instantly, zero new code required.
2. **Configure SMTP** — unblocks email verification, resend, and forgot-password (3 features, 1 dependency).
3. **Move profile menu to sidebar** — small, scoped, already-requested UI task.
4. **Decide next backend module** — Customers, Appointments, Services, or Inventory are the biggest "In Review, zero backend" pages; picking one turns the most 🟣 rows into ✅ per sprint.
