import type { AppointmentService } from "../appointments/appointmentData";

export type SelectedService = AppointmentService & { qty: number };

export type DiscountTool = "coupon" | "loyalty" | "manual";

export type LookupStatus = "idle" | "loading" | "found" | "new";

export type CustomerGender = "Male" | "Female" | "Other" | "";

export type CouponApplied = { code: string; value: number; type: "%" | "₹" };

export const NO_DISCOUNT_TOOLS: Record<DiscountTool, boolean> = {
  coupon: false,
  loyalty: false,
  manual: false,
};
