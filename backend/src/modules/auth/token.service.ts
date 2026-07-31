import { randomBytes, randomInt } from "crypto";
import jwt, {
  type JwtPayload as JsonWebTokenPayload,
  type SignOptions,
  TokenExpiredError,
} from "jsonwebtoken";
import { authConfig, type AuthConfig } from "../../config/auth.config";
import { AUTH_ERROR_CODES, JWT_PAYLOAD_VERSION } from "./auth.constants";
import type { JwtPayload } from "./auth.types";
import { AppError } from "../../utils/errors";
import { hashToken } from "../../utils/crypto";

const OPAQUE_TOKEN_BYTE_LENGTH = 32;

type TokenServiceConfig = Pick<
  AuthConfig,
  | "jwtAccessSecret"
  | "jwtAccessExpiresIn"
  | "jwtRefreshExpiresIn"
  | "jwtRefreshRememberExpiresIn"
  | "passwordResetExpiresIn"
  | "emailVerificationLinkExpiresIn"
  | "emailVerificationOtpExpiresIn"
  | "loginOtpExpiresIn"
>;

export interface AccessTokenClaims {
  sub: string;
  salonId: string | null;
  franchiseId: string | null;
  role: string;
}

export interface SignedAccessToken {
  accessToken: string;
  expiresIn: number;
}

/**
 * Token issuance and verification for access JWTs and opaque refresh/reset tokens.
 */
export class TokenService {
  constructor(private readonly config: TokenServiceConfig = authConfig) {}

  /**
   * Signs a short-lived access JWT for API authorization.
   */
  generateAccessToken(claims: AccessTokenClaims): SignedAccessToken {
    const payload = {
      sub: claims.sub,
      salonId: claims.salonId,
      franchiseId: claims.franchiseId,
      role: claims.role,
      ver: JWT_PAYLOAD_VERSION,
    };

    const signOptions: SignOptions = {
      expiresIn: this.parseDurationToSeconds(this.config.jwtAccessExpiresIn),
    };

    const accessToken = jwt.sign(payload, this.config.jwtAccessSecret, signOptions);

    return {
      accessToken,
      expiresIn: this.parseDurationToSeconds(this.config.jwtAccessExpiresIn),
    };
  }

  /**
   * Verifies an access JWT and returns its application payload.
   *
   * @throws {AppError} With `TOKEN_EXPIRED` or `TOKEN_INVALID`
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.config.jwtAccessSecret) as JsonWebTokenPayload & {
        salonId?: unknown;
        franchiseId?: unknown;
        role?: unknown;
        ver?: unknown;
      };

      return this.toJwtPayload(decoded);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppError(401, "Access token has expired", {
          code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
          cause: error,
        });
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(401, "Invalid access token", {
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
        cause: error,
      });
    }
  }

  /**
   * Generates a cryptographically secure opaque refresh token.
   * The raw value must only be returned to the client once.
   */
  generateRefreshToken(): string {
    return this.generateSecureToken();
  }

  /**
   * Produces a SHA-256 hash of a raw refresh token for database storage.
   */
  hashRefreshToken(rawToken: string): string {
    return hashToken(rawToken);
  }

  /**
   * Calculates refresh-token expiry based on the remember-me preference.
   */
  calculateRefreshExpiry(rememberMe = false): Date {
    const duration = rememberMe
      ? this.config.jwtRefreshRememberExpiresIn
      : this.config.jwtRefreshExpiresIn;

    return this.addDurationToNow(duration);
  }

  /**
   * Generates a cryptographically secure opaque password-reset token.
   */
  generatePasswordResetToken(): string {
    return this.generateSecureToken();
  }

  /**
   * Produces a SHA-256 hash of a raw password-reset token for database storage.
   */
  hashPasswordResetToken(rawToken: string): string {
    return hashToken(rawToken);
  }

  /**
   * Calculates password-reset token expiry from configured TTL.
   */
  calculatePasswordResetExpiry(): Date {
    return this.addDurationToNow(this.config.passwordResetExpiresIn);
  }

