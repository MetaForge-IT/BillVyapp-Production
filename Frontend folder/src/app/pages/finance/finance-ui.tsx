import type { ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../components/ui/utils";

export const financeBadge =
  "border border-black/[0.07] bg-[#FAF8F2] text-[#3f3f46] text-[10px]";
export const financeBadgeGold =
  "border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#9a7d20] text-[10px]";
export const financeIconWrap =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20";
export const financeAvatarWrap =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#121212] text-[#D4AF37] font-bold text-[12px]";
export const financePanel =
  "rounded-xl border border-black/[0.07] bg-white shadow-sm overflow-hidden";
export const financePanelHeader =
  "flex items-center justify-between border-b border-black/[0.07] bg-[#FAF8F2] px-4 py-2.5";
export const financePanelTitle =
  "text-[11px] font-bold uppercase tracking-wider text-[#121212]";
export const financePrimaryBtn =
  "h-7 px-2.5 rounded-lg border border-[#D4AF37]/30 bg-[#121212] text-[10px] font-bold text-[#D4AF37] hover:bg-[#1a1a1a] transition-all";
export const financeGoldBtn =
  "h-9 px-5 rounded-xl bg-[#111118] text-[12px] font-bold text-[#D4AF37] disabled:opacity-40 transition-all hover:bg-[#1a1a1a]";
export const financeFilterBar =
  "rounded-xl border border-black/[0.07] bg-white shadow-sm px-3.5 py-2.5";
export const financeProgressTrack =
  "h-1.5 rounded-full bg-[rgba(18,18,18,0.06)] overflow-hidden";
export const financeProgressFill =
  "h-full rounded-full bg-[#D4AF37] transition-all";

export function FinanceStatCard({
  label,
  value,
  sub,
  icon: Icon,
  index = 0,
  onClick,
  href,
  className,
  compact = false,
}: {
  label: string;
  value: string | number;
  sub?: ReactNode;
  icon: LucideIcon;
  index?: number;
  onClick?: () => void;
  href?: string;
  className?: string;
  /** Tighter card for Revenue Report KPI strips (tablet/desktop). */
  compact?: boolean;
}) {
  const content = (
    <>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.06),transparent)]" />
      <div
        className={cn(
          "relative flex items-start justify-between text-left w-full",
          compact ? "p-2.5" : "p-3.5",
        )}
      >
        <div className="min-w-0 flex-1 pr-2">
          <p
            className={cn(
              "font-semibold text-[#3f3f46] uppercase tracking-[0.18em] truncate",
              compact ? "text-[9px] tracking-[0.14em]" : "text-[10px]",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "mt-0.5 font-bold text-[#111118] leading-none tabular-nums truncate",
              compact ? "text-lg" : "mt-1 text-2xl",
            )}
          >
            {value}
          </p>
          {sub && (
            <p className={cn("text-[#52525b] truncate", compact ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]")}>
              {sub}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center justify-center rounded-lg shrink-0 bg-[#D4AF37]/10 border border-[#D4AF37]/20",
            compact ? "h-7 w-7" : "h-9 w-9",
          )}
        >
          <Icon className={cn("text-[#D4AF37]", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </div>
      </div>
    </>
  );

  const cardClass = cn(
    "group relative flex h-full min-h-[5.75rem] w-full overflow-hidden rounded-xl bg-white border border-black/[0.07] shadow-sm hover:shadow-[0_12px_32px_rgba(17,17,24,0.08)] transition-all duration-300",
    (onClick || href) && "cursor-pointer",
    className,
  );

  const motionProps = {
    initial: { opacity: 0, y: 14 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
    whileHover: { y: -3, transition: { duration: 0.2 } } as const,
  };

  const shellClass = "h-full min-w-0 w-full";

  if (href) {
    return (
      <motion.div {...motionProps} className={shellClass}>
        <Link to={href} className={cn(cardClass, "block")}>
          {content}
        </Link>
      </motion.div>
    );
  }

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className={cn(cardClass, shellClass)}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={cn(cardClass, shellClass)}
    >
      {content}
    </motion.div>
  );
}

export function FinanceStatGrid({
  children,
  cols = 4,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass =
    cols === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : cols === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  return <div className={cn("grid gap-3", colClass, className)}>{children}</div>;
}

/** Shared KPI row — horizontal scroll on tablet, equal columns on desktop; hidden on phones via CSS. */
export function PanelKpiStrip({
  children,
  cols = 4,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div className={cn("panel-kpi-strip shrink-0 min-w-0", className)}>
      <div
        className={cn(
          "panel-kpi-grid",
          cols === 4 && "panel-kpi-grid--4",
          cols === 3 && "panel-kpi-grid--3",
          cols === 2 && "panel-kpi-grid--2",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** @deprecated Use PanelKpiStrip */
export const RevenueReportKpiStrip = PanelKpiStrip;

export function FinancePanel({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={financePanel}>
      <div className={financePanelHeader}>
        <div>
          <p className={financePanelTitle}>{title}</p>
          {subtitle && (
            <p className="text-[10px] text-[#52525b] mt-0.5">{subtitle}</p>
          )}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}
