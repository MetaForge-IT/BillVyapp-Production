import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../ui/utils";
import { Loader2 } from "lucide-react";

interface SmartActionCardProps {
  label: string;
  description?: string;
  icon: LucideIcon;
  onClick?: () => void;
  primary?: boolean;
}

export function SmartActionCard({ label, description, icon: Icon, onClick, primary }: SmartActionCardProps) {
  const [loading, setLoading] = useState(false);
  const [rippling, setRippling] = useState(false);

  const handleClick = () => {
    setRippling(true);
    setLoading(true);
    setTimeout(() => setRippling(false), 400);
    setTimeout(() => setLoading(false), 600);
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(18,18,18,0.08)] active:scale-[0.98]",
        primary
          ? "bg-[#121212] border-[#D4AF37]/30 text-white"
          : "bg-white border-[#D4AF37]/20 hover:border-[#D4AF37]/45"
      )}
    >
      {rippling && (
        <span className="absolute inset-0 bg-[#D4AF37]/10 animate-ping rounded-2xl pointer-events-none" />
      )}
      <div className="flex items-start gap-3 relative z-10">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
            primary ? "bg-[#D4AF37]/20" : "bg-[#FAF8F2] border border-[#D4AF37]/15"
          )}
        >
          {loading ? (
            <Loader2 className={cn("h-5 w-5 animate-spin", primary ? "text-[#D4AF37]" : "text-[#121212]")} />
          ) : (
            <Icon className={cn("h-5 w-5 transition-colors", primary ? "text-[#D4AF37]" : "text-[#121212] group-hover:text-[#D4AF37]")} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold text-sm", primary ? "text-white" : "text-[#121212]")}>{label}</p>
          {description && (
            <p className={cn("text-xs mt-0.5 line-clamp-2", primary ? "text-white/60" : "text-[#3f3f46]")}>{description}</p>
          )}
        </div>
      </div>
    </button>
  );
}
