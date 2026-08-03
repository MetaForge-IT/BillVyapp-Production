import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Scissors, Search } from "lucide-react";
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
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {catalogLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-[#9a9a9a]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
          </div>
        ) : (
          basicByGroup.map(({ group, picks }: { group: BasicServiceGroup; picks: BasicServicePick[] }) => (
            <div key={group}>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a]">
                {group}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {picks.map((pick) => {
                  const matched = matchBasicService(catalog, pick);
                  const selected = matched ? isSelected(matched.id) : false;
                  const qty = matched ? selectedQty(matched.id) : 0;
                  return (
                    <button
                      key={pick.label}
                      type="button"
                      disabled={!matched}
                      onClick={() => matched && onAddOrBump(matched)}
                      className={cn(
                        "relative rounded-2xl border px-3 py-4 text-left transition-all",
                        !matched && "cursor-not-allowed opacity-40",
                        selected
                          ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_0_1px_rgba(212,175,55,0.35)]"
                          : "border-black/[0.08] bg-white hover:border-[#D4AF37]/35",
                      )}
                    >
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#111118] px-1.5 text-[10px] font-bold text-[#D4AF37]">
                          {qty > 1 ? qty : <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                      )}
                      <p className="pr-6 text-[13px] font-bold text-[#111118]">{pick.label}</p>
                      {matched ? (
                        <p className="mt-1 text-[11px] font-semibold text-[#6b6b6b]">
                          ₹{matched.price.toLocaleString("en-IN")}
                          <span className="ml-1 font-normal text-[#9a9a9a]">· {matched.duration}m</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-[10.5px] text-[#9a9a9a]">Not in catalog</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a]">
            Search other services
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
            <Input
              value={serviceSearch}
              onChange={(e) => onServiceSearchChange(e.target.value)}
              placeholder="Threading, facial, spa…"
              className="h-10 rounded-xl border-black/[0.08] bg-white pl-9 text-[12.5px] focus:border-[#D4AF37]/40"
            />
          </div>
          <AnimatePresence>
            {serviceSearch.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="mt-2 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-black/[0.07] bg-white p-2 shadow-lg"
              >
                {searchResults.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[11.5px] text-[#9a9a9a]">No services found</p>
                ) : (
                  searchResults.map((svc) => {
                    const qty = selectedQty(svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => onAddOrBump(svc)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all",
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
                          <p className="truncate text-[10px] text-[#9a9a9a]">
                            {svc.categoryLabel || svc.serviceGroup}
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
          <div className="rounded-2xl border border-[#D4AF37]/25 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">
                Cart ({selectedServices.reduce((n, s) => n + s.qty, 0)} items)
              </p>
              <span className="text-[12px] font-bold text-[#111118]">
                ₹{selectedServices.reduce((sum, s) => sum + s.price * s.qty, 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="space-y-2">
              {selectedServices.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#111118]">
                    {s.displayName || s.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onBumpQty(s.id, -1)}
                      className="h-6 w-6 rounded-md border border-black/[0.1] text-[12px] font-bold"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-[11px] font-bold">{s.qty}</span>
                    <button
                      type="button"
                      onClick={() => onBumpQty(s.id, 1)}
                      className="h-6 w-6 rounded-md border border-black/[0.1] text-[12px] font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-16 text-right text-[11px] font-bold text-[#111118]">
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
