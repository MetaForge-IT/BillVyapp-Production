import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardCard({ children, className = "" }: DashboardCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl bg-white border border-black/[0.06] shadow-[0_2px_10px_rgba(17,17,24,0.05)] overflow-hidden ${className}`}
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
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-black/[0.05]">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/15">
        <Icon className="h-3 w-3 text-[#D4AF37]" />
      </div>
      <h3 className="font-semibold text-[13px] text-[#111118] flex-1 tracking-[-0.01em]">{title}</h3>
      {badge && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#111118] border border-[#D4AF37]/20">
          {badge}
        </span>
      )}
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#D4AF37] hover:text-[#C9A227] transition-colors"
        >
          {action} <ArrowUpRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9a9a9a]">{children}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-black/[0.06] to-transparent" />
    </div>
  );
}
