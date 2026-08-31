import { Link } from "react-router";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Area, AreaChart } from "recharts";
import { cn } from "../ui/utils";
import { SafeChartContainer } from "./SafeChartContainer";

function parseNumeric(value: string): number | null {
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

function AnimatedMetric({ value }: { value: string }) {
  const numeric = parseNumeric(value);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (numeric === null) { setDisplay(value); return; }
    const prefix = value.match(/^[^0-9]*/)?.[0] ?? "";
    const suffix = value.match(/[^0-9.]*$/)?.[0] ?? "";
    const hasDecimal = value.includes(".");
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const cur = numeric * eased;
      setDisplay(prefix + (hasDecimal ? cur.toFixed(1) : Math.round(cur).toLocaleString("en-IN")) + suffix);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, numeric]);

  return <span className="tabular-nums">{display}</span>;
}

export interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  changePositive?: boolean;
  comparison?: string;
  icon: LucideIcon;
  sparkline: { v: number }[];
  revenue?: boolean;
  accent?: string;
  href?: string;
}

export function MetricCard({
  label,
  value,
  change,
  changePositive = true,
  comparison = "vs last period",
  icon: Icon,
  sparkline,
  revenue = false,
  accent,
  href,
}: MetricCardProps) {
  const stroke = accent ?? "#D4AF37";
  const isPositive = changePositive;

  const card = (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-white border border-black/[0.06] shadow-[0_2px_10px_rgba(17,17,24,0.05)] hover:shadow-[0_12px_36px_rgba(17,17,24,0.1)] transition-shadow duration-300 h-full flex flex-col",
        href && "cursor-pointer",
      )}
    >
      {/* Gradient top border */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${stroke}60, transparent)` }}
      />

      {/* Ambient glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${stroke}08, transparent)` }}
      />

      <div className="relative p-3.5 flex-1 flex flex-col">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${stroke}18, ${stroke}08)`,
              border: `1px solid ${stroke}25`,
            }}
          >
            <Icon className="h-4 w-4" style={{ color: stroke }} />
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#111118] border border-[#D4AF37]/20">
            {change}
          </span>
        </div>

        {/* Label */}
        <p className="text-[10px] font-medium text-[#3f3f46] uppercase tracking-wider">{label}</p>

        {/* Value */}
        <p className="mt-1 text-2xl font-bold tracking-tight leading-none text-[#111118]">
          <AnimatedMetric value={value} />
        </p>

        {/* Comparison */}
        <p className="mt-1 text-[11px] text-[#52525b]">{comparison}</p>

        {/* Sparkline */}
        <div className="mt-auto h-8 min-w-0 w-full">
          <SafeChartContainer height={32} minHeight={32}>
            <AreaChart data={sparkline}>
              <defs>
                <linearGradient id={`sg-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#sg-${label.replace(/\s/g, "")})`}
                dot={false}
                animationDuration={1000}
              />
            </AreaChart>
          </SafeChartContainer>
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link to={href} className="block h-full">{card}</Link>;
  }

  return card;
}
