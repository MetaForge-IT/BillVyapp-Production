import { authConfig } from "../../config/auth.config";
import { emailConfig } from "../../config/email.config";
import { compareTokenHash } from "../../utils/crypto";
import { AppError } from "../../utils/errors";
import { emailService, type EmailService } from "../email/email.service";
import { notificationService, type NotificationService } from "../notifications/notification.service";
import { AUTH_ERROR_CODES } from "./auth.constants";
import { tokenService, type TokenService } from "./token.service";
import {
  verificationRepository,
  type VerificationRepository,
  type VerificationUserRecord,
} from "./verification.repository";

export interface VerifyEmailResult {
  message: string;
  loginUrl: string;
}

/**
 * Email verification business logic (link + OTP + resend).
 */
export class VerificationService {
  constructor(
    private readonly repository: VerificationRepository = verificationRepository,
    private readonly tokens: TokenService = tokenService,
    private readonly emails: EmailService = emailService,
    private readonly notifications: NotificationService = notificationService,
  ) {}

  /**
   * Issues a fresh verification token pair and sends the verification email.
   */
  async sendVerificationEmail(user: VerificationUserRecord): Promise<void> {
    const rawLinkToken = this.tokens.generateEmailVerificationLinkToken();
    const rawOtp = this.tokens.generateEmailVerificationOtp();

    await this.repository.invalidateActiveTokens(user.id);
    await this.repository.createVerificationToken({
      userId: user.id,
      linkTokenHash: this.tokens.hashEmailVerificationLinkToken(rawLinkToken),
      otpHash: this.tokens.hashEmailVerificationOtp(rawOtp),
      linkExpiresAt: this.tokens.calculateEmailVerificationLinkExpiry(),
      otpExpiresAt: this.tokens.calculateEmailVerificationOtpExpiry(),
    });

    await this.notifications.sendRegistrationVerification({
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      salonName: user.salon.name,
      verificationUrl: this.emails.buildVerificationUrl(rawLinkToken),
      otp: rawOtp,
      loginUrl: this.emails.buildLoginUrl(),
    });
  }

  async verifyByLink(rawToken: string): Promise<VerifyEmailResult> {
    const tokenHash = this.tokens.hashEmailVerificationLinkToken(rawToken);
    const storedToken = await this.repository.findActiveTokenByLinkHash(tokenHash);

    this.assertLinkTokenIsValid(storedToken);

    const user = await this.repository.findUserByIdForVerification(storedToken!.userId);
    if (!user) {
      throw this.invalidVerificationError();
    }

    if (user.emailVerifiedAt) {
      return this.alreadyVerifiedResult();
    }

    await this.completeVerification(storedToken!.id, user);
    return this.successResult();
  }

  async verifyByOtp(email: string, rawOtp: string): Promise<VerifyEmailResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.repository.findUserForVerification(normalizedEmail);

    if (!user || user.emailVerifiedAt) {
      throw this.invalidOtpError();
    }

    const storedToken = await this.repository.findLatestActiveTokenByUserId(user.id);
    if (!storedToken) {
      throw this.invalidOtpError();
    }

    if (storedToken.otpAttempts >= authConfig.verificationOtpMaxAttempts) {
      throw new AppError(429, "Too many OTP attempts. Please request a new verification code.", {
        code: AUTH_ERROR_CODES.VERIFICATION_OTP_MAX_ATTEMPTS,
      });
    }

    if (storedToken.otpExpiresAt.getTime() <= Date.now()) {
      throw new AppError(400, "Verification code has expired. Please request a new one.", {
        code: AUTH_ERROR_CODES.VERIFICATION_OTP_EXPIRED,
      });
    }

    const otpMatches = compareTokenHash(rawOtp, storedToken.otpHash);
    if (!otpMatches) {
      await this.repository.incrementOtpAttempts(storedToken.id);
      throw this.invalidOtpError();
    }

    await this.completeVerification(storedToken.id, user);
    return this.successResult();
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.repository.findUserForVerification(normalizedEmail);

    if (!user || user.emailVerifiedAt) {
      return this.genericResendMessage();
    }

    const latestToken = await this.repository.findLatestActiveTokenByUserId(user.id);
    if (latestToken) {
      const cooldownMs = authConfig.verificationResendCooldownSeconds * 1000;
      const elapsed = Date.now() - latestToken.lastSentAt.getTime();

      if (elapsed < cooldownMs) {
        throw new AppError(429, "Please wait before requesting another verification email.", {
          code: AUTH_ERROR_CODES.VERIFICATION_RESEND_COOLDOWN,
        });
      }
    }

    await this.sendVerificationEmail(user);

    return this.genericResendMessage();
  }

  private async completeVerification(
    tokenId: bigint,
    user: NonNullable<Awaited<ReturnType<VerificationRepository["findUserByIdForVerification"]>>>,
  ): Promise<void> {
    await this.repository.markTokenUsed(tokenId);
    await this.repository.invalidateActiveTokens(user.id);
    await this.repository.activateVerifiedUser(user.id);

    await this.emails.sendEmailVerified(
      { email: user.email, name: user.fullName },
      {
        managerName: user.fullName,
        salonName: user.salon.name,
        loginUrl: this.emails.buildLoginUrl(),
        supportEmail: emailConfig.supportEmail,
      },
    );
  }

  private assertLinkTokenIsValid(
    token: Awaited<ReturnType<VerificationRepository["findActiveTokenByLinkHash"]>>,
  ): void {
    if (!token) {
      throw this.invalidVerificationError();
    }

    if (token.linkExpiresAt.getTime() <= Date.now()) {
      throw this.invalidVerificationError();
    }
  }

  private successResult(): VerifyEmailResult {
    return {
      message: "Email verified successfully. You can now sign in.",
      loginUrl: this.emails.buildLoginUrl(),
    };
  }

  private alreadyVerifiedResult(): VerifyEmailResult {
    return {
      message: "Email is already verified. You can sign in.",
      loginUrl: this.emails.buildLoginUrl(),
    };
  }

  private genericResendMessage(): { message: string } {
    return {
      message:
        "If an account with that email exists and is not yet verified, a new verification email has been sent.",
    };
  }

  private invalidVerificationError(): AppError {
    return new AppError(400, "Invalid or expired verification link", {
      code: AUTH_ERROR_CODES.VERIFICATION_TOKEN_INVALID,
    });
  }

  private invalidOtpError(): AppError {
    return new AppError(400, "Invalid verification code", {
      code: AUTH_ERROR_CODES.VERIFICATION_OTP_INVALID,
    });
  }
}

export const verificationService = new VerificationService();
