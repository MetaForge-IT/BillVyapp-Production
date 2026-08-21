import type { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";
import {
  SEGMENTED_PILL_BADGE,
  SEGMENTED_PILL_BADGE_ACTIVE,
  SEGMENTED_PILL_BADGE_INACTIVE,
  SEGMENTED_PILL_LIST,
} from "./segmented-nav";

export interface SegmentedPillItem<T extends string = string> {
  id: T;
  label: string;
  /** Shorter label for narrow screens; falls back to `label` when omitted. */
  shortLabel?: string;
  icon?: LucideIcon;
  badge?: number;
}

interface SegmentedPillNavProps<T extends string> {
  items: readonly SegmentedPillItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

export function SegmentedPillNav<T extends string>({
  items,
  value,
  onChange,
  className,
}: SegmentedPillNavProps<T>) {
  return (
    <div className={cn(SEGMENTED_PILL_LIST, className)} role="tablist">
      {items.map(({ id, label, shortLabel, icon: Icon, badge }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-9 min-w-0 flex-1 basis-[calc(50%-0.125rem)] items-center justify-center gap-1.5 rounded-xl border border-transparent px-2.5 text-[11px] font-semibold whitespace-nowrap transition-all duration-200 sm:flex-none sm:basis-auto sm:px-4 sm:text-[12px]",
              active
                ? "bg-[#121212] text-[#D4AF37] shadow-[0_2px_10px_rgba(18,18,18,0.2)]"
                : "bg-transparent text-[#121212] hover:bg-[rgba(18,18,18,0.04)]",
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-colors duration-200",
                  active ? "text-[#D4AF37]" : "text-[#121212]",
                )}
              />
            )}
            {shortLabel ? (
              <>
                <span className="truncate sm:hidden">{shortLabel}</span>
                <span className="hidden truncate sm:inline">{label}</span>
              </>
            ) : (
              <span className="truncate">{label}</span>
            )}
            {badge !== undefined && badge > 0 && (
              <span
                className={cn(
                  SEGMENTED_PILL_BADGE,
                  active ? SEGMENTED_PILL_BADGE_ACTIVE : SEGMENTED_PILL_BADGE_INACTIVE,
                )}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
