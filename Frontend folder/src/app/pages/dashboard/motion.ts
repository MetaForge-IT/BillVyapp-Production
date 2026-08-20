/** Shared Framer Motion presets for admin/manager dashboards — slower stagger to avoid jitter. */

export const DASHBOARD_EASE = [0.22, 1, 0.36, 1] as const;

/** Entrance travel — keep small so fade dominates over bounce. */
export const DASHBOARD_OFFSET_Y = 10;

export const DASHBOARD_DURATION = 0.75;
/** Gap between sibling cards in a grid. */
export const DASHBOARD_STAGGER = 0.14;
/** Base pause before the first card in a staggered group. */
export const DASHBOARD_STAGGER_BASE = 0.12;

export const DASHBOARD_VIEWPORT = {
  once: true,
  amount: 0.35,
  margin: "0px 0px -12% 0px",
} as const;

/** Simple fade-up for section panels (whileInView). */
export const dashboardFadeUp = {
  hidden: { opacity: 0, y: DASHBOARD_OFFSET_Y },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DASHBOARD_DURATION,
      ease: DASHBOARD_EASE,
    },
  },
};

/** Indexed stagger for KPI / action grids (animate on mount). */
export const dashboardFadeUpStagger = {
  hidden: { opacity: 0, y: DASHBOARD_OFFSET_Y },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: DASHBOARD_DURATION,
      delay: DASHBOARD_STAGGER_BASE + i * DASHBOARD_STAGGER,
      ease: DASHBOARD_EASE,
    },
  }),
};

export function dashboardItemDelay(index: number, base = DASHBOARD_STAGGER_BASE) {
  return base + index * DASHBOARD_STAGGER;
}
