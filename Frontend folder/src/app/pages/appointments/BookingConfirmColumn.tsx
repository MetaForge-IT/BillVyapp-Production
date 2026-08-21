import {
  User, Calendar, ClipboardCheck, Scissors, Clock, Sparkles, StickyNote,
  CalendarCheck2, Receipt,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { cn } from "../../components/ui/utils";
import { ColHeader } from "../walkInBilling/ColHeader";
import type { AppointmentType } from "./appointmentData";
import type {
  SelectedPackage,
  SelectedProduct,
  SelectedService,
} from "./newAppointmentDraft";
import { initials } from "./newAppointmentUi";

export type BookingConfirmColumnProps = {
  customerValid: boolean;
  displayName: string;
  displayPhone: string;
  visitType: AppointmentType;
  dateFormatted: string;
  time: string;
  duration: string;
  notes: string;
  totalSelectedCount: number;
  selectedServices: SelectedService[];
  selectedPackages: SelectedPackage[];
  selectedProducts: SelectedProduct[];
  estimatedDuration: number;
  isWalkInPage: boolean;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onBill: () => void;
};

export function BookingConfirmColumn({
  customerValid,
  displayName,
  displayPhone,
  visitType,
  dateFormatted,
  time,
  duration,
  notes,
  totalSelectedCount,
  selectedServices,
  selectedPackages,
  selectedProducts,
  estimatedDuration,
  isWalkInPage,
  canSave,
  saving,
  onSave,
  onBill,
}: BookingConfirmColumnProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "responsive-panel relative flex flex-col overflow-hidden bg-[#f4f2ed] transition-all duration-300",
        !customerValid && "pointer-events-none select-none",
      )}
    >
      {!customerValid && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f4f2ed]/70 backdrop-blur-[1px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#111118]/10 bg-[#111118]/08">
            <ClipboardCheck className="h-5 w-5 text-[#111118]/20" />
          </div>
          <p className="text-[12px] font-bold text-[#111118]/30">Fill in customer first</p>
        </div>
      )}
      <ColHeader num="03" icon={ClipboardCheck} title="Confirm" desc="Review & save the slot" />

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div
          className={cn(
            "rounded-2xl border p-4",
            customerValid
              ? "border-[#D4AF37]/25 bg-white shadow-[0_2px_12px_rgba(212,175,55,0.07)]"
              : "border-black/[0.07] bg-white",
          )}
        >
          <p className="mb-3 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a]">
            <User className="h-3 w-3 text-[#D4AF37]" /> Customer
          </p>
          {customerValid ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-sm font-bold text-[#111118]">
                {initials(displayName)}
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#111118]">{displayName}</p>
                {displayPhone && (
                  <p className="mt-0.5 text-[11px] text-[#9a9a9a]">{displayPhone}</p>
                )}
              </div>
              <div className="ml-auto rounded-full border border-black/[0.06] bg-[#f4f2ed] px-2 py-1">
                <p className="text-[10px] font-semibold text-[#9a9a9a]">{visitType}</p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] italic text-[#c0c0c0]">← Fill in customer details</p>
          )}
        </div>

        <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a]">
            <Calendar className="h-3 w-3 text-[#D4AF37]" /> Slot
          </p>
          {[
            { label: "Date", v: dateFormatted || "—" },
            { label: "Time", v: time || "—" },
            { label: "Duration", v: duration || "—" },
          ].map(({ label, v }) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-black/[0.04] py-1.5 last:border-0"
            >
              <span className="text-[10.5px] text-[#9a9a9a]">{label}</span>
              <span className="text-[11.5px] font-semibold text-[#111118]">{v}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a]">
            <Scissors className="h-3 w-3 text-[#D4AF37]" /> Selection ({totalSelectedCount})
          </p>
          {totalSelectedCount === 0 ? (
            <p className="text-[12px] italic text-[#c0c0c0]">
              ← Select services, packages or products
            </p>
          ) : (
            <div className="space-y-2">
              {selectedServices.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br",
                      s.tone ?? "from-[#9a9a9a] to-[#6b6b6b]",
                    )}
                  >
                    <Scissors className="h-2.5 w-2.5 text-white/80" />
                  </div>
                  <span className="flex-1 truncate text-[11.5px] text-[#111118]">{s.name}</span>
                  <span className="shrink-0 text-[10px] text-[#9a9a9a]">{s.duration}m</span>
                  <span className="text-[11px] font-bold text-[#111118]">
                    ₹{s.price.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
              {selectedPackages.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br",
                      p.tone,
                    )}
                  >
                    <Sparkles className="h-2.5 w-2.5 text-white/80" />
                  </div>
                  <span className="flex-1 truncate text-[11.5px] text-[#111118]">{p.name}</span>
                  <span className="shrink-0 text-[10px] text-[#9a9a9a]">{p.duration}m</span>
                  <span className="text-[11px] font-bold text-[#111118]">
                    ₹{p.price.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
              {selectedProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#D4AF37]/20">
                    <Sparkles className="h-2.5 w-2.5 text-[#b8962e]" />
                  </div>
                  <span className="flex-1 truncate text-[11.5px] text-[#111118]">{p.name}</span>
                  <span className="shrink-0 text-[10px] text-[#9a9a9a]">{p.category}</span>
                  <span className="text-[11px] font-bold text-[#111118]">
                    ₹{p.price.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
              {estimatedDuration > 0 && (
                <div className="flex justify-between border-t border-black/[0.04] pt-2">
                  <span className="text-[10px] text-[#9a9a9a]">Est. duration</span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#111118]">
                    <Clock className="h-3 w-3 text-[#D4AF37]" /> ~{estimatedDuration} min
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {notes && (
          <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.15em] text-[#9a9a9a]">
              <StickyNote className="h-3 w-3 text-[#D4AF37]" /> Notes
            </p>
            <p className="text-[12px] leading-relaxed text-[#6b6b6b]">{notes}</p>
          </div>
        )}

        {isWalkInPage ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={onSave}
              disabled={!canSave || saving}
              variant="outline"
              className="h-12 gap-2 rounded-2xl border-[#D4AF37]/45 text-[13px] font-bold text-[#111118] disabled:opacity-30"
            >
              <CalendarCheck2 className="h-4 w-4" />
              {saving ? "Saving…" : "Save Walk-In"}
            </Button>
            <Button
              onClick={onBill}
              disabled={!canSave || saving}
              className="h-12 gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[13px] font-bold text-[#111118] shadow-lg shadow-[#D4AF37]/20 disabled:opacity-30"
            >
              <Receipt className="h-4 w-4" />
              {saving ? "Opening…" : "Bill"}
            </Button>
          </div>
        ) : (
          <Button
            onClick={onSave}
            disabled={!canSave || saving}
            className="h-12 w-full gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[14px] font-bold text-[#111118] shadow-lg shadow-[#D4AF37]/20 transition-all hover:shadow-[#D4AF37]/30 disabled:opacity-30"
          >
            <CalendarCheck2 className="h-4 w-4" />
            {saving ? "Saving…" : "Create Appointment"}
          </Button>
        )}

        {!canSave && (
          <p className="-mt-2 text-center text-[11px] text-[#9a9a9a]">
            {!customerValid
              ? "← Add a customer to continue"
              : "← Select at least one service"}
          </p>
        )}

        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="h-10 w-full rounded-xl border-black/[0.1] text-[13px] font-medium text-[#9a9a9a]"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
