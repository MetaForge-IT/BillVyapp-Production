import { createHash, timingSafeEqual } from "crypto";

/**
 * Produces a SHA-256 hex digest of an opaque token (refresh, reset, etc.).
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/**
 * Constant-time comparison of a raw token against a stored SHA-256 hex hash.
 */
export function compareTokenHash(rawToken: string, storedHash: string): boolean {
  const computedHash = hashToken(rawToken);
  const computedBuffer = Buffer.from(computedHash, "utf8");
  const storedBuffer = Buffer.from(storedHash, "utf8");

  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(computedBuffer, storedBuffer);
}
