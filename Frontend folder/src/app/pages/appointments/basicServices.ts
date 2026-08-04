/**
 * Quick-pick “basic” services for walk-in Billing — family cart style.
 * All groups shown together (men + women + kids) so one bill can cover the whole family.
 * Matched against catalog `displayName` or `name` (exact only — no shared fuzzy matches).
 */
export type BasicServiceGroup = "Men" | "Women" | "Kids";

export interface BasicServicePick {
  /** Short tile label shown in the UI */
  label: string;
  group: BasicServiceGroup;
  /** Exact catalog displayName / name strings (each pick must map to a unique service) */
  matchNames: string[];
}

/** Flat list of basic tiles — 6 per group in one horizontal row. */
export const BASIC_SERVICES: BasicServicePick[] = [
  // Men
  { group: "Men", label: "Men Hair Cut", matchNames: ["Hair Cut Basic Men", "Haircut Basic Men"] },
  { group: "Men", label: "Beard Trim", matchNames: ["Beard Trimming"] },
  { group: "Men", label: "Beard Design", matchNames: ["Beard Designing"] },
  { group: "Men", label: "Men Facial", matchNames: ["Charcoal / Black Diamond Facial"] },
  { group: "Men", label: "Restyle", matchNames: ["Haircut Restyle Men"] },
  { group: "Men", label: "Shampoo", matchNames: ["Shampoo & Conditioning - Men Basic"] },
  // Women
  {
    group: "Women",
    label: "Women Hair Cut",
    matchNames: ["Hair Cut Basic Women", "Haircut Basic Women", "Haircut Ladies Basic", "Hair Cut Ladies Basic"],
  },
  { group: "Women", label: "Eyebrow", matchNames: ["Eyebrow"] },
  { group: "Women", label: "Manicure", matchNames: ["Express Manicure"] },
  { group: "Women", label: "Pedicure", matchNames: ["Express Pedicure"] },
  { group: "Women", label: "Upper Lip", matchNames: ["Upper Lip"] },
  { group: "Women", label: "Cleanup", matchNames: ["Essential Cleanup Facial"] },
  // Kids — each maps to a distinct catalog row (no shared ids with Men/Women)
  { group: "Kids", label: "Kids Hair Cut", matchNames: ["Kids Hair Cut upto 10 years"] },
  { group: "Kids", label: "Girl ≤10", matchNames: ["Kids Cut Female upto 10 yrs"] },
  { group: "Kids", label: "Girl >10", matchNames: ["Kids Cut Female Above 10 yrs"] },
  { group: "Kids", label: "Fringe", matchNames: ["Fringe"] },
  { group: "Kids", label: "Boy Cut", matchNames: ["Mens Hair Cut"] },
  { group: "Kids", label: "Full Face", matchNames: ["Full Face with Eye Brow"] },
];

export const BASIC_SERVICE_GROUPS: BasicServiceGroup[] = ["Men", "Women", "Kids"];

export function matchBasicService<T extends { name: string; displayName?: string }>(
  catalog: T[],
  pick: BasicServicePick,
): T | undefined {
  const norms = pick.matchNames.map((n) => n.trim().toLowerCase());
  // Exact match only — avoids one tile lighting up siblings that share a substring
  return catalog.find((svc) => {
    const display = (svc.displayName ?? svc.name).trim().toLowerCase();
    const full = svc.name.trim().toLowerCase();
    return norms.some((n) => display === n || full === n);
  });
}
