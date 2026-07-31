/** Shared breakpoint values (px) — align with Tailwind defaults. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type DeviceClass = "mobile" | "tablet" | "desktop" | "wide";

export function getDeviceClass(width: number): DeviceClass {
  if (width < BREAKPOINTS.sm) return "mobile";
  if (width < BREAKPOINTS.lg) return "tablet";
  if (width < BREAKPOINTS.xl) return "desktop";
  return "wide";
}

/** Main app shell: persistent sidebar from lg; phones and tablets use the drawer. */
export const SIDEBAR_MIN_WIDTH = BREAKPOINTS.lg;
