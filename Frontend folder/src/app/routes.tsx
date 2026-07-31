import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { RequireAuth } from "./components/layout/RequireAuth";
import { RequireRole } from "./components/layout/RequireRole";
import { ProtectedAppShell } from "./components/layout/ProtectedAppShell";
import { AuthLayout } from "./components/layout/AuthLayout";
import { PublicHome } from "./components/layout/PublicHome";
import { LandingPage } from "./pages/auth/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignUpPage } from "./pages/auth/SignUpPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { Dashboard } from "./pages/Dashboard";
import { Appointments } from "./pages/Appointments";
import { Customers } from "./pages/Customers";
import { Services } from "./pages/Services";
import { Finance } from "./pages/Finance";
import { Inventory } from "./pages/Inventory";
import { Memberships } from "./pages/Memberships";
import { Feedback } from "./pages/Feedback";
import { WalkIn } from "./pages/WalkIn";
import { NewAppointment } from "./pages/NewAppointment";
import { MyProfile } from "./pages/MyProfile";
import { HelpSupport } from "./pages/HelpSupport";
import { Notifications } from "./pages/Notifications";
import { NewCustomer } from "./pages/NewCustomer";
import {
  SuperAdminShell,
  SuperAdminOverviewPage,
} from "./pages/super-admin/SuperAdminShell";
import { SuperAdminFranchisesPage } from "./pages/super-admin/SuperAdminFranchisesPage";
import { SuperAdminFranchiseDetailPage } from "./pages/super-admin/SuperAdminFranchiseDetailPage";
import { SuperAdminUsersPage } from "./pages/super-admin/SuperAdminUsersPage";
// Coupons stays gated (redirects to Dashboard) — not restored, not deleted.
// Employees, Reports/Analytics, Marketing, CEO Dashboard, AI Insights, and
// Settings were permanently removed from this project (see routes below).

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AuthLayout,
    children: [
      { index: true, Component: PublicHome },
      { path: "landing", Component: LandingPage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: SignUpPage },
      { path: "forgot-password", Component: ForgotPasswordPage },
      { path: "reset-password", Component: ResetPasswordPage },
    ],
  },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        path: "super-admin",
        Component: SuperAdminShell,
        children: [
          { index: true, Component: SuperAdminOverviewPage },
          { path: "franchises", Component: SuperAdminFranchisesPage },
          { path: "franchises/:id", Component: SuperAdminFranchiseDetailPage },
          { path: "users", Component: SuperAdminUsersPage },
        ],
      },
      {
        Component: ProtectedAppShell,
        children: [
      // ── VERSION-1 CLIENT SCOPE ──────────────────────────────────────
      // Only: Dashboard, Customers, Appointments (incl. walk-in + services),
      // and Billing (Finance receipts) are reachable. Everything else below
      // redirects to Dashboard — routes/components are NOT deleted, just
      // gated, so the full app can be restored by reverting this file.
      // Public `/` is the landing page; app home lives at `/dashboard`.
      { path: "dashboard", Component: Dashboard },
      { path: "appointments", element: <RequireRole roles={["manager"]}><Appointments /></RequireRole> },
      { path: "appointments/new", element: <RequireRole roles={["manager"]}><NewAppointment /></RequireRole> },
      { path: "walk-in", element: <RequireRole roles={["manager"]}><WalkIn /></RequireRole> },
      { path: "walk-in/bill", Component: () => <Navigate to="/appointments?type=walk-in" replace /> },
      { path: "walkins", Component: () => <Navigate to="/appointments?type=walk-in" replace /> },
      { path: "queue", Component: () => <Navigate to="/appointments" replace /> },
      { path: "customers", Component: Customers },
      { path: "customers/new", Component: NewCustomer },
      { path: "finance", element: <RequireRole roles={["admin"]}><Finance /></RequireRole> },
      { path: "billing", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "billing/new", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "billing/save", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "invoices", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "payments", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "services", Component: Services },
      { path: "packages", Component: () => <Navigate to="/services?tab=packages" replace /> },
      { path: "pricing", Component: () => <Navigate to="/services" replace /> },
      { path: "profile", Component: MyProfile },
      { path: "help", Component: HelpSupport },
      { path: "notifications", Component: Notifications },
      { path: "inventory", Component: Inventory },
      { path: "vendors", Component: () => <Navigate to="/inventory?tab=vendors" replace /> },
      { path: "orders", Component: () => <Navigate to="/inventory?tab=orders" replace /> },
      { path: "memberships", Component: Memberships },
      { path: "feedback", Component: Feedback },

      // ── Gated: Coupons is hidden but not deleted ──
      { path: "coupons", Component: () => <Navigate to="/dashboard" replace /> },

      // ── Permanently removed pages: Employees, Reports/Analytics, Marketing,
      // CEO Dashboard, AI Insights, Settings. Their code no longer exists in
      // this project — these redirects just catch any stale links/bookmarks.
      { path: "employees", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "attendance", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "incentives", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "reports", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "reports/summary", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "revenue", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "marketing", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "settings", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "ceo-dashboard", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "ai-insights", Component: () => <Navigate to="/dashboard" replace /> },
      // Users, Permissions, Integrations routes removed
        ],
      },
    ],
  },
]);
