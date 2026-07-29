import type { ServiceGender } from "@prisma/client";

/** Face / body area tokens used to infer service_group from flat display names. */
const FACE_AREAS = new Set(
  [
    "cheek",
    "cheeks",
    "nose",
    "chin",
    "lower chin",
    "upper chin",
    "neck",
    "forehead",
    "full face",
    "ears",
    "eyebrow",
    "upper lip",
    "lower lip",
    "side locks",
    "sides",
    "full face with eye brow",
  ].map((s) => s.toLowerCase()),
);

const UPPER_BODY = new Set(
  ["underarms", "under arms", "chest", "back", "shoulders", "full arms", "half arms", "stomach"].map(
    (s) => s.toLowerCase(),
  ),
);

const LOWER_BODY = new Set(
  ["half legs", "full legs", "feet", "bikini line", "brazilian bikini", "buttocks"].map((s) =>
    s.toLowerCase(),
  ),
);

export function inferServiceGroup(categoryName: string, displayName: string): string {
  const display = displayName.trim().toLowerCase();
  const category = categoryName.trim().toLowerCase();

  if (FACE_AREAS.has(display) || display.includes("face")) return "Face";
  if (UPPER_BODY.has(display)) return "Upper Body";
  if (LOWER_BODY.has(display)) return "Lower Body";
  if (display.includes("full body")) return "Full Body";

  // Category itself is a good group label for most PDF rows (Threading, Hair Spa, …)
  if (category) return categoryName.trim();
  return "General";
}

export function buildSearchableName(
  categoryName: string,
  serviceGroup: string | null | undefined,
  displayName: string,
  gender?: ServiceGender | "MALE" | "FEMALE" | "UNISEX" | null,
): string {
  const parts = [categoryName.trim()];
  const group = (serviceGroup ?? "").trim();
  if (group && group.toLowerCase() !== categoryName.trim().toLowerCase()) {
    parts.push(group);
  }
  parts.push(displayName.trim());
  if (gender === "MALE") parts.push("Men");
  if (gender === "FEMALE") parts.push("Women");
  return parts.filter(Boolean).join(" - ");
}

export function genderPrefix(gender: ServiceGender | "MALE" | "FEMALE" | "UNISEX"): string {
  if (gender === "MALE") return "M";
  if (gender === "FEMALE") return "F";
  return "U";
}

/** Build a stable-ish service code from gender + category + group + display. */
export function buildServiceCode(input: {
  gender: ServiceGender | "MALE" | "FEMALE" | "UNISEX";
  categoryName: string;
  serviceGroup?: string | null;
  displayName: string;
  /** Optional suffix to guarantee uniqueness within a salon. */
  suffix?: string;
}): string {
  const slug = (value: string) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);

  const parts = [
    genderPrefix(input.gender),
    slug(input.categoryName) || "CAT",
    slug(input.serviceGroup || "GEN") || "GEN",
    slug(input.displayName) || "SVC",
  ];
  if (input.suffix) parts.push(slug(input.suffix).slice(0, 8));
  return parts.join("-").slice(0, 64);
}

export function mapLegacyGenderTag(tag?: string | null): ServiceGender {
  const lower = (tag ?? "").toLowerCase();
  if (lower === "male" || lower === "m") return "MALE";
  if (lower === "female" || lower === "f") return "FEMALE";
  return "UNISEX";
}

export function inferGenderFromText(...parts: Array<string | null | undefined>): ServiceGender {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  const hasMale = /\b(men|male|mens|man's|for male)\b/.test(text);
  const hasFemale = /\b(women|female|ladies|bridal|woman|for female)\b/.test(text);
  if (hasMale && !hasFemale) return "MALE";
  if (hasFemale && !hasMale) return "FEMALE";
  return "UNISEX";
}
