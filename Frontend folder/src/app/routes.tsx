import { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { RequireAuth } from "./components/layout/RequireAuth";
import { RequireRole } from "./components/layout/RequireRole";
import { ProtectedAppShell } from "./components/layout/ProtectedAppShell";
import { AppDataProviders } from "./components/layout/AppDataProviders";
import { AuthLayout } from "./components/layout/AuthLayout";
import { PublicHome } from "./components/layout/PublicHome";
import { RouteFallback } from "./components/layout/RouteFallback";
import { lazyNamed } from "./lib/lazyNamed";

// Auth pages stay eager — first paint / login should not wait on a chunk.
import { LandingPage } from "./pages/auth/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignUpPage } from "./pages/auth/SignUpPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";

// Heavy app pages — code-split so only the active route's JS is downloaded.
const Dashboard = lazyNamed(() => import("./pages/Dashboard"), "Dashboard");
const Appointments = lazyNamed(() => import("./pages/Appointments"), "Appointments");
const Customers = lazyNamed(() => import("./pages/Customers"), "Customers");
const Services = lazyNamed(() => import("./pages/Services"), "Services");
const Finance = lazyNamed(() => import("./pages/Finance"), "Finance");
const Expenses = lazyNamed(() => import("./pages/Expenses"), "Expenses");
const Inventory = lazyNamed(() => import("./pages/Inventory"), "Inventory");
const Memberships = lazyNamed(() => import("./pages/Memberships"), "Memberships");
const Feedback = lazyNamed(() => import("./pages/Feedback"), "Feedback");
const WalkIn = lazyNamed(() => import("./pages/WalkIn"), "WalkIn");
const NewAppointment = lazyNamed(() => import("./pages/NewAppointment"), "NewAppointment");
const MyProfile = lazyNamed(() => import("./pages/MyProfile"), "MyProfile");
const HelpSupport = lazyNamed(() => import("./pages/HelpSupport"), "HelpSupport");
const Notifications = lazyNamed(() => import("./pages/Notifications"), "Notifications");
const NewCustomer = lazyNamed(() => import("./pages/NewCustomer"), "NewCustomer");

const SuperAdminShell = lazyNamed(
  () => import("./pages/super-admin/SuperAdminShell"),
  "SuperAdminShell",
);
const SuperAdminOverviewPage = lazyNamed(
  () => import("./pages/super-admin/SuperAdminShell"),
  "SuperAdminOverviewPage",
);
const SuperAdminFranchisesPage = lazyNamed(
  () => import("./pages/super-admin/SuperAdminFranchisesPage"),
  "SuperAdminFranchisesPage",
);
const SuperAdminFranchiseDetailPage = lazyNamed(
  () => import("./pages/super-admin/SuperAdminFranchiseDetailPage"),
  "SuperAdminFranchiseDetailPage",
);
const SuperAdminUsersPage = lazyNamed(
  () => import("./pages/super-admin/SuperAdminUsersPage"),
  "SuperAdminUsersPage",
);

// Coupons stays gated (redirects to Dashboard) — not restored, not deleted.
// Employees, Reports/Analytics, Marketing, CEO Dashboard, AI Insights, and
// Settings were permanently removed from this project (see routes below).

function SuperAdminSuspense() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <SuperAdminShell />
    </Suspense>
  );
}

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
        element: <SuperAdminSuspense />,
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
      { path: "profile", Component: MyProfile },
      { path: "help", Component: HelpSupport },
      { path: "notifications", Component: Notifications },

      // Lightweight redirects — no finance/ops providers needed.
      { path: "coupons", Component: () => <Navigate to="/dashboard" replace /> },
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

      {
        Component: AppDataProviders,
        children: [
      { path: "appointments", element: <RequireRole roles={["manager"]}><Appointments /></RequireRole> },
      { path: "appointments/new", element: <RequireRole roles={["manager"]}><NewAppointment /></RequireRole> },
      { path: "walk-in", element: <RequireRole roles={["manager"]}><WalkIn /></RequireRole> },
      { path: "walk-in/bill", Component: () => <Navigate to="/appointments?type=walk-in" replace /> },
      { path: "walkins", Component: () => <Navigate to="/appointments?type=walk-in" replace /> },
      { path: "queue", Component: () => <Navigate to="/appointments" replace /> },
      { path: "customers", Component: Customers },
      { path: "customers/new", Component: NewCustomer },
      { path: "finance", element: <RequireRole roles={["admin", "manager"]}><Finance /></RequireRole> },
      { path: "expenses", element: <RequireRole roles={["admin", "manager"]}><Expenses /></RequireRole> },
      { path: "billing", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "billing/new", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "billing/save", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "invoices", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "payments", Component: () => <Navigate to="/finance?tab=receipts" replace /> },
      { path: "services", Component: Services },
      { path: "packages", Component: () => <Navigate to="/services?tab=packages" replace /> },
      { path: "pricing", Component: () => <Navigate to="/services" replace /> },
      { path: "inventory", Component: Inventory },
      { path: "vendors", Component: () => <Navigate to="/inventory?tab=vendors" replace /> },
      { path: "orders", Component: () => <Navigate to="/inventory?tab=orders" replace /> },
      { path: "memberships", Component: Memberships },
      { path: "feedback", Component: Feedback },
        ],
      },
        ],
      },
    ],
  },
]);
