# Feature Status Matrix

Per-page audit, as specified: Module | Page | Feature | Status | Backend | API | UI | Validation | Testing | Notes.
Backend/API/UI/Validation columns: ✅ = present & working, 🟡 = present but blocked/partial, ❌ = absent.

| Module | Page | Feature | Status | Backend | API | UI | Validation | Testing | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Auth | LandingPage | Marketing splash | Production Ready | ➖ | ➖ | ✅ | ➖ | Not Tested | Static, intact |
| Auth | LoginPage | Login | Functional | ✅ | ✅ | ✅ | ✅ | Partially Tested | Verified live per prior session |
| Auth | SignUpPage | Registration | Partially Working | ✅ | ✅ | ✅ | ✅ | Partially Tested | Creates DB row; dead-ends at email verification |
| Auth | ForgotPasswordPage | Forgot password | Blocked | ✅ | ✅ | ✅ | ✅ | Not Tested | SMTP not configured |
| Auth | ResetPasswordPage | Reset password | Functional | ✅ | ✅ | ✅ | ✅ | Not Tested | Works once token exists |
| Auth | (app shell) | Route auth guard | Bug Found | ➖ | ➖ | 🟡 (built, unwired) | ➖ | Not Tested | `RequireAuth.tsx` never imported — BUG-004 |
| Dashboard | Dashboard | KPIs/charts/schedule/alerts | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | 100% mock data |
| Customers | Customers | Directory search/filter | UI Completed | ❌ | ❌ | ✅ | ✅ | Not Tested | Local seed, 7 rows |
| Customers | NewCustomer | Add customer | Bug Found | ❌ | ❌ | ✅ | 🟡 | Not Tested | Submits but never persists — BUG-003 |
| Customers | Customers (detail) | 360° view | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | Mock |
| Customers | Customers (comms) | Notify / bulk coupon send | Blocked | 🟡 (coded, disabled) | ❌ | ✅ | ➖ | Not Tested | SMS/WhatsApp disabled |
| Appointments | Appointments | Timeline/Calendar | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | Local `AppointmentContext` |
| Appointments | Appointments | Walk-ins tab | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | |
| Appointments | Appointments | Queue (FIFO) | Functional | ❌ | ❌ | ✅ | ➖ | Passed (hand-traced) | Previously buggy, fixed |
| Appointments | NewAppointment | Booking wizard | UI Completed | ❌ | ❌ | ✅ | ✅ | Not Tested | |
| Appointments | Appointments | Checkout (confirm-only/complete) | **Blocked / Bug Found** | ✅ (code) | 🟡 (fails at runtime) | ✅ | ✅ | Failed | Migration unapplied; failure silently swallowed — BUG-001/002 |
| Appointments | Appointments | Notify customer | Blocked | 🟡 | ❌ | ✅ | ➖ | Not Tested | SMS/WhatsApp disabled |
| Billing/Finance | Finance → Receipts | Receipts register | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | Email/print simulated |
| Billing/Finance | FinanceReceiptsModule | Pending payments / collect | Blocked | ✅ (code) | 🟡 | ✅ | ✅ | Failed | Migration unapplied |
| Billing/Finance | FinanceReceiptsModule | Advances | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | No DB table |
| Billing/Finance | FinanceReceiptsModule | Memberships tab (real Plans API) | Blocked | ✅ (code) | 🟡 | ✅ | ✅ | Failed | Migration unapplied |
| Billing/Finance | FinanceReceiptsModule | Refunds + PIN | UI Completed | ❌ | ❌ | ✅ | ✅ | Not Tested | Demo PIN hardcoded |
| Billing/Finance | Finance | Excluded FinanceAccountingModule | Not Started | ❌ | ❌ | 🟡 (built, unrouted) | ➖ | Not Tested | Explicitly out of v1 scope |
| Services | Services | Catalog/categories | UI Completed | ❌ | ❌ | ✅ | ✅ | Not Tested | |
| Services | Services | Bulk upload | UI Completed | ❌ | ❌ | ✅ | ✅ | Passed (in-browser parse verified) | Local import only |
| Services | Packages/Pricing tabs | Packages & pricing | UI Completed | ❌ | ❌ | ✅ | ✅ | Not Tested | |
| Services | CouponsSection | Coupon CRUD | UI Completed | ❌ | ❌ | ✅ | ✅ | Not Tested | Gated route, reachable as sub-tab |
| Inventory | Inventory | Stock/vendors/PO/usage-log | UI Completed | ❌ | ❌ | ✅ | ✅ | Not Tested | |
| Inventory | Inventory | Bulk upload products | UI Completed | ❌ | ❌ | ✅ | ✅ | Passed (in-browser parse verified) | Local only |
| Inventory | Inventory | Auto stock deduction | Functional | ❌ | ❌ | ✅ | ➖ | Passed (code trace) | Local only |
| Memberships | Memberships | Tier display/points | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | Hardcoded, disconnected from real Plans API — BUG-008 |
| Feedback | Feedback | Review list/reply/chart | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | |
| Feedback | Feedback | Request feedback | Blocked | 🟡 | ❌ | ✅ | ➖ | Not Tested | Providers disabled |
| Notifications | Notifications | Panel/page/role-filter | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | |
| Profile/Help | MyProfile | View profile | UI Completed | ❌ | ❌ | ✅ | ➖ | Not Tested | No edit-save; dead Settings link — BUG-007 |
| Profile/Help | HelpSupport | FAQ/search | Production Ready | ➖ | ➖ | ✅ | ➖ | Not Tested | Dead Employees link — BUG-007 |
| Reports/Employees/Marketing/CEO/AI/Settings | — | All | **Not Started** | ❌ | ❌ | ❌ | ❌ | N/A | Source files removed from repo |
| Multi-Branch | Branches (orphaned) | Branch dashboard | Not Started | ❌ | ❌ | 🟡 (built, unrouted) | ➖ | Not Tested | Has a real bug (missing import), fully dead code |
