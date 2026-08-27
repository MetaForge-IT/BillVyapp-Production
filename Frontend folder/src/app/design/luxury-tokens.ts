/** Executive Salon Design System — Matte Black · Champagne Gold · Ivory */

export const colors = {
  matteBlack: "#121212",
  champagneGold: "#D4AF37",
  ivoryWhite: "#FAF8F2",
  pearlWhite: "#FFFFFF",
  revenueEmerald: "#00C896",
  mutedText: "#3f3f46",
  borderSubtle: "rgba(18, 18, 18, 0.08)",
  goldMuted: "rgba(212, 175, 55, 0.15)",
} as const;

export type ModuleTheme =
  | "revenue"
  | "appointments"
  | "customers"
  | "services"
  | "employees"
  | "inventory"
  | "reports"
  | "marketing"
  | "billing";

/** Revenue = emerald accent only. Everything else = black + gold executive. */
export const moduleThemes: Record<
  ModuleTheme,
  {
    label: string;
    emoji: string;
    isRevenue: boolean;
    chart: string;
    chartLight: string;
  }
> = {
  revenue: {
    label: "Revenue",
    emoji: "💰",
    isRevenue: true,
    chart: colors.revenueEmerald,
    chartLight: "rgba(0, 200, 150, 0.15)",
  },
  appointments: { label: "Appointments", emoji: "📅", isRevenue: false, chart: colors.matteBlack, chartLight: colors.goldMuted },
  customers: { label: "Customers", emoji: "👥", isRevenue: false, chart: colors.matteBlack, chartLight: colors.goldMuted },
  services: { label: "Services", emoji: "💇", isRevenue: false, chart: colors.champagneGold, chartLight: colors.goldMuted },
  employees: { label: "Employees", emoji: "👨‍💼", isRevenue: false, chart: colors.matteBlack, chartLight: colors.goldMuted },
  inventory: { label: "Inventory", emoji: "📦", isRevenue: false, chart: colors.matteBlack, chartLight: colors.goldMuted },
  reports: { label: "Reports", emoji: "📊", isRevenue: false, chart: colors.matteBlack, chartLight: colors.goldMuted },
  marketing: { label: "Marketing", emoji: "📢", isRevenue: false, chart: colors.matteBlack, chartLight: colors.goldMuted },
  billing: { label: "Billing", emoji: "💳", isRevenue: false, chart: colors.champagneGold, chartLight: colors.goldMuted },
};

export const chartPalette = [
  colors.matteBlack,
  colors.champagneGold,
  "#2A2A2A",
  "#8A8A8A",
  colors.revenueEmerald,
];
