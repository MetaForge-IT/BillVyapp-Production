import { motion } from "framer-motion";
import { Check, CalendarCheck2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import type { SelectedService } from "./newAppointmentDraft";

type BookingSuccessScreenProps = {
  isWalkInPage: boolean;
  displayName: string;
  dateFormatted: string;
  time: string;
  selectedServices: SelectedService[];
  estimatedDuration: number;
  onReset: () => void;
};

export function BookingSuccessScreen({
  isWalkInPage,
  displayName,
  dateFormatted,
  time,
  selectedServices,
  estimatedDuration,
  onReset,
}: BookingSuccessScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="-mx-6 -my-6 flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-[#f4f2ed] px-6 py-12 sm:-mx-8 lg:-mx-10">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-3xl bg-white px-10 py-10 text-center shadow-2xl shadow-black/10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 18 }}
          className="mb-6 flex justify-center"
        >
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#D4AF37]/30 bg-[#D4AF37]/10 shadow-[0_0_40px_rgba(212,175,55,0.18)]">
              <CalendarCheck2 className="h-9 w-9 text-[#D4AF37]" />
            </div>
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#111118]">
              <Check className="h-3 w-3 text-[#D4AF37]" strokeWidth={3} />
            </div>
          </div>
        </motion.div>
        <h2 className="mb-1.5 text-xl font-bold text-[#111118]">
          {isWalkInPage ? "Walk-in Saved!" : "Appointment Booked!"}
        </h2>
        <p className="mb-7 text-[13px] leading-relaxed text-[#52525b]">
          <span className="font-semibold text-[#111118]">{displayName || "Customer"}</span>
          {isWalkInPage ? " is checked in." : "'s slot is confirmed."}
        </p>
        <div className="mb-5 space-y-2 rounded-2xl border border-black/[0.06] bg-[#faf9f7] p-4 text-left">
          {(
            [
              { label: "Date", value: dateFormatted },
              { label: "Time", value: time },
              { label: "Services", value: `${selectedServices.length} selected` },
              estimatedDuration > 0
                ? { label: "Est. Duration", value: `${estimatedDuration} min` }
                : null,
            ] as Array<{ label: string; value: string } | null>
          )
            .filter(Boolean)
            .map((row) => (
              <div key={row!.label} className="flex justify-between">
                <span className="text-[11px] text-[#52525b]">{row!.label}</span>
                <span className="text-[12px] font-semibold text-[#111118]">{row!.value}</span>
              </div>
            ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {isWalkInPage ? (
            <>
              <Button
                onClick={() => navigate("/appointments?type=walk-in")}
                variant="outline"
                className="h-11 rounded-xl border-black/[0.1] text-[13px] font-semibold"
              >
                Appointments
              </Button>
              <Button
                onClick={() => {
                  onReset();
                  navigate("/walk-in");
                }}
                className="h-11 rounded-xl bg-[#111118] text-[13px] font-semibold text-[#D4AF37] hover:bg-[#1e1e1e]"
              >
                + New Walk-In
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => navigate("/appointments")}
                variant="outline"
                className="h-11 rounded-xl border-black/[0.1] text-[13px] font-semibold"
              >
                Appointments
              </Button>
              <Button
                onClick={onReset}
                className="h-11 rounded-xl bg-[#111118] text-[13px] font-semibold text-[#D4AF37] hover:bg-[#1e1e1e]"
              >
                + New Booking
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
