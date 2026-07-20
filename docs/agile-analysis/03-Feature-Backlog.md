# Feature Backlog

Each Feature is scoped to a concrete page/component so it traces directly to code. Status vocabulary as defined in `00-README.md`.

## EPIC-01 Authentication & Account Security
| Feature | Source | Status |
|---|---|---|
| Salon Registration | `SignUpPage.tsx` → `POST /auth/register` | Functional (creates DB row) but leads to a dead end — see Email Verification |
| Login | `LoginPage.tsx` → `POST /auth/login` | Functional |
| Session Refresh | `axios.ts` interceptor → `POST /auth/refresh` | Functional |
| Logout / Logout-all | `EnterpriseSidebar.tsx` → `POST /auth/logout`, `/logout-all` | Functional |
| Email Verification (link + OTP) | `POST/GET /auth/verify-email` | Blocked (no SMTP) |
| Resend Verification | `POST /auth/resend-verification` | Blocked (no SMTP) |
| Forgot Password | `ForgotPasswordPage.tsx` | Blocked (no SMTP) |
| Reset Password | `ResetPasswordPage.tsx` → `POST /auth/reset-password` | Functional once a token exists; token delivery is blocked |
| Demo/Seeded Login | `backend/prisma/seed.ts` | Functional (workaround only) |
| Route-level Auth Guard | `RequireAuth.tsx` | Bug Found — component built, never wired into any route; app has no login gate |
| Role-based Access Control | `RoleContext`, `SettingsContext.permissions`, `auth.middleware.ts` (`requireManager`, `authorize`) | Bug Found — defined on both frontend and backend, enforced nowhere |

## EPIC-02 Dashboard
| Feature | Source | Status |
|---|---|---|
| KPI Tiles (revenue/appointments/customers/staff/satisfaction) | `KpiGrid` | UI Completed (mock data) |
| Revenue & Appointment Trend Charts | `RevenueInsights` (Recharts) | UI Completed (mock data) |
| Today's Schedule Widget | `TodaySchedule` | UI Completed (mock data) |
| Critical Alerts Widget | `CriticalAlerts` | UI Completed (mock data) |
| Quick Action → New Appointment | `DashboardHeader` | Functional (navigation only) |

## EPIC-03 Customer Management
| Feature | Source | Status |
|---|---|---|
| Customer Directory (search/filter/grid-list toggle) | `Customers.tsx` | UI Completed |
| Add Customer | `NewCustomer.tsx` | Bug Found — form submits but does not persist to any store |
| Edit Customer | `Customers.tsx` edit dialog | UI Completed (local only) |
| Customer 360° Detail View (overview/history/loyalty/preferences) | `CustomerDetailView` | UI Completed |
| Bulk Select + Bulk Coupon Send | `Customers.tsx` | UI Completed (simulated send) |
| Single-customer Coupon Send | `CustomersCommModals.tsx` | UI Completed (simulated) |
| Notify Customer (WhatsApp/SMS) | `CustomersCommModals.tsx` | Blocked (providers disabled) |
| Loyalty Points Redeem / Purchase Membership Dialog | `Customers.tsx` | UI Completed (local math only) |
| Customer CRUD API | none | Not Started |

## EPIC-04 Appointment Management
| Feature | Source | Status |
|---|---|---|
| Book Appointment (3-step wizard) | `NewAppointment.tsx` | UI Completed |
| Walk-in Booking | `NewAppointment.tsx` (visit-type toggle) | UI Completed |
| Appointment Calendar/Timeline View | `Appointments.tsx` | UI Completed |
| Queue (FIFO ordering) | `Appointments.tsx` | Functional (status-rank + booking-order sort verified correct) |
| Status Transitions (Waiting→In Progress→Completed/Cancelled/No-show) | `AppointmentContext.updateStatus` | Functional (local state machine) |
| Edit/Delete/Cancel Appointment | `Appointments.tsx` dialogs | UI Completed |
| Extra Services Modal | `Appointments.tsx` | UI Completed |
| Notify Customer (templates) | `Appointments.tsx` | Blocked (providers disabled) |
| Appointment Checkout (Confirm-only / Complete) | `Appointments.tsx` → `billing.ts` | Blocked (migration unapplied) |
| Direct Bill / POS walk-in with inline customer creation | `Appointments.tsx` | UI Completed |
| Appointment CRUD API | none | Not Started |
| Public/customer-facing booking | none | Not Started |
| Real-time stylist availability engine | none | Not Started |

## EPIC-05 Billing / Point of Sale
| Feature | Source | Status |
|---|---|---|
| Itemized Billing (services/products/combos tabs) | `Appointments.tsx` checkout dialog | UI Completed |
| GST Toggle + Custom Rate | same | Functional (client-side calc) |
| Coupon / Gift Card / Loyalty Redemption at Billing | same | UI Completed (local) |
| Split Payment (cash/card/UPI/wallet) | same | UI Completed |
| UPI QR Code Generation | `qrcode.react` | Functional (real deep-link, unverified merchant VPA) |
| Advance Payment — Collect | `AdvancesContext`, `FinanceReceiptsModule.tsx` | UI Completed, no DB table |
| Advance Payment — Auto-apply at Billing | same | Functional (local) |
| Receipts Register (search/filter/view/email/print) | `Receipts.tsx` | UI Completed (simulated email/print) |
| Refunds + PIN Approval | `FinanceReceiptsModule.tsx` (`RefundsTab`) | UI Completed (demo PIN 1234) |
| Pending Payments List/Collect | `FinanceReceiptsModule.tsx` (`PendingTab`) | Blocked (API fails, falls back to local) |
| Invoice Creation API (`confirm-only`, `checkout`) | `backend/src/modules/billing/` | Backend Completed, Blocked (migration) |
| Collect Payment API | `POST /billing/:id/collect` | Backend Completed, Blocked (migration) |
| List Pending Invoices API | `GET /billing/pending` | Backend Completed, Blocked (migration) |
| Payment Gateway Integration (online card/UPI settlement) | none | Not Started |

