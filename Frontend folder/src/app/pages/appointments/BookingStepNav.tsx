import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";

type BookingStepNavProps = {
  activeStep: number;
  stepValid: boolean[];
  onBack: () => void;
  onContinue: () => void;
};

export function BookingStepNav({
  activeStep,
  stepValid,
  onBack,
  onContinue,
}: BookingStepNavProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-black/[0.06] bg-white px-4 py-3">
      <Button
        variant="outline"
        disabled={activeStep === 0}
        onClick={onBack}
        className="h-12 rounded-2xl border-black/[0.1] px-4 text-[13px] font-semibold disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>
      {activeStep < 2 ? (
        <Button
          disabled={!stepValid[activeStep]}
          onClick={onContinue}
          className="h-12 flex-1 gap-2 rounded-2xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] shadow-lg hover:bg-[#1e1e1e] disabled:opacity-30"
        >
          {activeStep === 0 ? "Continue to services" : "Continue to confirm"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        <p className="flex-1 text-center text-[11.5px] font-medium text-[#52525b]">
          Review the summary above, then save
        </p>
      )}
    </div>
  );
}
