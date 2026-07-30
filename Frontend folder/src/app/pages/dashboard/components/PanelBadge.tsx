import { ShieldCheck } from "lucide-react";
import { useRole, roleConfig } from "../../../context/RoleContext";

/** Badge shown on dashboards so users know which panel they're in. */
export function PanelBadge() {
  const { role } = useRole();
  const info = roleConfig[role];
  const panelName = role === "admin" ? "Admin Panel" : "Manager Panel";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
      <ShieldCheck className="h-3 w-3" />
      {panelName} · {info.label}
    </span>
  );
}
