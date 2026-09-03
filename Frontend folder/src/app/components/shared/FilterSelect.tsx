import type { LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../ui/utils";

export interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly FilterSelectOption[];
  icon?: LucideIcon;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  /** Marks the control as “active” (non-default filter). */
  active?: boolean;
  /** Shorter height and text — better for mobile toolbars. */
  compact?: boolean;
}

/** Premium filter dropdown used on Receipts, Inventory, and similar toolbars. */
export function FilterSelect({
  value,
  onValueChange,
  options,
  icon: Icon,
  placeholder = "Select",
  className,
  triggerClassName,
  active = false,
  compact = false,
}: FilterSelectProps) {
  return (
    <div className={cn("relative min-w-0 w-full sm:w-auto", className)}>
      {Icon ? (
        <Icon
          className={cn(
            "pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-[#D4AF37]",
            compact ? "left-2.5 h-3.5 w-3.5" : "left-3 h-4 w-4",
          )}
        />
      ) : null}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            "w-full min-w-0 rounded-xl border font-semibold shadow-none sm:min-w-[10.5rem]",
            compact ? "h-9 text-[12px]" : "h-10 text-[13px]",
            Icon ? (compact ? "pl-8" : "pl-9") : "pl-3",
            active
              ? "border-[#D4AF37]/60 bg-[#FFFBEB] text-[#9a7d20] hover:border-[#D4AF37]/70"
              : "border-black/[0.1] bg-white text-[#111118] hover:border-[#D4AF37]/45",
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active ? (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#D4AF37]" />
      ) : null}
    </div>
  );
}
