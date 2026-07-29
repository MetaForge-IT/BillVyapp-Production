import { prisma } from "../../config/prisma";

// ─── Repository record types ─────────────────────────────────────────────────

/** Internal user record including credential hash (login only). */
export interface UserCredentialsRecord {
  id: string;
  salonId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
}

/** Public-safe user record without password hash. */
export interface UserRecord {
  id: string;
  salonId: string;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

export interface RefreshTokenRecord {
  id: bigint;
  publicId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface PasswordResetTokenRecord {
  id: bigint;
  publicId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface CreatePasswordResetTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface LoginOtpChallengeRecord {
  id: string;
  userId: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  rememberMe: boolean;
  lastSentAt: Date;
  createdAt: Date;
}

export interface CreateLoginOtpChallengeData {
  userId: string;
  otpHash: string;
  expiresAt: Date;
  rememberMe: boolean;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toUserCredentialsRecord(user: {
  id: string;
  salonId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
}): UserCredentialsRecord {
  return {
    id: user.id,
    salonId: user.salonId,
    email: user.email,
    passwordHash: user.passwordHash,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

function toUserRecord(user: {
  id: string;
  salonId: string;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}): UserRecord {
  return {
    id: user.id,
    salonId: user.salonId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
  };
}

function toRefreshTokenRecord(token: {
  id: bigint;
  publicId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}): RefreshTokenRecord {
  return {
    id: token.id,
    publicId: token.publicId,
    userId: token.userId,
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    revokedAt: token.revokedAt,
    createdAt: token.createdAt,
    userAgent: token.userAgent,
    ipAddress: token.ipAddress,
  };
}

function toPasswordResetTokenRecord(token: {
  id: bigint;
  publicId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}): PasswordResetTokenRecord {
  return {
    id: token.id,
    publicId: token.publicId,
    userId: token.userId,
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    usedAt: token.usedAt,
    createdAt: token.createdAt,
  };
}

function toLoginOtpChallengeRecord(challenge: {
  id: string;
  userId: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  rememberMe: boolean;
  lastSentAt: Date;
  createdAt: Date;
}): LoginOtpChallengeRecord {
  return {
    id: challenge.id,
    userId: challenge.userId,
    otpHash: challenge.otpHash,
    expiresAt: challenge.expiresAt,
    attempts: challenge.attempts,
    consumedAt: challenge.consumedAt,
    rememberMe: challenge.rememberMe,
    lastSentAt: challenge.lastSentAt,
    createdAt: challenge.createdAt,
  };
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class AuthRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  // Users

  async findUserByEmail(email: string): Promise<UserCredentialsRecord | null> {
    const user = await this.db.user.findFirst({
      where: { email },
      select: {
        id: true,
        salonId: true,
        email: true,
        passwordHash: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    return user ? toUserCredentialsRecord(user) : null;
  }

  /**
   * Looks up a user by mobile number (matches common Indian phone formats).
   */
  async findUserByPhone(phone: string): Promise<UserCredentialsRecord | null> {
    const digits = phone.replace(/\D/g, "");
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    if (last10.length < 10) return null;

    const variants = [
      last10,
      `+91${last10}`,
      `91${last10}`,
      `+91 ${last10}`,
      `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`,
    ];

    const user = await this.db.user.findFirst({
      where: { phone: { in: variants } },
      select: {
        id: true,
        salonId: true,
        email: true,
        passwordHash: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (user) return toUserCredentialsRecord(user);

    // Fallback: scan phones that may include spaces/dashes
    const candidates = await this.db.user.findMany({
      where: { phone: { not: null } },
      select: {
        id: true,
        salonId: true,
        email: true,
        passwordHash: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        emailVerifiedAt: true,
      },
      take: 500,
    });

    const match = candidates.find((row) => {
      const stored = (row.phone ?? "").replace(/\D/g, "");
      return stored.slice(-10) === last10;
    });

    return match ? toUserCredentialsRecord(match) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        salonId: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
      },
    });

    return user ? toUserRecord(user) : null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  // Refresh tokens

  async createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshTokenRecord> {
    const token = await this.db.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
      },
    });

    return toRefreshTokenRecord(token);
  }

  async findRefreshTokenByHash(hash: string): Promise<RefreshTokenRecord | null> {
    const token = await this.db.refreshToken.findFirst({
      where: { tokenHash: hash },
    });

    return token ? toRefreshTokenRecord(token) : null;
  }

  async revokeRefreshToken(id: bigint): Promise<void> {
    await this.db.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeRefreshTokenByHash(hash: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: {
        tokenHash: hash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  // Password reset tokens

  async createPasswordResetToken(
    data: CreatePasswordResetTokenData,
  ): Promise<PasswordResetTokenRecord> {
    const token = await this.db.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });

    return toPasswordResetTokenRecord(token);
  }

  async findPasswordResetToken(hash: string): Promise<PasswordResetTokenRecord | null> {
    const token = await this.db.passwordResetToken.findFirst({
      where: { tokenHash: hash },
    });

    return token ? toPasswordResetTokenRecord(token) : null;
  }

  async markPasswordResetUsed(id: bigint): Promise<void> {
    await this.db.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateExistingResetTokens(userId: string): Promise<void> {
    await this.db.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
  }

  // Login OTP challenges

  async invalidateOpenLoginOtpChallenges(userId: string): Promise<void> {
    await this.db.loginOtpChallenge.updateMany({
      where: {
        userId,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });
  }

  async createLoginOtpChallenge(
    data: CreateLoginOtpChallengeData,
  ): Promise<LoginOtpChallengeRecord> {
    const challenge = await this.db.loginOtpChallenge.create({
      data: {
        userId: data.userId,
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
        rememberMe: data.rememberMe,
      },
    });

    return toLoginOtpChallengeRecord(challenge);
  }

  async findLoginOtpChallengeById(id: string): Promise<LoginOtpChallengeRecord | null> {
    const challenge = await this.db.loginOtpChallenge.findUnique({
      where: { id },
    });

    return challenge ? toLoginOtpChallengeRecord(challenge) : null;
  }

  async incrementLoginOtpAttempts(id: string): Promise<number> {
    const updated = await this.db.loginOtpChallenge.update({
      where: { id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });

    return updated.attempts;
  }

  async consumeLoginOtpChallenge(id: string): Promise<void> {
    await this.db.loginOtpChallenge.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async refreshLoginOtpChallenge(
    id: string,
    data: { otpHash: string; expiresAt: Date },
  ): Promise<LoginOtpChallengeRecord> {
    const challenge = await this.db.loginOtpChallenge.update({
      where: { id },
      data: {
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      },
    });

    return toLoginOtpChallengeRecord(challenge);
  }
}

export const authRepository = new AuthRepository();
