import type {
  SendWhatsAppOtpInput,
  SendWhatsAppTextInput,
  WhatsAppDeliveryResult,
} from "./whatsapp.types";

/**
 * Transport-agnostic WhatsApp Business API provider contract.
 */
export interface WhatsAppProvider {
  readonly name: string;
  sendText(input: SendWhatsAppTextInput): Promise<WhatsAppDeliveryResult>;
  sendOtp(input: SendWhatsAppOtpInput): Promise<WhatsAppDeliveryResult>;
}
