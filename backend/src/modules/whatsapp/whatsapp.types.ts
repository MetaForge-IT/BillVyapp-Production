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

export interface SendWhatsAppTemplateInput {
  to: string;
  templateName: string;
  templateLanguage?: string;
  /** Body variables in order → field_1, field_2, … */
  fields: string[];
  headerImageUrl?: string;
  headerDocumentUrl?: string;
  headerVideoUrl?: string;
  headerField1?: string;
  headerText?: string;
}

export interface WhatsAppDeliveryResult {
  provider: string;
  messageId?: string;
}
