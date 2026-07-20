import { ArrowLeft } from "lucide-react";
import { cn } from "../ui/utils";

interface PageBackButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export function PageBackButton({ onClick, className, label = "Go back" }: PageBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] text-white/75",
        "hover:border-[#D4AF37]/45 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all duration-200 shrink-0",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
