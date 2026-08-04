import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Scissors, Search, X } from "lucide-react";
import type { AppointmentService } from "../appointments/appointmentData";
import {
  BASIC_SERVICES,
  BASIC_SERVICE_GROUPS,
  matchBasicService,
  type BasicServiceGroup,
  type BasicServicePick,
} from "../appointments/basicServices";
import { Input } from "../../components/ui/input";
import { cn } from "../../components/ui/utils";
import { ColHeader } from "./ColHeader";
import type { SelectedService } from "./types";

interface ServicesStepProps {
  catalog: AppointmentService[];
  catalogLoading: boolean;
  serviceSearch: string;
  onServiceSearchChange: (value: string) => void;
  searchResults: AppointmentService[];
  selectedServices: SelectedService[];
  selectedQty: (id: string) => number;
  isSelected: (id: string) => boolean;
  onAddOrBump: (svc: AppointmentService) => void;
  onBumpQty: (id: string, delta: number) => void;
}

export function ServicesStep({
  catalog,
  catalogLoading,
  serviceSearch,
  onServiceSearchChange,
  searchResults,
  selectedServices,
  selectedQty,
  isSelected,
  onAddOrBump,
  onBumpQty,
}: ServicesStepProps) {
  const basicByGroup = BASIC_SERVICE_GROUPS.map((group) => ({
    group,
    picks: BASIC_SERVICES.filter((p) => p.group === group),
  }));

  return (
    <div className="responsive-panel flex flex-col overflow-hidden border-b border-black/[0.08] bg-[#f4f2ed] lg:border-b-0 lg:border-r">
      <ColHeader
        num="01"
        icon={Scissors}
        title="Services"
        desc="Add for the whole family — like a cart"
      />
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-y-contain px-3 py-3 sm:gap-3 sm:px-4 md:px-5">
        {catalogLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-[#9a9a9a]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
          </div>
        ) : (
          <div className="flex shrink-0 flex-col gap-2 sm:gap-2.5">
            {basicByGroup.map(({ group, picks }: { group: BasicServiceGroup; picks: BasicServicePick[] }) => (
              <div key={group} className="w-full shrink-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">
                  {group}
                </p>
                {/* Always 6 equal tiles in one row — scales to phone / tablet / desktop */}
                <div className="grid w-full grid-cols-6 gap-1 sm:gap-1.5 md:gap-2">
                  {picks.map((pick) => {
                    const matched = matchBasicService(catalog, pick);
                    const selected = matched ? isSelected(matched.id) : false;
                    const qty = matched ? selectedQty(matched.id) : 0;
                    return (
                      <button
                        key={pick.label}
                        type="button"
                        disabled={!matched}
                        onClick={() => {
                          if (!matched) return;
                          if (selected) onBumpQty(matched.id, -Math.max(qty, 1));
                          else onAddOrBump(matched);
                        }}
                        className={cn(
                          "relative flex min-w-0 flex-col items-center justify-center rounded-md border text-center transition-all touch-manipulation active:scale-[0.97] sm:rounded-lg",
                          "h-[4.25rem] px-0.5 py-1 sm:h-[4.75rem] sm:px-1 sm:py-1.5 md:h-[5.25rem] md:p-1.5",
                          !matched && "cursor-not-allowed opacity-40",
                          selected
                            ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_0_1px_rgba(212,175,55,0.35)]"
                            : "border-black/[0.08] bg-white hover:border-[#D4AF37]/35",
                        )}
                      >
                        {selected && (
                          <span className="absolute right-0.5 top-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-[#111118] px-0.5 text-[7px] font-bold text-[#D4AF37] sm:right-1 sm:top-1 sm:h-3.5 sm:min-w-3.5 sm:text-[8px]">
                            {qty > 1 ? qty : <Check className="h-2 w-2" strokeWidth={3} />}
                          </span>
                        )}
                        <div className="flex min-w-0 flex-col items-center gap-0.5">
                          <p className="w-full truncate text-[8px] font-bold leading-tight text-[#111118] sm:text-[9px] md:text-[10px]">
                            {pick.label}
                          </p>
                          {matched ? (
                            <p className="w-full truncate text-[7px] font-bold leading-tight text-[#6b6b6b] sm:text-[8px] md:text-[9px]">
                              ₹{matched.price.toLocaleString("en-IN")}
                              <span className="ml-0.5 font-normal text-[#9a9a9a] sm:ml-1">{matched.duration}m</span>
                            </p>
                          ) : (
                            <p className="text-[7px] text-[#9a9a9a] sm:text-[8px]">N/A</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="relative shrink-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a]">
            Search other services
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
            <Input
              value={serviceSearch}
              onChange={(e) => onServiceSearchChange(e.target.value)}
              placeholder="Threading, facial, spa…"
              className={cn(
                "h-11 rounded-xl border-black/[0.08] bg-white pl-9 text-[12px] focus:border-[#D4AF37]/40 sm:h-9",
                serviceSearch.trim() && "pr-9",
              )}
            />
            {serviceSearch.trim() ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onServiceSearchChange("")}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#9a9a9a] transition-colors hover:bg-black/[0.05] hover:text-[#111118] sm:h-6 sm:w-6"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <AnimatePresence>
            {serviceSearch.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="absolute inset-x-0 top-full z-20 mt-1 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-black/[0.07] bg-white p-2 shadow-lg sm:max-h-48"
              >
                {searchResults.length === 0 ? (
                  <p className="px-2 py-3 text-center text-[11px] text-[#9a9a9a]">No services found</p>
                ) : (
                  searchResults.map((svc) => {
                    const qty = selectedQty(svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => onAddOrBump(svc)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-all touch-manipulation sm:py-2",
                          qty > 0
                            ? "border-[#D4AF37]/50 bg-[#D4AF37]/08"
                            : "border-transparent hover:bg-[#f4f2ed]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border px-1 text-[10px] font-bold",
                            qty > 0
                              ? "border-[#111118] bg-[#111118] text-[#D4AF37]"
                              : "border-black/[0.12] bg-white",
                          )}
                        >
                          {qty > 0 ? qty : <Check className="h-3 w-3 opacity-0" strokeWidth={3} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-[#111118]">
                            {svc.displayName || svc.name}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-[#111118]">
                          ₹{svc.price.toLocaleString("en-IN")}
                        </span>
                      </button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selectedServices.length > 0 && (
          <div className="shrink-0 rounded-xl border border-[#D4AF37]/25 bg-white p-2 sm:p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">
                Cart ({selectedServices.reduce((n, s) => n + s.qty, 0)})
              </p>
              <span className="text-[11px] font-bold text-[#111118]">
                ₹{selectedServices.reduce((sum, s) => sum + s.price * s.qty, 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="max-h-[5.5rem] space-y-1 overflow-y-auto sm:max-h-[4.5rem]">
              {selectedServices.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#111118]">
                    {s.displayName || s.name}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onBumpQty(s.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-black/[0.1] text-[13px] font-bold touch-manipulation sm:h-5 sm:w-5 sm:text-[11px]"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-[11px] font-bold sm:w-4 sm:text-[10px]">{s.qty}</span>
                    <button
                      type="button"
                      onClick={() => onBumpQty(s.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded border border-black/[0.1] text-[13px] font-bold touch-manipulation sm:h-5 sm:w-5 sm:text-[11px]"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-12 text-right text-[10px] font-bold text-[#111118]">
                    ₹{(s.price * s.qty).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
