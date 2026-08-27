import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";
import { PAGE_HEADER_ROW, PAGE_TITLE } from "../../config/responsive-classes";
import { colors, moduleThemes, type ModuleTheme } from "../../design/luxury-tokens";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn(PAGE_HEADER_ROW, className)}>
      <div className="min-w-0">
        <h1 className={PAGE_TITLE}>{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function parseNumericValue(value: string): number | null {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

export function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const numeric = parseNumericValue(value);
  const [display, setDisplay] = useState(numeric !== null ? "0" : value);

  useEffect(() => {
    if (numeric === null) {
      setDisplay(value);
      return;
    }
    const prefix = value.match(/^[^0-9]*/)?.[0] ?? "";
    const suffix = value.match(/[^0-9.]*$/)?.[0] ?? "";
    const hasDecimal = value.includes(".");
    const duration = 1000;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numeric * eased;
      setDisplay(
        prefix +
          (hasDecimal ? current.toFixed(1) : Math.round(current).toLocaleString("en-IN")) +
          suffix
      );
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, numeric]);

  return <span className={cn("animate-count-up tabular-nums", className)}>{display}</span>;
}

interface GradientKPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  theme: ModuleTheme;
  trend?: { value: string; positive?: boolean };
  animate?: boolean;
}

export function GradientKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  theme,
  trend,
  animate = true,
}: GradientKPICardProps) {
  const isRevenue = moduleThemes[theme].isRevenue;

  if (isRevenue) {
    return (
      <div className="relative overflow-hidden rounded-2xl p-5 floating-card bg-[#121212] text-white shadow-lg border border-[#00C896]/30">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#00C896]/10 rounded-full -mr-20 -mt-20 blur-2xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-white/70">{title}</p>
            <div className="text-3xl font-bold mt-2 tracking-tight text-[#00C896]">
              {animate ? <AnimatedValue value={value} /> : value}
            </div>
            {(subtitle || trend) && (
              <p className="text-xs text-white/60 flex items-center gap-1.5 mt-2">
                {trend && (
                  <span className="font-semibold text-[#00C896] bg-[#00C896]/15 px-1.5 py-0.5 rounded">
                    {trend.value}
                  </span>
                )}
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00C896]/20 border border-[#00C896]/30">
            <Icon className="h-6 w-6 text-[#00C896]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 floating-card glass-card bg-white border border-[#D4AF37]/25">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]/40" />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#3f3f46]">{title}</p>
          <div className="text-3xl font-bold mt-2 tracking-tight text-[#121212]">
            {animate ? <AnimatedValue value={value} /> : value}
          </div>
          {(subtitle || trend) && (
            <p className="text-xs text-[#3f3f46] flex items-center gap-1.5 mt-2">
              {trend && (
                <span className={cn("font-semibold", trend.positive !== false ? "text-[#121212]" : "text-red-500")}>
                  {trend.value}
                </span>
              )}
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#121212]">
          <Icon className="h-6 w-6 text-[#D4AF37]" />
        </div>
      </div>
    </div>
  );
}

export function KPICard(props: GradientKPICardProps) {
  return <GradientKPICard {...props} />;
}

interface InsightsPanelProps {
  title: string;
  icon: LucideIcon;
  theme: ModuleTheme;
  children: React.ReactNode;
  className?: string;
}

export function InsightsPanel({ title, icon: Icon, theme, children, className }: InsightsPanelProps) {
  const isRevenue = moduleThemes[theme].isRevenue;

  return (
    <div className={cn("glass-card rounded-2xl overflow-hidden floating-card bg-white", className)}>
      <div
        className={cn(
          "px-5 py-4 border-b flex items-center gap-3",
          isRevenue ? "bg-[#121212] text-white border-[#00C896]/20" : "bg-[#FAF8F2] border-[#D4AF37]/20"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            isRevenue ? "bg-[#00C896]/20" : "bg-[#121212]"
          )}
        >
          <Icon className={cn("h-5 w-5", isRevenue ? "text-[#00C896]" : "text-[#D4AF37]")} />
        </div>
        <h3 className={cn("font-display font-semibold text-lg", isRevenue ? "text-white" : "text-[#121212]")}>
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface QuickActionProps {
  label: string;
  icon: LucideIcon;
  variant?: "primary" | "gold" | "outline";
  onClick?: () => void;
}

export function QuickAction({ label, icon: Icon, variant = "outline", onClick }: QuickActionProps) {
  const variants = {
    primary: "bg-[#121212] text-[#D4AF37] border border-[#D4AF37]/30 shadow-md hover:shadow-lg hover:bg-[#1a1a1a]",
    gold: "bg-[#D4AF37] text-[#121212] shadow-md hover:shadow-lg hover:bg-[#c9a227] font-semibold",
    outline: "bg-white text-[#121212] border border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#FAF8F2]",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "h-auto flex flex-col items-center gap-2.5 py-5 px-3 rounded-2xl transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        variants[variant]
      )}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-semibold text-center leading-tight">{label}</span>
    </button>
  );
}

export const luxuryTooltipStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid rgba(212, 175, 55, 0.3)",
  borderRadius: "12px",
  boxShadow: "0 8px 24px rgba(18, 18, 18, 0.08)",
};
