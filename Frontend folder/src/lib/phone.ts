/** Format Indian mobile numbers for display (e.g. +91 98765 43210). */
export function formatDisplayPhone(phone: string | null | undefined): string {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return "—";

  const digits = trimmed.replace(/\D/g, "");
  const local = digits.length >= 10 ? digits.slice(-10) : digits;

  if (local.length === 10) {
    // Non-breaking spaces preserve all three readable groups in narrow cards.
    return `+91\u00A0${local.slice(0, 5)}\u00A0${local.slice(5)}`;
  }

  return trimmed;
}

/** Build a tel: href for tap-to-call links on mobile and tablet. */
export function phoneTelHref(phone: string | null | undefined): string | undefined {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return `tel:+91${digits.slice(-10)}`;
}
