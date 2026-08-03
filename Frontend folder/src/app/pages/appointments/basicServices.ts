/**
 * Quick-pick “basic” services for walk-in Billing — family cart style.
 * All groups shown together (men + women + kids) so one bill can cover the whole family.
 * Matched against catalog `displayName` or `name`.
 */
export type BasicServiceGroup = "Men" | "Women" | "Kids";

export interface BasicServicePick {
  /** Short tile label shown in the UI */
  label: string;
  group: BasicServiceGroup;
  /** Strings matched against catalog displayName / name */
  matchNames: string[];
}

/** Flat list of basic tiles — men, women, and kids on the same cart. */
export const BASIC_SERVICES: BasicServicePick[] = [
  // Men
  { group: "Men", label: "Men Hair Cut", matchNames: ["Hair Cut Basic Men", "Haircut Basic Men"] },
  { group: "Men", label: "Beard Trim", matchNames: ["Beard Trimming"] },
  { group: "Men", label: "Beard Design", matchNames: ["Beard Designing"] },
  // Women
  {
    group: "Women",
    label: "Women Hair Cut",
    matchNames: ["Hair Cut Basic Women", "Haircut Basic Women", "Haircut Ladies Basic", "Hair Cut Ladies Basic"],
  },
  { group: "Women", label: "Eyebrow", matchNames: ["Eyebrow"] },
  { group: "Women", label: "Manicure", matchNames: ["Express Manicure"] },
  // Kids
  { group: "Kids", label: "Kids Hair Cut", matchNames: ["Kids Hair Cut upto 10 years"] },
  { group: "Kids", label: "Kids Cut (Girl ≤10)", matchNames: ["Kids Cut Female upto 10 yrs"] },
  { group: "Kids", label: "Kids Cut (Girl >10)", matchNames: ["Kids Cut Female Above 10 yrs"] },
];

export const BASIC_SERVICE_GROUPS: BasicServiceGroup[] = ["Men", "Women", "Kids"];

export function matchBasicService<T extends { name: string; displayName?: string }>(
  catalog: T[],
  pick: BasicServicePick,
): T | undefined {
  const norms = pick.matchNames.map((n) => n.trim().toLowerCase());
  return catalog.find((svc) => {
    const display = (svc.displayName ?? svc.name).trim().toLowerCase();
    const full = svc.name.trim().toLowerCase();
    return norms.some(
      (n) => display === n || full === n || display.includes(n) || full.includes(n),
    );
  });
}
