import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { quickActions } from "../data";
import { dashboardFadeUpStagger } from "../motion";
import { SectionLabel } from "./DashboardCard";
import { useRole } from "../../../context/RoleContext";

export function QuickActionsGrid() {
  const navigate = useNavigate();
  const { role } = useRole();
  const actions = quickActions.filter((action) =>
    role === "manager" ? action.label !== "Receipts" : true,
  );

  return (
    <section aria-label="Quick actions">
      <SectionLabel>Quick Actions</SectionLabel>
      <div className="dashboard-quick-actions">
        {actions.map((action, i) => (
          <motion.button
            key={action.label}
            type="button"
            custom={i}
            variants={dashboardFadeUpStagger}
            initial="hidden"
            animate="show"
            whileHover={{ y: -2, transition: { duration: 0.28 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const [pathname, search] = action.href.split("?");
              navigate({ pathname, search: search ? `?${search}` : undefined });
            }}
            className="group flex min-w-0 items-center gap-2.5 rounded-2xl border border-black/[0.07] bg-white px-3 py-3 text-left shadow-[0_1px_8px_rgba(17,17,24,0.05)] transition-all duration-200 hover:border-[#D4AF37]/35 hover:shadow-[0_4px_16px_rgba(17,17,24,0.08)] sm:gap-3 sm:px-4 sm:py-3.5 lg:flex-1"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/08 transition-all duration-200 group-hover:border-[#D4AF37]/30 group-hover:bg-[#D4AF37]/15">
              <action.icon className="h-[1.05rem] w-[1.05rem] text-[#52525b] transition-colors duration-200 group-hover:text-[#D4AF37]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-tight text-[#111118] sm:text-[13px]">
                {action.label}
              </p>
              <p className="mt-0.5 truncate text-[10px] leading-tight text-[#52525b] sm:text-[11px]">
                {action.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
