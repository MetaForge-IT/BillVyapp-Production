import { AUTH_ERROR_CODES, AUTH_TOKEN_TYPES } from "./auth.constants";
import {
  authRepository,
  type AuthRepository,
  type RefreshTokenRecord,
  type UserCredentialsRecord,
  type UserRecord,
} from "./auth.repository";
import { passwordService, type PasswordService } from "./password.service";
import { tokenService, type TokenService } from "./token.service";
import type { AuthUser, LoginRequest, SessionMetadata } from "./auth.types";
import { emailService, type EmailService } from "../email/email.service";
import { emailConfig } from "../../config/email.config";
import { authConfig } from "../../config/auth.config";
import { AppError, NotFoundError } from "../../utils/errors";
import { compareTokenHash } from "../../utils/crypto";
import { logger } from "../../utils/logger";

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  tokenType: string;
  user: AuthUser;
  rememberMe: boolean;
}

export interface LoginOtpChallengeResult {
  requiresOtp: true;
  challengeId: string;
  expiresIn: number;
  message: string;
  emailHint: string;
  /** Present only when LOGIN_OTP_RETURN_IN_RESPONSE=true in development. */
  otp?: string;
}

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  tokenType: string;
}

/**
 * Authentication business logic orchestrating repository and crypto services.
 */
export class AuthService {
  constructor(
    private readonly repository: AuthRepository = authRepository,
    private readonly passwords: PasswordService = passwordService,
    private readonly tokens: TokenService = tokenService,
    private readonly emails: EmailService = emailService,
  ) {}

  /**
   * Validates credentials and starts a login OTP challenge (no JWT yet).
   */
  async login(
    credentials: LoginRequest,
    _session: SessionMetadata = {},
  ): Promise<LoginOtpChallengeResult> {
    const user = await this.repository.findUserByEmail(credentials.email);

    if (!user) {
      throw this.invalidCredentialsError();
    }

    const passwordMatches = await this.passwords.comparePassword(
      credentials.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw this.invalidCredentialsError();
    }

    if (!user.emailVerifiedAt) {
      throw new AppError(403, "Please verify your email before logging in.", {
        code: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
      });
    }

    if (!user.isActive) {
      throw new AppError(403, "Account is inactive", {
        code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
      });
    }

    await this.repository.invalidateOpenLoginOtpChallenges(user.id);

    const rawOtp = this.tokens.generateEmailVerificationOtp();
    const otpHash = this.tokens.hashEmailVerificationOtp(rawOtp);
    const expiresAt = this.tokens.calculateLoginOtpExpiry();
    const expiresIn = this.tokens.parseDurationToSeconds(authConfig.loginOtpExpiresIn);

    const challenge = await this.repository.createLoginOtpChallenge({
      userId: user.id,
      otpHash,
      expiresAt,
      rememberMe: credentials.rememberMe ?? false,
    });

    await this.sendLoginOtpEmail(user, rawOtp);

    const result: LoginOtpChallengeResult = {
      requiresOtp: true,
      challengeId: challenge.id,
      expiresIn,
      message: "Enter the verification code sent to your email.",
      emailHint: this.maskEmail(user.email),
    };

    if (authConfig.loginOtpReturnInResponse) {
      result.otp = rawOtp;
      logger.info("Login OTP returned in API response (development only)", {
        challengeId: challenge.id,
        email: user.email,
      });
    }

    return result;
  }

  /**
   * Verifies a login OTP and issues the access/refresh token pair.
   */
  async verifyLoginOtp(
    challengeId: string,
    rawOtp: string,
    session: SessionMetadata = {},
  ): Promise<LoginResult> {
    const challenge = await this.repository.findLoginOtpChallengeById(challengeId);

    if (!challenge || challenge.consumedAt) {
      throw this.invalidLoginOtpError();
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.repository.consumeLoginOtpChallenge(challenge.id);
      throw new AppError(400, "Invalid or expired OTP", {
        code: AUTH_ERROR_CODES.LOGIN_OTP_EXPIRED,
      });
    }

    if (challenge.attempts >= authConfig.verificationOtpMaxAttempts) {
      await this.repository.consumeLoginOtpChallenge(challenge.id);
      throw new AppError(400, "Too many invalid OTP attempts. Please sign in again.", {
        code: AUTH_ERROR_CODES.LOGIN_OTP_MAX_ATTEMPTS,
      });
    }

    const otpMatches = compareTokenHash(rawOtp, challenge.otpHash);

    if (!otpMatches) {
      const attempts = await this.repository.incrementLoginOtpAttempts(challenge.id);
      if (attempts >= authConfig.verificationOtpMaxAttempts) {
        await this.repository.consumeLoginOtpChallenge(challenge.id);
        throw new AppError(400, "Too many invalid OTP attempts. Please sign in again.", {
          code: AUTH_ERROR_CODES.LOGIN_OTP_MAX_ATTEMPTS,
        });
      }
      throw this.invalidLoginOtpError();
    }

    const user = await this.repository.findUserById(challenge.userId);

    if (!user || !user.isActive) {
      await this.repository.consumeLoginOtpChallenge(challenge.id);
      throw this.invalidLoginOtpError();
    }

    await this.repository.consumeLoginOtpChallenge(challenge.id);

    const credentialsUser = await this.repository.findUserByEmail(user.email);
    if (!credentialsUser) {
      throw this.invalidLoginOtpError();
    }

    const authUser = await this.resolveAuthUser(user.id);
    const tokenPair = await this.issueRefreshSession(
      credentialsUser,
      challenge.rememberMe,
      session,
    );

    await this.repository.updateLastLogin(user.id);

    return {
      accessToken: tokenPair.accessToken,
      expiresIn: tokenPair.expiresIn,
      refreshToken: tokenPair.refreshToken,
      tokenType: AUTH_TOKEN_TYPES.BEARER,
      user: authUser,
      rememberMe: challenge.rememberMe,
    };
  }

