import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { quickActions } from "../data";
import { dashboardFadeUpStagger } from "../motion";
import { SectionLabel } from "./DashboardCard";

export function QuickActionsGrid() {
  const navigate = useNavigate();

  return (
    <section aria-label="Quick actions">
      <SectionLabel>Quick Actions</SectionLabel>
      <div className="flex gap-3 flex-wrap lg:flex-nowrap">
        {quickActions.map((action, i) => (
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
            className="group flex flex-1 min-w-[140px] items-center gap-3 rounded-2xl bg-white border border-black/[0.07] px-4 py-3.5 text-left shadow-[0_1px_8px_rgba(17,17,24,0.05)] hover:border-[#D4AF37]/35 hover:shadow-[0_4px_16px_rgba(17,17,24,0.08)] transition-all duration-200"
          >
            {/* Icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/08 border border-[#D4AF37]/15 group-hover:bg-[#D4AF37]/15 group-hover:border-[#D4AF37]/30 transition-all duration-200">
              <action.icon className="h-[1.05rem] w-[1.05rem] text-[#9a9a9a] group-hover:text-[#D4AF37] transition-colors duration-200" />
            </div>

            {/* Label + description */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#111118] leading-tight truncate">{action.label}</p>
              <p className="text-[11px] text-[#9a9a9a] mt-0.5 truncate leading-tight">{action.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
