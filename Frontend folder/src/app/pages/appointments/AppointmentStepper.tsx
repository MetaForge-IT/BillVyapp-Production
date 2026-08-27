import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "../../components/ui/utils";
import { appointmentSteps } from "./appointmentData";

interface AppointmentStepperProps {
  currentStep: number;
  stepValid: boolean[];
  onStepClick: (index: number) => void;
  steps?: readonly string[];
}

export function AppointmentStepper({
  currentStep,
  stepValid,
  onStepClick,
  steps: stepsProp,
}: AppointmentStepperProps) {
  const steps = stepsProp ? [...stepsProp] : [...appointmentSteps];
  const total = steps.length;

  const canGoToStep = (index: number) => {
    for (let i = 0; i < index; i++) {
      if (!stepValid[i]) return false;
    }
    return true;
  };

  /** Fill ratio along the track (0 at step 0 → 1 at last step) */
  const fillRatio = total > 1 ? currentStep / (total - 1) : 0;

  return (
    <nav aria-label="Appointment progress" className="w-full">
      <div className="relative px-2 sm:px-4">
        {/* ── Track: background + animated gold fill ── */}
        <div
          className="absolute top-[15px] left-[10%] right-[10%] h-[2px] rounded-full bg-black/[0.07] overflow-hidden"
          aria-hidden
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#C9A227] via-[#D4AF37] to-[#E8C84A]"
            initial={false}
            animate={{ width: `${fillRatio * 100}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        {/* ── Steps ── */}
        <ol className="relative flex items-start justify-between">
          {steps.map((label, i) => {
            const isComplete = i < currentStep;
            const isCurrent = i === currentStep;
            const isClickable = canGoToStep(i);
            const isLocked = !isClickable && !isCurrent;

            return (
              <li key={label} className="flex flex-col items-center flex-1 min-w-0 z-10">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(i)}
                  disabled={isLocked}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${label}`}
                  className={cn(
                    "flex flex-col items-center gap-2 group transition-opacity",
                    isClickable ? "cursor-pointer" : "cursor-not-allowed",
                    isLocked && "opacity-45",
                  )}
                >
                  <motion.div
                    layout
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors duration-300",
                      isComplete && "bg-[#111118] border-[#111118] text-[#D4AF37] shadow-[0_2px_8px_rgba(17,17,24,0.15)]",
                      isCurrent &&
                        !isComplete &&
                        "bg-[#D4AF37] border-[#D4AF37] text-[#111118] shadow-[0_0_0_4px_rgba(212,175,55,0.22)] scale-110",
                      !isComplete &&
                        !isCurrent &&
                        "bg-white border-black/[0.1] text-[#52525b] group-hover:border-[#D4AF37]/40",
                    )}
                  >
                    {isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </motion.div>

                  <span
                    className={cn(
                      "text-[11px] sm:text-xs font-medium text-center leading-tight max-w-[72px] sm:max-w-none truncate px-0.5",
                      isCurrent && "text-[#111118] font-semibold",
                      isComplete && "text-[#111118]",
                      !isCurrent && !isComplete && "text-[#52525b]",
                    )}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
