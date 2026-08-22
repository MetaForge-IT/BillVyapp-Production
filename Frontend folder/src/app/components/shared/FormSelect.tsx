import type { LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../ui/utils";

export interface FormSelectOption {
  value: string;
  label: string;
  /** Secondary line under the label (e.g. address). */
  description?: string;
}

interface FormSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly FormSelectOption[];
  placeholder?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Highlights trigger when a value is selected (non-empty). */
  highlightWhenSet?: boolean;
  id?: string;
  "aria-label"?: string;
}

/** Form-field select — Radix UI with BillVyapp styling (dashboard forms, modals). */
export function FormSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  icon: Icon,
  disabled = false,
  className,
  triggerClassName,
  highlightWhenSet = true,
  id,
  "aria-label": ariaLabel,
}: FormSelectProps) {
  const hasValue = Boolean(value);

  return (
    <div className={cn("relative min-w-0 w-full", className)}>
      {Icon ? (
        <Icon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#D4AF37]" />
      ) : null}
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled || options.length === 0}
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel}
          className={cn(
            "h-10 w-full min-w-0 rounded-xl border text-[13px] font-semibold shadow-none",
            Icon ? "pl-9 pr-3" : "px-3",
            highlightWhenSet && hasValue
              ? "border-[#D4AF37]/60 bg-[#FFFBEB] text-[#9a7d20] hover:border-[#D4AF37]/70"
              : "border-black/[0.08] bg-[#FAF8F2]/60 text-[#111118] hover:border-[#D4AF37]/45",
            disabled && "opacity-60",
            triggerClassName,
          )}
        >
          <SelectValue placeholder={options.length === 0 ? "No options available" : placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[min(18rem,var(--radix-select-content-available-height))] rounded-xl">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="items-start py-2.5">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-semibold">{option.label}</span>
                {option.description ? (
                  <span className="truncate text-[11px] font-normal text-[#9a9a9a]">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {highlightWhenSet && hasValue ? (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#D4AF37]" />
      ) : null}
    </div>
  );
}
