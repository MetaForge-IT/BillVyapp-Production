export interface SendSmsInput {
  to: string;
  message: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
}

export interface SendOtpSmsInput {
  to: string;
  otp: string;
  managerName?: string;
  salonName?: string;
  expiresMinutes?: number;
}

export interface SmsDeliveryResult {
  provider: string;
  messageId?: string;
}
