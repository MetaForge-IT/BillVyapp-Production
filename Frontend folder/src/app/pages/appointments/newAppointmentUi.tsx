import type { AppointmentCustomer } from "./appointmentData";

export const tierBadge: Record<AppointmentCustomer["tier"], string> = {
  VIP: "bg-[#111118] text-[#D4AF37] border-transparent",
  Gold: "bg-[#D4AF37]/15 text-[#B8962E] border-[#D4AF37]/20",
  Silver: "bg-black/[0.06] text-[#6b6b6b] border-black/[0.08]",
  Regular: "bg-black/[0.04] text-[#9a9a9a] border-black/[0.05]",
};

export const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function Label({ children, required }: { children: string; required?: boolean }) {
  return (
    <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#9a9a9a]">
      {children}
      {required && <span className="ml-0.5 text-[#D4AF37]">*</span>}
    </p>
  );
}

export function mapCustomerTier(tier: string): AppointmentCustomer["tier"] {
  if (tier === "platinum") return "VIP";
  if (tier === "gold") return "Gold";
  if (tier === "silver") return "Silver";
  return "Regular";
}