  /**
   * Resends a login OTP for an open challenge (cooldown enforced).
   */
  async resendLoginOtp(challengeId: string): Promise<LoginOtpChallengeResult> {
    const challenge = await this.repository.findLoginOtpChallengeById(challengeId);

    if (!challenge || challenge.consumedAt) {
      throw this.invalidLoginOtpError();
    }

    const cooldownMs = authConfig.verificationResendCooldownSeconds * 1_000;
    const elapsed = Date.now() - challenge.lastSentAt.getTime();
    if (elapsed < cooldownMs) {
      const retryAfterSeconds = Math.ceil((cooldownMs - elapsed) / 1_000);
      throw new AppError(429, `Please wait ${retryAfterSeconds}s before requesting another code.`, {
        code: AUTH_ERROR_CODES.LOGIN_OTP_RESEND_COOLDOWN,
      });
    }

    const user = await this.repository.findUserById(challenge.userId);
    if (!user || !user.isActive) {
      throw this.invalidLoginOtpError();
    }

    const credentialsUser = await this.repository.findUserByEmail(user.email);
    if (!credentialsUser) {
      throw this.invalidLoginOtpError();
    }

    const rawOtp = this.tokens.generateEmailVerificationOtp();
    const otpHash = this.tokens.hashEmailVerificationOtp(rawOtp);
    const expiresAt = this.tokens.calculateLoginOtpExpiry();
    const expiresIn = this.tokens.parseDurationToSeconds(authConfig.loginOtpExpiresIn);

    await this.repository.refreshLoginOtpChallenge(challenge.id, { otpHash, expiresAt });
    await this.sendLoginOtpEmail(credentialsUser, rawOtp);

    const result: LoginOtpChallengeResult = {
      requiresOtp: true,
      challengeId: challenge.id,
      expiresIn,
      message: "A new verification code has been sent to your email.",
      emailHint: this.maskEmail(user.email),
    };

    if (authConfig.loginOtpReturnInResponse) {
      result.otp = rawOtp;
    }

    return result;
  }

  /**
   * Rotates a refresh token and returns a new access/refresh token pair.
   */
  async refresh(rawRefreshToken: string, session: SessionMetadata = {}): Promise<RefreshResult> {
    const tokenHash = this.tokens.hashRefreshToken(rawRefreshToken);
    const storedToken = await this.repository.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw this.invalidRefreshTokenError();
    }

    if (storedToken.revokedAt !== null) {
      await this.repository.revokeAllRefreshTokens(storedToken.userId);
      throw new AppError(401, "Refresh token has already been used", {
        code: AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE,
      });
    }

    this.assertRefreshTokenIsValid(storedToken);

    const user = await this.repository.findUserById(storedToken.userId);

    if (!user || !user.isActive) {
      throw this.invalidRefreshTokenError();
    }

    await this.repository.revokeRefreshToken(storedToken.id);

    const tokenPair = await this.issueRefreshSession(
      {
        id: user.id,
        salonId: user.salonId,
        role: user.role,
      },
      false,
      session,
    );

