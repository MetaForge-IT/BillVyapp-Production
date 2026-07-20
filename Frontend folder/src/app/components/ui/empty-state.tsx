import { cn } from "./utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF8F2] border border-[#D4AF37]/20 mb-4">
        <Icon className="h-8 w-8 text-[#D4AF37]" />
      </div>
      <h3 className="text-lg text-manrope-semibold text-[#121212] mb-2">{title}</h3>
      <p className="text-sm text-inter-regular text-[#6B6B6B] max-w-sm mb-6">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 rounded-xl bg-[#121212] text-[#D4AF37] text-sm text-inter-medium hover:bg-[#121212]/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