## EPIC-06 Service Catalog & Pricing
| Feature | Source | Status |
|---|---|---|
| Service List (search/gender/category filters) | `Services.tsx` | UI Completed |
| Add/Edit Service | `Services.tsx` dialogs | UI Completed |
| Bulk Upload Services (.xlsx/.csv) | `Services.tsx` | UI Completed (parse/validate/preview verified; import local-only) |
| Packages Tab | `Packages.tsx` | UI Completed |
| Pricing Tab (gender-based, member pricing) | `Pricing.tsx` | UI Completed |
| Coupons Tab/CRUD | `CouponsSection.tsx` | UI Completed (gated at `/coupons` route level, reachable as sub-tab) |
| Service-Product Link (BOM) | `ServiceProductsContext` | UI Completed |
| Service/Package/Coupon CRUD API | none | Not Started |

## EPIC-07 Inventory Management
| Feature | Source | Status |
|---|---|---|
| Stock List + Levels | `Inventory.tsx` | UI Completed |
| Low-stock / Out-of-stock Alerts + Reorder Modal | `Inventory.tsx` | UI Completed |
| Add Product / Manual Stock Adjust (set/add/subtract + reason) | `Inventory.tsx` | UI Completed (with audit log) |
| Bulk Upload Products (new + restock modes) | `Inventory.tsx` | UI Completed (parse/validate/preview verified) |
| Vendors (add/view/deactivate) | `Vendors.tsx` | UI Completed |
| Purchase Orders (create/ship/deliver/delete) | `Inventory.tsx` | UI Completed |
| Usage Log | `Inventory.tsx` | UI Completed |
| Product/Vendor/PO CRUD API | none | Not Started |
| Auto stock deduction on appointment completion | `ProductsContext.deductBySku/deductByName` | Functional (local only) |

## EPIC-08 Membership & Loyalty
| Feature | Source | Status |
|---|---|---|
| Membership Tier Display (Platinum/Gold/Silver/Basic) | `Memberships.tsx` | UI Completed (hardcoded, disconnected from real Plans API) |
| Members Table + Points Activity Feed | `Memberships.tsx` | UI Completed (static) |
| Plan Catalog API (list/create) | `backend/src/modules/plans/` | Backend Completed, Blocked (migration) |
| Customer Plan Enrollment API | same | Backend Completed, Blocked (migration) |
| Plan Update/Delete API | `updatePlanSchema` exists, no route/controller | Not Started |
| Wire `Memberships.tsx` to real Plans API | none | Not Started |

## EPIC-09 Feedback & Reviews
| Feature | Source | Status |
|---|---|---|
| Reviews List + Filters (rating/sentiment/reply-status) | `Feedback.tsx` | UI Completed |
| Rating Distribution Chart | `Feedback.tsx` | UI Completed |
| Reply to Review | `Feedback.tsx` | UI Completed (local only) |
| Request Feedback (WhatsApp/SMS/email picker) | `Feedback.tsx` | Blocked (providers disabled) |
| Feedback CRUD API | none | Not Started |

## EPIC-10 Notifications
| Feature | Source | Status |
|---|---|---|
| In-app Bell + Unread Badge | header component | UI Completed |
| Notification Panel (mark read / mark all / dismiss) | `Notifications.tsx` | UI Completed |
| Full Notifications Page (category filter) | `Notifications.tsx` | UI Completed |
| Role-filtered Feed | `RoleContext` | UI Completed (role switch works, but role itself isn't gated by real auth) |
| Email/SMS/WhatsApp Notification Delivery | `email`/`sms`/`whatsapp` backend modules | Backend Completed, Blocked (disabled by config / no SMTP) |
| Notification CRUD API | none | Not Started |

## EPIC-11 Profile & Help
| Feature | Source | Status |
|---|---|---|
| My Profile (view) | `MyProfile.tsx` | UI Completed (read-only) |
| Edit Profile / Save to API | none | Not Started |
| Help & Support (FAQ search, quick topics) | `HelpSupport.tsx` | UI Completed, Bug Found (dead links to `/settings`, `/employees`) |

## EPIC-12–16 Descoped Modules (Reports, Employees, Marketing, CEO Dashboard/AI Insights, Settings)
| Feature | Source | Status |
|---|---|---|
| All features under these epics | none — files removed | Not Started (Descoped) |
| `SettingsContext` (salon profile, RBAC matrix, financial/notification config, security/audit) | `context/SettingsContext.tsx` | Backend Completed (data model only) — dead configuration, no consuming UI |

## EPIC-17 Multi-Branch / Enterprise
| Feature | Source | Status |
|---|---|---|
| Multi-branch dashboard | `Branches.tsx` (orphaned) | Not Started (page exists but is 100% unrouted dead code, contains a real bug) |
| Cross-tenant/branch access model | Prisma schema (`branchId` stray field only) | Not Started |
