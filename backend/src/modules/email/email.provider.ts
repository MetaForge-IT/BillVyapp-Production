import type { SendEmailInput } from "./email.types";

/**
 * Transport-agnostic email provider contract.
 * Swap SMTP for SendGrid, SES, or Mailgun by implementing this interface.
 */
export interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
