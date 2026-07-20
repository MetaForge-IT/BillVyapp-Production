import bcrypt from "bcrypt";
import { authConfig, type AuthConfig } from "../../config/auth.config";

/**
 * Password hashing operations using bcrypt.
 * Cryptographic concerns only — no persistence or HTTP logic.
 */
export class PasswordService {
  constructor(private readonly config: Pick<AuthConfig, "bcryptSaltRounds"> = authConfig) {}

  /**
   * Hashes a plaintext password with the configured bcrypt cost factor.
   *
   * @param password - Plaintext password to hash
   * @returns bcrypt hash string suitable for storage in `users.password_hash`
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.config.bcryptSaltRounds);
    } catch (error) {
      throw new Error("Failed to hash password", { cause: error });
    }
  }

  /**
   * Compares a plaintext password against a stored bcrypt hash.
   *
   * @param password - Plaintext password from the client
   * @param passwordHash - Stored bcrypt hash from the database
   * @returns `true` when the password matches the hash
   */
  async comparePassword(password: string, passwordHash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, passwordHash);
    } catch (error) {
      throw new Error("Failed to compare password", { cause: error });
    }
  }

  /**
   * Determines whether a stored hash should be upgraded after a successful login.
   * Compares the rounds embedded in the hash with the current configured cost.
   *
   * @param passwordHash - Stored bcrypt hash from the database
   * @returns `true` when the hash uses fewer rounds than `BCRYPT_SALT_ROUNDS`
   */
  needsRehash(passwordHash: string): boolean {
    try {
      const embeddedRounds = bcrypt.getRounds(passwordHash);
      return embeddedRounds < this.config.bcryptSaltRounds;
    } catch {
      return false;
    }
  }
}

export const passwordService = new PasswordService();
