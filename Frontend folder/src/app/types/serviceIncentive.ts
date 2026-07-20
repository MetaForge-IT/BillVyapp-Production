export type IncentiveType = "fixed" | "percentage";

export interface ServiceIncentiveSettings {
  enabled: boolean;
  type: IncentiveType;
  value: number;
}

export const DEFAULT_SERVICE_INCENTIVE: ServiceIncentiveSettings = {
  enabled: false,
  type: "percentage",
  value: 10,
};

export interface EarnedIncentive {
  id: string;
  employeeName: string;
  serviceName: string;
  customerName: string;
  serviceAmount: number;
  incentiveAmount: number;
  incentiveType: IncentiveType;
  incentiveValue: number;
  receiptRef: string;
  date: string;
  time: string;
}

export interface BillingIncentiveItem {
  name: string;
  rate: number;
  qty: number;
  staff?: string;
}

export function computeIncentiveAmount(
  settings: ServiceIncentiveSettings,
  lineTotal: number,
  qty: number,
): number {
  if (!settings.enabled || settings.value <= 0) return 0;
  if (settings.type === "fixed") {
    return Math.round(settings.value * qty);
  }
  return Math.round((lineTotal * settings.value) / 100);
}