    return {
      accessToken: tokenPair.accessToken,
      expiresIn: tokenPair.expiresIn,
      refreshToken: tokenPair.refreshToken,
      tokenType: AUTH_TOKEN_TYPES.BEARER,
    };
  }

  /**
   * Revokes the refresh token associated with the current session.
   */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.tokens.hashRefreshToken(rawRefreshToken);
    await this.repository.revokeRefreshTokenByHash(tokenHash);
  }

  /**
   * Revokes every active refresh token for the authenticated user.
   */
  async logoutAll(userId: string): Promise<void> {
    await this.repository.revokeAllRefreshTokens(userId);
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    return this.resolveAuthUser(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email);

    if (!user || !user.isActive) {
      return;
    }

    await this.repository.invalidateExistingResetTokens(user.id);

    const rawToken = this.tokens.generatePasswordResetToken();
    const tokenHash = this.tokens.hashPasswordResetToken(rawToken);
    const expiresAt = this.tokens.calculatePasswordResetExpiry();

    await this.repository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.emails.sendPasswordReset(
      { email: user.email, name: user.fullName },
      {
        managerName: user.fullName,
        resetUrl: this.emails.buildPasswordResetUrl(rawToken),
        supportEmail: emailConfig.supportEmail,
        expiresHours: this.tokens.parseDurationToHours(authConfig.passwordResetExpiresIn),
      },
    );
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.tokens.hashPasswordResetToken(rawToken);
    const storedToken = await this.repository.findPasswordResetToken(tokenHash);

    this.assertPasswordResetTokenIsValid(storedToken);

    const user = await this.repository.findUserById(storedToken!.userId);
    const passwordHash = await this.passwords.hashPassword(newPassword);

    await this.repository.updatePasswordHash(storedToken!.userId, passwordHash);
    await this.repository.markPasswordResetUsed(storedToken!.id);
    await this.repository.revokeAllRefreshTokens(storedToken!.userId);

    if (user) {
      await this.emails.sendPasswordChanged(
        { email: user.email, name: user.fullName },
        {
          managerName: user.fullName,
          loginUrl: this.emails.buildLoginUrl(),
          supportEmail: emailConfig.supportEmail,
        },
      );
    }
  }

  private async sendLoginOtpEmail(
    user: Pick<UserCredentialsRecord, "email" | "fullName">,
    rawOtp: string,
  ): Promise<void> {
    await this.emails.sendLoginOtp(
      { email: user.email, name: user.fullName },
      {
        fullName: user.fullName,
        otp: rawOtp,
        loginUrl: this.emails.buildLoginUrl(),
        supportEmail: emailConfig.supportEmail,
        otpExpiresMinutes: this.tokens.parseDurationToMinutes(authConfig.loginOtpExpiresIn),
      },
    );
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!local || !domain) return "***";
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }

  private async issueRefreshSession(
    user: Pick<UserCredentialsRecord, "id" | "salonId" | "role">,
    rememberMe: boolean,
    session: SessionMetadata,
  ): Promise<{ accessToken: string; expiresIn: number; refreshToken: string }> {
    const { accessToken, expiresIn } = this.tokens.generateAccessToken({
      sub: user.id,
      salonId: user.salonId,
      role: user.role,
    });

    const rawRefreshToken = this.tokens.generateRefreshToken();
    const refreshTokenHash = this.tokens.hashRefreshToken(rawRefreshToken);
    const expiresAt = this.tokens.calculateRefreshExpiry(rememberMe);

    await this.repository.createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    });

    return {
      accessToken,
      expiresIn,
      refreshToken: rawRefreshToken,
    };
  }

  private async resolveAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return this.toAuthUser(user);
  }

  private assertRefreshTokenIsValid(token: RefreshTokenRecord): void {
    if (token.expiresAt.getTime() <= Date.now()) {
      throw this.invalidRefreshTokenError();
    }
  }

  private assertPasswordResetTokenIsValid(
    token: Awaited<ReturnType<AuthRepository["findPasswordResetToken"]>>,
  ): void {
    if (!token) {
      throw new AppError(400, "Invalid or expired password reset token", {
        code: AUTH_ERROR_CODES.RESET_TOKEN_INVALID,
      });
    }

    if (token.usedAt !== null) {
      throw new AppError(400, "Invalid or expired password reset token", {
        code: AUTH_ERROR_CODES.RESET_TOKEN_INVALID,
      });
    }

    if (token.expiresAt.getTime() <= Date.now()) {
      throw new AppError(400, "Invalid or expired password reset token", {
        code: AUTH_ERROR_CODES.RESET_TOKEN_INVALID,
      });
    }
  }

  private toAuthUser(user: UserRecord): AuthUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      salonId: user.salonId,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };
  }

  private invalidCredentialsError(): AppError {
    return new AppError(401, "Invalid email or password", {
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    });
  }

  private invalidLoginOtpError(): AppError {
    return new AppError(400, "Invalid or expired OTP", {
      code: AUTH_ERROR_CODES.LOGIN_OTP_INVALID,
    });
  }

  private invalidRefreshTokenError(): AppError {
    return new AppError(401, "Invalid or expired refresh token", {
      code: AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID,
    });
  }
}

export const authService = new AuthService();
