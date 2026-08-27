import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardCard({ children, className = "" }: DashboardCardProps) {
  return (
    <div
      className={`relative flex min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_2px_10px_rgba(17,17,24,0.05)] ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
      {children}
    </div>
  );
}

interface DashboardCardHeaderProps {
  icon: LucideIcon;
  title: string;
  badge?: string;
  action?: string;
  onAction?: () => void;
}

export function DashboardCardHeader({
  icon: Icon,
  title,
  badge,
  action,
  onAction,
}: DashboardCardHeaderProps) {
  return (
    <div className="dashboard-card-header-mobile flex min-w-0 items-center gap-2 border-b border-black/[0.05] px-3 py-2.5 sm:gap-2.5 sm:px-4">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#D4AF37]/15 bg-[#D4AF37]/10">
        <Icon className="h-3 w-3 text-[#D4AF37]" />
      </div>
      <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em] text-[#111118]">
        {title}
      </h3>
      {badge ? (
        <span className="dashboard-card-badge max-w-[5.5rem] truncate rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#111118] sm:max-w-[10rem] sm:px-2 sm:text-[11px]">
          {badge}
        </span>
      ) : null}
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[#D4AF37] transition-colors hover:text-[#C9A227]"
        >
          <span className="hidden min-[380px]:inline">{action}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 flex min-w-0 max-w-full items-center gap-3">
      <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.22em] text-[#52525b]">{children}</span>
      <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-black/[0.06] to-transparent" />
    </div>
  );
}
