import { motion } from "framer-motion";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { useRole } from "../../../context/RoleContext";
import { DASHBOARD_DURATION, DASHBOARD_EASE } from "../motion";
import { useDashboard } from "../useDashboard";

export function DashboardHeader() {
  const { role, firstName, fullName } = useRole();
  const navigate = useNavigate();
  const { refreshing, lastUpdated, refresh } = useDashboard();

  // Prefer first name; never fall back to role label (avoids "Good afternoon, Manager").
  const displayName = firstName || fullName.split(/\s+/)[0] || "";

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const updatedLabel = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
    : "Syncing live data";

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DASHBOARD_DURATION, ease: DASHBOARD_EASE }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            BillVyapp
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#D4AF37]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4AF37]" />
            Live
          </span>
        </div>
        <p className="text-[13px] font-medium text-[#9a9a9a]">{greeting}</p>
        <h1 className="truncate text-[1.55rem] font-bold leading-tight tracking-[-0.025em] text-[#111118]">
          {displayName || "Welcome"}
        </h1>
        <p className="mt-0.5 text-[13px] text-[#9a9a9a]">
          {dateStr} &middot; {updatedLabel}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#111118] transition-all hover:border-[#D4AF37]/35 disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
        {role !== "admin" && (
          <button
            type="button"
            onClick={() => navigate("/appointments/new")}
            className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/25 bg-[#111118] px-4 py-2 text-[12.5px] font-semibold text-[#D4AF37] shadow-md shadow-black/20 transition-all hover:-translate-y-0.5 hover:border-[#D4AF37]/55"
          >
            <Plus className="h-3.5 w-3.5" />
            New Appointment
          </button>
        )}
      </div>
    </motion.header>
  );
}
