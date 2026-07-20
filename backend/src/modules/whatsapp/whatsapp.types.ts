export interface SendWhatsAppTextInput {
  to: string;
  message: string;
}

export interface SendWhatsAppOtpInput {
  to: string;
  otp: string;
  managerName?: string;
  salonName?: string;
  expiresMinutes?: number;
}

export interface WhatsAppDeliveryResult {
  provider: string;
  messageId?: string;
}
