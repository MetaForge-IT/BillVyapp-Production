import type { ApptStatus } from "../../../../api/appointments";
import {
  findCatalogService,
  resolveServicePrice,
  type CatalogService,
} from "../../../../lib/serviceCatalog";
import { createPaymentMethodValue } from "../../../components/shared/PaymentMethodPicker";
import type { AppointmentStatus, WalkinStatus } from "./boardTypes";

/** Counter staff settle almost every bill by QR, so checkout opens on UPI. */
export const createDefaultBillPayment = () => createPaymentMethodValue({ method: "upi" });

export function toApiStatus(status: AppointmentStatus | WalkinStatus): ApptStatus {
  if (status === "in-service") return "in-progress";
  if (status === "done") return "completed";
  if (status === "checked-in") return "confirmed";
  return status as ApptStatus;
}

export const DIRECT_BILL_TIER_BADGE: Record<string, string> = {
  Platinum: "bg-[#111118] text-[#D4AF37] border-transparent",
  Gold: "bg-[#D4AF37]/15 text-[#B8962E] border-[#D4AF37]/20",
  Silver: "bg-black/[0.06] text-[#6b6b6b] border-black/[0.08]",
  Basic: "bg-black/[0.04] text-[#9a9a9a] border-black/[0.05]",
};

export function membershipTierLabel(tier: string): string {
  switch (tier.toLowerCase()) {
    case "platinum":
      return "Platinum";
    case "gold":
      return "Gold";
    case "silver":
      return "Silver";
    default:
      return "Basic";
  }
}

export function buildAppointmentServicePayload(
  catalog: CatalogService[],
  serviceName: string,
  fallbackDuration = 30,
) {
  const match = findCatalogService(catalog, serviceName);
  return {
    serviceId: match?.id,
    itemName: serviceName,
    price: match?.price ?? resolveServicePrice(catalog, serviceName),
    durationMinutes: match?.duration ?? fallbackDuration,
  };
}

/** Normalize an appointment's service list (supports legacy single `service` string). */
export function appointmentServiceNames(appt: {
  service: string;
  services?: string[];
}): string[] {
  if (appt.services && appt.services.length > 0) {
    return appt.services;
  }
  return appt.service
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function totalDurationForServices(catalog: CatalogService[], names: string[]): number {
  return names.reduce((sum, name) => {
    const match = findCatalogService(catalog, name);
    return sum + (match?.duration ?? 30);
  }, 0);
}

export function customerInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}