  /**
   * Generates a cryptographically secure opaque email-verification link token.
   */
  generateEmailVerificationLinkToken(): string {
    return this.generateSecureToken();
  }

  /**
   * Produces a SHA-256 hash of a raw email-verification link token.
   */
  hashEmailVerificationLinkToken(rawToken: string): string {
    return hashToken(rawToken);
  }

  /**
   * Generates a cryptographically secure 6-digit OTP.
   */
  generateEmailVerificationOtp(): string {
    return String(randomInt(100_000, 1_000_000));
  }

  /**
   * Produces a SHA-256 hash of a raw OTP for database storage.
   */
  hashEmailVerificationOtp(rawOtp: string): string {
    return hashToken(rawOtp);
  }

  /**
   * Calculates email-verification link expiry from configured TTL.
   */
  calculateEmailVerificationLinkExpiry(): Date {
    return this.addDurationToNow(this.config.emailVerificationLinkExpiresIn);
  }

  /**
   * Calculates email-verification OTP expiry from configured TTL.
   */
  calculateEmailVerificationOtpExpiry(): Date {
    return this.addDurationToNow(this.config.emailVerificationOtpExpiresIn);
  }

  /**
   * Calculates login OTP expiry from configured TTL.
   */
  calculateLoginOtpExpiry(): Date {
    return this.addDurationToNow(this.config.loginOtpExpiresIn);
  }

  parseDurationToHours(duration: string): number {
    return Math.round(this.parseDurationToMilliseconds(duration) / 3_600_000);
  }

  parseDurationToMinutes(duration: string): number {
    return Math.round(this.parseDurationToMilliseconds(duration) / 60_000);
  }

  parseDurationToSeconds(duration: string): number {
    return Math.round(this.parseDurationToMilliseconds(duration) / 1_000);
  }

  private generateSecureToken(): string {
    return randomBytes(OPAQUE_TOKEN_BYTE_LENGTH).toString("base64url");
  }

  private toJwtPayload(decoded: JsonWebTokenPayload & {
    salonId?: unknown;
    franchiseId?: unknown;
    role?: unknown;
    ver?: unknown;
  }): JwtPayload {
    if (typeof decoded.sub !== "string") {
      throw new AppError(401, "Invalid access token", {
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
      });
    }

    const salonId =
      decoded.salonId === null || decoded.salonId === undefined
        ? null
        : typeof decoded.salonId === "string"
          ? decoded.salonId
          : null;

    // Reject non-string non-null salonId values (malformed tokens)
    if (decoded.salonId !== null && decoded.salonId !== undefined && typeof decoded.salonId !== "string") {
      throw new AppError(401, "Invalid access token", {
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
      });
    }

    const franchiseId =
      decoded.franchiseId === null || decoded.franchiseId === undefined
        ? null
        : typeof decoded.franchiseId === "string"
          ? decoded.franchiseId
          : null;

    if (
      decoded.franchiseId !== null &&
      decoded.franchiseId !== undefined &&
      typeof decoded.franchiseId !== "string"
    ) {
      throw new AppError(401, "Invalid access token", {
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
      });
    }

    if (typeof decoded.role !== "string") {
      throw new AppError(401, "Invalid access token", {
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
      });
    }

    if (typeof decoded.ver !== "number") {
      throw new AppError(401, "Invalid access token", {
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
      });
    }

    return {
      sub: decoded.sub,
      salonId,
      franchiseId,
      role: decoded.role,
      ver: decoded.ver,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }

  private addDurationToNow(duration: string): Date {
    return new Date(Date.now() + this.parseDurationToMilliseconds(duration));
  }

  private parseDurationToMilliseconds(duration: string): number {
    const match = /^(\d+)\s*([smhd])$/i.exec(duration.trim());

    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = Number.parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    const unitToMs: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    const multiplier = unitToMs[unit];

    if (multiplier === undefined) {
      throw new Error(`Unsupported duration unit: ${unit}`);
    }

    return value * multiplier;
  }
}

export const tokenService = new TokenService();
