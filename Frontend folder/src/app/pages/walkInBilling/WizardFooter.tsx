import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";

interface WizardFooterProps {
  activeStep: number;
  stepValid: boolean[];
  onBack: () => void;
  onNext: () => void;
}

export function WizardFooter({ activeStep, stepValid, onBack, onNext }: WizardFooterProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-black/[0.06] bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <Button
        variant="outline"
        disabled={activeStep === 0}
        onClick={onBack}
        className="h-12 touch-manipulation rounded-2xl border-black/[0.1] px-3 text-[13px] font-semibold disabled:opacity-30 sm:px-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>
      {activeStep < 2 ? (
        <Button
          disabled={!stepValid[activeStep]}
          onClick={onNext}
          className="h-12 flex-1 touch-manipulation gap-2 rounded-2xl bg-[#111118] text-[12px] font-bold text-[#D4AF37] hover:bg-[#1e1e1e] disabled:opacity-30 sm:text-[13px]"
        >
          {activeStep === 0 ? "Continue to customer" : "Continue to bill"}
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Button>
      ) : (
        <p className="flex-1 text-center text-[11.5px] font-medium text-[#52525b]">
          Review & pay above
        </p>
      )}
    </div>
  );
}
