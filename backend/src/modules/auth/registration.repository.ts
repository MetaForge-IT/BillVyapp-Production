import { prisma } from "../../config/prisma";

export interface RegistrationUserRecord {
  id: string;
  salonId: string | null;
  email: string;
  fullName: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
  isActive: boolean;
}

export interface RegistrationSalonRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface CreateRegistrationData {
  salonName: string;
  email: string;
  phone: string;
  fullName: string;
  passwordHash: string;
}

export interface CreateRegistrationResult {
  user: RegistrationUserRecord;
  salon: RegistrationSalonRecord;
}

/**
 * Persistence layer for salon registration onboarding.
 */
export class RegistrationRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  async findExistingRegistrationByEmail(email: string): Promise<RegistrationUserRecord | null> {
    const user = await this.db.user.findFirst({
      where: { email },
      select: {
        id: true,
        salonId: true,
        email: true,
        fullName: true,
        phone: true,
        emailVerifiedAt: true,
        isActive: true,
      },
    });

    return user;
  }

  async createRegistration(data: CreateRegistrationData): Promise<CreateRegistrationResult> {
    return this.db.$transaction(async (tx) => {
      const salon = await tx.salon.create({
        data: {
          name: data.salonName,
          email: data.email,
          phone: data.phone,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      });

      const user = await tx.user.create({
        data: {
          salonId: salon.id,
          email: data.email,
          passwordHash: data.passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          role: "manager",
          isActive: false,
          emailVerifiedAt: null,
        },
        select: {
          id: true,
          salonId: true,
          email: true,
          fullName: true,
          phone: true,
          emailVerifiedAt: true,
          isActive: true,
        },
      });

      await tx.salonFinancialSettings.create({
        data: { salonId: salon.id },
      });

      await tx.salonNotificationSettings.create({
        data: { salonId: salon.id },
      });

      return { user, salon };
    });
  }
}

export const registrationRepository = new RegistrationRepository();
