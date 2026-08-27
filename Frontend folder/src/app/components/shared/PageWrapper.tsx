import { motion } from "framer-motion";
import type { ReactNode, LucideIcon } from "react";
import { Button } from "../ui/button";

interface PageAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "outline";
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: PageAction[];
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#111118] via-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">
          {title}
        </h1>
        {subtitle && <p className="text-[#3f3f46] mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return action.variant === "outline" ? (
              <Button key={i} variant="outline" size="lg" className="rounded-xl" onClick={action.onClick}>
                {Icon && <Icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            ) : (
              <Button
                key={i}
                size="lg"
                className="rounded-xl bg-gradient-to-r from-[#111118] to-[#1a1a1a] hover:from-[#1a1a1a] hover:to-[#d4af37]/80 shadow-lg text-white"
                onClick={action.onClick}
              >
                {Icon && <Icon className="h-5 w-5 mr-1" />}
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {children}
    </motion.div>
  );
}

export function PageSection({ children }: { children: ReactNode }) {
  return <motion.div variants={itemVariants}>{children}</motion.div>;
}

interface PremiumStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  accent?: string;
}

export function PremiumStatCard({ label, value, sub, icon, accent = "#d4af37" }: PremiumStatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl bg-white border border-black/[0.06] shadow-[0_2px_12px_rgba(17,17,24,0.06)] hover:shadow-[0_16px_48px_rgba(17,17,24,0.12)] transition-shadow duration-300"
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }}
      />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accent}08, transparent)` }}
      />
      <div className="relative p-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#3f3f46] uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[#111118] leading-none">{value}</p>
          {sub && <p className="mt-1.5 text-xs text-[#52525b]">{sub}</p>}
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: `linear-gradient(135deg, ${accent}18, ${accent}08)`, border: `1px solid ${accent}25` }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
