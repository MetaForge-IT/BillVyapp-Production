export interface EmailAddress {
  email: string;
  name?: string;
}

export interface SendEmailInput {
  to: EmailAddress;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailVerificationTemplateData {
  managerName: string;
  salonName: string;
  verificationUrl: string;
  otp: string;
  loginUrl: string;
  supportEmail: string;
  linkExpiresHours: number;
  otpExpiresMinutes: number;
}

export interface EmailVerifiedTemplateData {
  managerName: string;
  salonName: string;
  loginUrl: string;
  supportEmail: string;
}

export interface PasswordResetTemplateData {
  managerName: string;
  resetUrl: string;
  supportEmail: string;
  expiresHours: number;
}

export interface PasswordChangedTemplateData {
  managerName: string;
  loginUrl: string;
  supportEmail: string;
}

export interface LoginOtpTemplateData {
  fullName: string;
  otp: string;
  loginUrl: string;
  supportEmail: string;
  otpExpiresMinutes: number;
}
