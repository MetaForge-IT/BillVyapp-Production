import {
  registrationRepository,
  type RegistrationRepository,
} from "./registration.repository";
import { passwordService, type PasswordService } from "./password.service";
import {
  verificationRepository,
  type VerificationRepository,
} from "./verification.repository";
import { verificationService, type VerificationService } from "./verification.service";
import { logger } from "../../utils/logger";

export interface RegisterInput {
  salonName: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
}

export interface RegisterResult {
  message: string;
}

/**
 * Salon registration orchestration.
 */
export class RegistrationService {
  constructor(
    private readonly registrations: RegistrationRepository = registrationRepository,
    private readonly verifications: VerificationRepository = verificationRepository,
    private readonly passwords: PasswordService = passwordService,
    private readonly verification: VerificationService = verificationService,
  ) {}

  /**
   * Registers a new salon and manager account, then sends verification email.
   * Returns a generic success message to prevent account enumeration.
   */
  async register(input: RegisterInput): Promise<RegisterResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(input.mobileNumber);

    const existingUser = await this.registrations.findExistingRegistrationByEmail(normalizedEmail);

    if (existingUser?.emailVerifiedAt) {
      return this.genericSuccessMessage();
    }

    if (existingUser && !existingUser.emailVerifiedAt) {
      const user = await this.verifications.findUserForVerification(normalizedEmail);
      if (user) {
        await this.verification.sendVerificationEmail(user);
      }
      return this.genericSuccessMessage();
    }

    const passwordHash = await this.passwords.hashPassword(input.password);

    try {
      const { user, salon } = await this.registrations.createRegistration({
        salonName: input.salonName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        fullName: input.fullName.trim(),
        passwordHash,
      });

      await this.verification.sendVerificationEmail({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        salonId: user.salonId,
        emailVerifiedAt: user.emailVerifiedAt,
        isActive: user.isActive,
        salon: { name: salon.name },
      });
    } catch (error) {
      logger.warn("Registration persistence failed", {
        email: normalizedEmail,
        error: error instanceof Error ? error.message : "unknown",
      });
      return this.genericSuccessMessage();
    }

    return this.genericSuccessMessage();
  }

  private genericSuccessMessage(): RegisterResult {
    return {
      message:
        "If registration is successful, a verification email has been sent. Please check your inbox.",
    };
  }
}

function normalizePhone(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

export const registrationService = new RegistrationService();
