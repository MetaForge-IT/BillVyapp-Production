import { BRAND } from "../../config/brand";
import { cn } from "../ui/utils";

const sizeClass = {
  sm: "h-12",
  md: "h-16",
  lg: "h-24",
  xl: "h-32",
} as const;

export function BrandLogo({
  size = "md",
  className,
  glow = false,
}: {
  size?: keyof typeof sizeClass;
  className?: string;
  glow?: boolean;
}) {
  return (
    <img
      src={BRAND.platformLogo}
      alt={BRAND.appName}
      className={cn(
        "w-auto object-contain",
        sizeClass[size],
        glow && "drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]",
        className,
      )}
    />
  );
}
