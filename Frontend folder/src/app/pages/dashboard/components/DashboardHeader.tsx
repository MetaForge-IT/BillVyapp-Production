import { motion } from "framer-motion";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { useRole, roleConfig } from "../../../context/RoleContext";
import { useDashboard } from "../useDashboard";

export function DashboardHeader() {
  const { role } = useRole();
  const roleInfo = roleConfig[role];
  const navigate = useNavigate();
  const { refreshing, lastUpdated, refresh } = useDashboard();

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
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            BillVyapp
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            Live
          </span>
        </div>
        <h1 className="text-[1.55rem] font-bold text-[#111118] tracking-[-0.025em] leading-tight">
          {greeting}, {roleInfo.label} 👋
        </h1>
        <p className="text-[13px] text-[#9a9a9a] mt-0.5">
          {dateStr} &middot; {updatedLabel}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-[#111118] bg-white border border-black/[0.08] hover:border-[#D4AF37]/35 transition-all disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
        <button
          type="button"
          onClick={() => navigate("/appointments/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-semibold text-[#D4AF37] bg-[#111118] border border-[#D4AF37]/25 hover:border-[#D4AF37]/55 hover:-translate-y-0.5 transition-all shadow-md shadow-black/20"
        >
          <Plus className="h-3.5 w-3.5" />
          New Appointment
        </button>
      </div>
    </motion.header>
  );
}
