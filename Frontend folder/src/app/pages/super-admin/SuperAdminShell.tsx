import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, Navigate } from "react-router";
import { Building2, LayoutDashboard, LogOut, Store, Users } from "lucide-react";
import { RoleProvider, useRole } from "../../context/RoleContext";
import { authService } from "../../../services/authService";
import { BRAND } from "../../config/brand";
import { cn } from "../../components/ui/utils";

const nav = [
  { to: "/super-admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/super-admin/franchises", label: "Franchises", icon: Building2 },
  { to: "/super-admin/users", label: "Users", icon: Users },
];

/**
 * Dedicated shell for platform Super Admin — not the shop billing layout.
 */
export function SuperAdminShell() {
  return (
    <RoleProvider>
      <SuperAdminShellInner />
    </RoleProvider>
  );
}

function SuperAdminShellInner() {
  const { role, isReady, firstName, fullName } = useRole();
  const [signingOut, setSigningOut] = useState(false);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a10] text-sm text-white/50">
        Loading…
      </div>
    );
  }

  if (role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authService.logout();
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f4f2ed]">
      <aside className="flex w-60 shrink-0 flex-col bg-[#0a0a10] text-white">
        <div className="border-b border-white/10 px-4 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Platform</p>
          <p className="mt-1 text-sm font-semibold">{BRAND.appName}</p>
          <p className="text-[11px] text-white/45">Super Admin Console</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="truncate px-2 text-[12px] font-semibold text-white/80">
            {firstName || fullName || "Super Admin"}
          </p>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-white/50 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

export function SuperAdminOverviewPage() {
  const [stats, setStats] = useState({
    franchises: 0,
    shops: 0,
    admins: 0,
    managers: 0,
    superAdmins: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import("../../../api/franchises")
      .then((m) => m.fetchPlatformOverview())
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { label: "Franchises", value: stats.franchises, href: "/super-admin/franchises", icon: Building2 },
    { label: "Shops", value: stats.shops, href: "/super-admin/franchises", icon: Store },
    { label: "Admins", value: stats.admins, href: "/super-admin/users", icon: Users },
    { label: "Managers", value: stats.managers, href: "/super-admin/users", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Platform</p>
        <h1 className="text-2xl font-bold text-[#111118]">Overview</h1>
        <p className="text-sm text-[#6b6b6b]">All franchises, shops, and staff across BillVyapp</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.href}
            className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm transition hover:border-[#D4AF37]/35"
          >
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-[#6b6b6b]">{c.label}</p>
              <c.icon className="h-4 w-4 text-[#D4AF37]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-[#111118]">{loading ? "…" : c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
