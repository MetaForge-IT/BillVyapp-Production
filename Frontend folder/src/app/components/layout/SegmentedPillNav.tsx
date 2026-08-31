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
  /** Icons only below `sm`; full labels from `sm` up (Revenue Report tabs, etc.). */
  iconOnlyMobile?: boolean;
  className?: string;
}

export function SegmentedPillNav<T extends string>({
  items,
  value,
  onChange,
  iconOnlyMobile = false,
  className,
}: SegmentedPillNavProps<T>) {
  const compactMobile = iconOnlyMobile && items.every(({ icon }) => icon);

  return (
    <div
      className={cn(
        SEGMENTED_PILL_LIST,
        compactMobile && "!inline-flex !w-full !max-w-full !flex-nowrap !overflow-x-auto",
        className,
      )}
      role="tablist"
    >
      {items.map(({ id, label, shortLabel, icon: Icon, badge }) => {
        const active = value === id;
        const displayLabel = shortLabel ?? label;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
            className={cn(
              "relative inline-flex h-9 min-w-0 items-center justify-center rounded-xl border border-transparent text-[11px] font-semibold whitespace-nowrap transition-all duration-200 sm:gap-1.5 sm:text-[12px]",
              compactMobile
                ? "min-w-9 flex-1 basis-0 px-0 sm:flex-none sm:basis-auto sm:px-4"
                : "min-w-0 flex-1 basis-[calc(50%-0.125rem)] gap-1.5 px-2.5 sm:flex-none sm:basis-auto sm:px-4",
              active
                ? "bg-[#121212] text-[#D4AF37] shadow-[0_2px_10px_rgba(18,18,18,0.2)]"
                : "bg-transparent text-[#121212] hover:bg-[rgba(18,18,18,0.04)]",
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "shrink-0 transition-colors duration-200",
                  compactMobile ? "h-4 w-4 sm:h-3.5 sm:w-3.5" : "h-3.5 w-3.5",
                  active ? "text-[#D4AF37]" : "text-[#121212]",
                )}
              />
            )}
            {compactMobile ? (
              <span className="hidden truncate sm:inline">{label}</span>
            ) : shortLabel ? (
              <>
                <span className="truncate sm:hidden">{shortLabel}</span>
                <span className="hidden truncate sm:inline">{label}</span>
              </>
            ) : (
              <span className="truncate">{displayLabel}</span>
            )}
            {badge !== undefined && badge > 0 && (
              <span
                className={cn(
                  SEGMENTED_PILL_BADGE,
                  active ? SEGMENTED_PILL_BADGE_ACTIVE : SEGMENTED_PILL_BADGE_INACTIVE,
                  compactMobile &&
                    "absolute -right-0.5 -top-0.5 ml-0 min-w-[1rem] px-1 py-px text-[9px] leading-none sm:static sm:ml-0.5 sm:min-w-0 sm:px-1.5 sm:py-0.5 sm:text-[10px]",
                )}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
