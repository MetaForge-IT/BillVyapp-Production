import { prisma } from "../../config/prisma";

export interface EmailVerificationTokenRecord {
  id: bigint;
  publicId: string;
  userId: string;
  linkTokenHash: string;
  otpHash: string;
  linkExpiresAt: Date;
  otpExpiresAt: Date;
  otpAttempts: number;
  usedAt: Date | null;
  invalidatedAt: Date | null;
  lastSentAt: Date;
  createdAt: Date;
}

export interface CreateEmailVerificationTokenData {
  userId: string;
  linkTokenHash: string;
  otpHash: string;
  linkExpiresAt: Date;
  otpExpiresAt: Date;
}

export interface VerificationUserRecord {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  salonId: string;
  emailVerifiedAt: Date | null;
  isActive: boolean;
  salon: {
    name: string;
  };
}

function toEmailVerificationTokenRecord(token: {
  id: bigint;
  publicId: string;
  userId: string;
  linkTokenHash: string;
  otpHash: string;
  linkExpiresAt: Date;
  otpExpiresAt: Date;
  otpAttempts: number;
  usedAt: Date | null;
  invalidatedAt: Date | null;
  lastSentAt: Date;
  createdAt: Date;
}): EmailVerificationTokenRecord {
  return {
    id: token.id,
    publicId: token.publicId,
    userId: token.userId,
    linkTokenHash: token.linkTokenHash,
    otpHash: token.otpHash,
    linkExpiresAt: token.linkExpiresAt,
    otpExpiresAt: token.otpExpiresAt,
    otpAttempts: token.otpAttempts,
    usedAt: token.usedAt,
    invalidatedAt: token.invalidatedAt,
    lastSentAt: token.lastSentAt,
    createdAt: token.createdAt,
  };
}

/**
 * Persistence layer for email verification tokens and OTP state.
 */
export class VerificationRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  async findUserForVerification(email: string): Promise<VerificationUserRecord | null> {
    const user = await this.db.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        salonId: true,
        emailVerifiedAt: true,
        isActive: true,
        salon: {
          select: { name: true },
        },
      },
    });

    return user;
  }

  async findUserByIdForVerification(userId: string): Promise<VerificationUserRecord | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        salonId: true,
        emailVerifiedAt: true,
        isActive: true,
        salon: {
          select: { name: true },
        },
      },
    });

    return user;
  }

  async invalidateActiveTokens(userId: string): Promise<void> {
    await this.db.emailVerificationToken.updateMany({
      where: {
        userId,
        usedAt: null,
        invalidatedAt: null,
      },
      data: { invalidatedAt: new Date() },
    });
  }

  async createVerificationToken(
    data: CreateEmailVerificationTokenData,
  ): Promise<EmailVerificationTokenRecord> {
    const token = await this.db.emailVerificationToken.create({
      data: {
        userId: data.userId,
        linkTokenHash: data.linkTokenHash,
        otpHash: data.otpHash,
        linkExpiresAt: data.linkExpiresAt,
        otpExpiresAt: data.otpExpiresAt,
        lastSentAt: new Date(),
      },
    });

    return toEmailVerificationTokenRecord(token);
  }

  async findActiveTokenByLinkHash(
    linkTokenHash: string,
  ): Promise<EmailVerificationTokenRecord | null> {
    const token = await this.db.emailVerificationToken.findFirst({
      where: {
        linkTokenHash,
        usedAt: null,
        invalidatedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return token ? toEmailVerificationTokenRecord(token) : null;
  }

  async findLatestActiveTokenByUserId(
    userId: string,
  ): Promise<EmailVerificationTokenRecord | null> {
    const token = await this.db.emailVerificationToken.findFirst({
      where: {
        userId,
        usedAt: null,
        invalidatedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return token ? toEmailVerificationTokenRecord(token) : null;
  }

  async incrementOtpAttempts(id: bigint): Promise<void> {
    await this.db.emailVerificationToken.update({
      where: { id },
      data: { otpAttempts: { increment: 1 } },
    });
  }

  async markTokenUsed(id: bigint): Promise<void> {
    await this.db.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async activateVerifiedUser(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });
  }
}

export const verificationRepository = new VerificationRepository();
