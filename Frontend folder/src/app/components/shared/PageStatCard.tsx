import { Link } from "react-router";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";

export interface PageStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  index?: number;
  compact?: boolean;
  className?: string;
}

export function PageStatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  onClick,
  index = 0,
  compact = false,
  className,
}: PageStatCardProps) {
  const interactive = Boolean(href || onClick);

  const inner = (
    <>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
      {interactive && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.06),transparent)]" />
      )}
      <div className={cn("relative flex items-start justify-between text-left w-full", compact ? "gap-3 p-3" : "p-3.5")}>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-[#6b6b6b] uppercase tracking-[0.18em]">{label}</p>
          <p className={cn("mt-1 font-bold text-[#111118] leading-none tabular-nums truncate", compact ? "text-xl" : "text-2xl")}>
            {value}
          </p>
          {sub && <p className="mt-1 text-[11px] text-[#9a9a9a]">{sub}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 bg-[#D4AF37]/10 border border-[#D4AF37]/20">
          <Icon className="h-4 w-4 text-[#D4AF37]" />
        </div>
      </div>
    </>
  );

  const cardClass = cn(
    "group relative overflow-hidden rounded-xl bg-white border border-black/[0.07] shadow-sm transition-all duration-300",
    interactive && "cursor-pointer hover:shadow-[0_12px_32px_rgba(17,17,24,0.08)]",
    className,
  );

  const motionProps = {
    initial: { opacity: 0, y: 14 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
    whileHover: interactive ? { y: -3, transition: { duration: 0.2 } } : undefined,
  };

  if (href) {
    return (
      <motion.div {...motionProps}>
        <Link to={href} className={cn(cardClass, "block")}>
          {inner}
        </Link>
      </motion.div>
    );
  }

  if (onClick) {
    return (
      <motion.button type="button" onClick={onClick} {...motionProps} className={cn(cardClass, "w-full")}>
        {inner}
      </motion.button>
    );
  }

  return (
    <motion.div {...motionProps} className={cardClass}>
      {inner}
    </motion.div>
  );
}

/** Map dashboard / reports KPI labels to drill-down routes. */
export const KPI_DRILL_ROUTES: Record<string, string> = {
  "Today's Revenue": "/finance?tab=receipts&section=sales",
  "Today's Walk-ins": "/appointments?type=walk-in",
  "New Customers": "/customers",
  "Pending Payments": "/finance?tab=receipts&section=pending",
  "Customer Satisfaction": "/feedback",
  "Total Revenue": "/finance?tab=receipts&section=sales",
  Revenue: "/finance?tab=receipts&section=sales",
};
