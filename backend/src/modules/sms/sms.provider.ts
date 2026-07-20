import type { SendOtpSmsInput, SendSmsInput, SmsDeliveryResult } from "./sms.types";

/**
 * Transport-agnostic SMS provider contract.
 * Swap Twilio, MSG91, or Textlocal without changing business logic.
 */
export interface SmsProvider {
  readonly name: string;
  sendSms(input: SendSmsInput): Promise<SmsDeliveryResult>;
  sendOtp(input: SendOtpSmsInput): Promise<SmsDeliveryResult>;
}
