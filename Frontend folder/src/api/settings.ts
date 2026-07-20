import { apiClient } from "../lib/axios";

export interface SalonProfileDto {
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  logoUrl: string;
  timezone: string;
  currency: string;
}

export interface BusinessHoursDto {
  [day: string]: { open: string; close: string; closed: boolean };
}

export interface FinancialSettingsDto {
  gstEnabled: boolean;
  defaultGstRate: number;
  loyaltyPointsPerRupee: number;
  loyaltyRupeePerPoint: number;
  maxDiscountPercent: number;
  roundOffMode: string;
  receiptPrefix: string;
}

export interface NotificationSettingsDto {
  lowStockAlerts: boolean;
  lowStockThresholdQty: number;
  appointmentReminderEnabled: boolean;
  reminderMinutesBefore: number;
  dailySummaryEnabled: boolean;
  dailySummaryTime: string;
  paymentAlerts: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
}

export interface AppSettingsDto {
  salon: SalonProfileDto;
  businessHours: BusinessHoursDto;
  financial: FinancialSettingsDto;
  notifications: NotificationSettingsDto;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchSettings(): Promise<AppSettingsDto> {
  const { data } = await apiClient.get<ApiEnvelope<AppSettingsDto>>("/settings");
  return data.data;
}

export async function updateSettings(payload: Partial<AppSettingsDto>): Promise<AppSettingsDto> {
  const { data } = await apiClient.patch<ApiEnvelope<AppSettingsDto>>("/settings", payload);
  return data.data;
}
