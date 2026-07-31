import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSettings, updateSettings as apiUpdateSettings } from "../../api/settings";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "../components/ui/hot-toast";
import type { UserRole } from "./RoleContext";

// ── Modules that can be toggled per role ──────────────────────────────────────
export type AppModule =
  | "dashboard" | "appointments" | "customers" | "finance"
  | "employees" | "inventory" | "reports" | "marketing" | "settings";

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard:    "Dashboard",
  appointments: "Appointments",
  customers:    "Customers",
  finance:      "Finance & Billing",
  employees:    "Employees",
  inventory:    "Inventory",
  reports:      "Reports",
  marketing:    "Marketing & Coupons",
  settings:     "Settings",
};

// ── Working hours ─────────────────────────────────────────────────────────────
export interface DayHours { open: string; close: string; closed: boolean }
export type WeekHours = Record<string, DayHours>;

// ── Role permissions matrix ───────────────────────────────────────────────────
export type RolePermissions = Record<UserRole, Record<AppModule, boolean>>;

// ── Staff operational controls ────────────────────────────────────────────────
export interface StaffControls {
  canOverridePrice:      Record<UserRole, boolean>;
  canApplyDiscount:      Record<UserRole, boolean>;
  canCancelAppointment:  Record<UserRole, boolean>;
  canViewOtherSchedules: Record<UserRole, boolean>;
  canViewContactInfo:    Record<UserRole, boolean>;
  canVoidBill:           Record<UserRole, boolean>;
}

// ── Financial rules ───────────────────────────────────────────────────────────
export interface FinancialRules {
  gstEnabled:      boolean;
  gstRate:         number;          // 5 | 12 | 18
  loyaltyRate:     number;          // ₹ per point (0.50)
  pointsPerRupee:  number;          // pts earned per ₹ spent (default 0.1 = 1 pt per ₹10)
  roundOff:        "none" | "1" | "5" | "10";
  discountCaps:    Record<UserRole, number>; // max % per role
}

// ── Notification settings ─────────────────────────────────────────────────────
export interface NotificationSettings {
  lowStockAlerts:       boolean;
  lowStockThreshold:    number;          // qty below which alert fires
  appointmentReminder:  boolean;
  reminderMinutes:      number;          // 30 | 60 | 1440
  dailySummary:         boolean;
  dailySummaryTime:     string;          // "20:00"
  paymentAlerts:        boolean;
  smsAlerts:            boolean;
  whatsappAlerts:       boolean;
  emailAlerts:          boolean;
}

// ── Security settings ─────────────────────────────────────────────────────────
export interface SecuritySettings {
  sessionTimeout:       Record<UserRole, number>; // minutes; 0 = never
  requirePinToSwitch:   boolean;
  auditLogEnabled:      boolean;
  loginAttemptLimit:    number;
}

// ── Salon profile ─────────────────────────────────────────────────────────────
export interface SalonProfile {
  name:     string;
  tagline:  string;
  address:  string;
  city:     string;
  pincode:  string;
  phone:    string;
  email:    string;
  website:  string;
  gstin:    string;
  currency: string;
  timezone: string;
}

// ── Full settings type ────────────────────────────────────────────────────────
export interface AppSettings {
  salon:         SalonProfile;
  workingHours:  WeekHours;
  permissions:   RolePermissions;
  staffControls: StaffControls;
  financial:     FinancialRules;
  notifications: NotificationSettings;
  security:      SecuritySettings;
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const ROLES: UserRole[] = ["super_admin", "admin", "manager", "receptionist", "stylist", "accountant", "inventory"];
const MODULES: AppModule[] = ["dashboard","appointments","customers","finance","employees","inventory","reports","marketing","settings"];

const DEFAULT_PERMISSIONS: RolePermissions = {
  super_admin:  { dashboard:true,  appointments:false, customers:false, finance:false, employees:false, inventory:false, reports:true,  marketing:false, settings:true },
  admin:        { dashboard:true,  appointments:false, customers:true,  finance:true,  employees:true,  inventory:true,  reports:true,  marketing:true,  settings:false },
  manager:      { dashboard:true,  appointments:true,  customers:true,  finance:true,  employees:true,  inventory:true,  reports:true,  marketing:true,  settings:false },
  receptionist: { dashboard:true,  appointments:true,  customers:true,  finance:true,  employees:false, inventory:false, reports:false, marketing:false, settings:false },
  stylist:      { dashboard:true,  appointments:true,  customers:false, finance:false, employees:false, inventory:false, reports:false, marketing:false, settings:false },
  accountant:   { dashboard:true,  appointments:false, customers:false, finance:true,  employees:false, inventory:false, reports:true,  marketing:false, settings:false },
  inventory:    { dashboard:true,  appointments:false, customers:false, finance:false, employees:false, inventory:true,  reports:false, marketing:false, settings:false },
};

function allRoles<T>(val: T): Record<UserRole, T> {
  return Object.fromEntries(ROLES.map(r => [r, val])) as Record<UserRole, T>;
}

const DEFAULT_SETTINGS: AppSettings = {
  salon: {
    name:     "Luxe Beauty Lounge",
    tagline:  "Premium Beauty & Wellness",
    address:  "MG Road, Hyderabad 500001",
    city:     "Hyderabad",
    pincode:  "500001",
    phone:    "+91 98765 43210",
    email:    "info@luxesalon.com",
    website:  "www.luxesalon.com",
    gstin:    "36ABCDE1234F1Z5",
    currency: "INR",
    timezone: "Asia/Kolkata",
  },
  workingHours: {
    Monday:    { open: "09:00", close: "20:00", closed: false },
    Tuesday:   { open: "09:00", close: "20:00", closed: false },
    Wednesday: { open: "09:00", close: "20:00", closed: false },
    Thursday:  { open: "09:00", close: "20:00", closed: false },
    Friday:    { open: "09:00", close: "21:00", closed: false },
    Saturday:  { open: "08:00", close: "21:00", closed: false },
    Sunday:    { open: "10:00", close: "18:00", closed: false },
  },
  permissions: DEFAULT_PERMISSIONS,
  staffControls: {
    canOverridePrice:      { manager:true,  receptionist:false, stylist:false, accountant:false, inventory:false },
    canApplyDiscount:      { manager:true,  receptionist:true,  stylist:false, accountant:false, inventory:false },
    canCancelAppointment:  { manager:true,  receptionist:true,  stylist:false, accountant:false, inventory:false },
    canViewOtherSchedules: { manager:true,  receptionist:true,  stylist:false, accountant:false, inventory:false },
    canViewContactInfo:    { manager:true,  receptionist:true,  stylist:false, accountant:false, inventory:false },
    canVoidBill:           { manager:true,  receptionist:false, stylist:false, accountant:false, inventory:false },
  },
  financial: {
    gstEnabled:     true,
    gstRate:        18,
    loyaltyRate:    0.50,
    pointsPerRupee: 0.1,
    roundOff:       "1",
    discountCaps:   { manager:25, receptionist:10, stylist:0, accountant:0, inventory:0 },
  },
  notifications: {
    lowStockAlerts:      true,
    lowStockThreshold:   5,
    appointmentReminder: true,
    reminderMinutes:     60,
    dailySummary:        true,
    dailySummaryTime:    "20:00",
    paymentAlerts:       true,
    smsAlerts:           true,
    whatsappAlerts:      true,
    emailAlerts:         true,
  },
  security: {
    sessionTimeout:     { manager:60, receptionist:30, stylist:30, accountant:60, inventory:60 },
    requirePinToSwitch: true,
    auditLogEnabled:    true,
    loginAttemptLimit:  5,
  },
};

// ── Context ───────────────────────────────────────────────────────────────────
interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSalon:         (patch: Partial<SalonProfile>) => void;
  updateWorkingHours:  (day: string, patch: Partial<DayHours>) => void;
  setPermission:       (role: UserRole, module: AppModule, value: boolean) => void;
  setStaffControl:     (control: keyof StaffControls, role: UserRole, value: boolean) => void;
  updateFinancial:     (patch: Partial<FinancialRules>) => void;
  setDiscountCap:      (role: UserRole, cap: number) => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
  updateSecurity:      (patch: Partial<SecuritySettings>) => void;
  setSessionTimeout:   (role: UserRole, minutes: number) => void;
  ROLES:   UserRole[];
  MODULES: AppModule[];
}

function mapRoundOff(mode: string): FinancialRules["roundOff"] {
  if (mode === "1" || mode === "5" || mode === "10") return mode;
  return "none";
}

function mapRoundOffToApi(mode: FinancialRules["roundOff"]): string {
  return mode === "none" ? "none" : mode;
}

async function persistDbSettings(settings: AppSettings) {
  await apiUpdateSettings({
    salon: {
      name: settings.salon.name,
      tagline: settings.salon.tagline,
      address: settings.salon.address,
      city: settings.salon.city,
      state: "",
      pincode: settings.salon.pincode,
      phone: settings.salon.phone,
      email: settings.salon.email,
      website: settings.salon.website,
      gstin: settings.salon.gstin,
      logoUrl: "",
      timezone: settings.salon.timezone,
      currency: settings.salon.currency,
    },
    businessHours: settings.workingHours,
    financial: {
      gstEnabled: settings.financial.gstEnabled,
      defaultGstRate: settings.financial.gstRate,
      loyaltyPointsPerRupee: settings.financial.pointsPerRupee,
      loyaltyRupeePerPoint: settings.financial.loyaltyRate,
      maxDiscountPercent: Math.max(...Object.values(settings.financial.discountCaps)),
      roundOffMode: mapRoundOffToApi(settings.financial.roundOff),
      receiptPrefix: "RCP",
    },
    notifications: {
      lowStockAlerts: settings.notifications.lowStockAlerts,
      lowStockThresholdQty: settings.notifications.lowStockThreshold,
      appointmentReminderEnabled: settings.notifications.appointmentReminder,
      reminderMinutesBefore: settings.notifications.reminderMinutes,
      dailySummaryEnabled: settings.notifications.dailySummary,
      dailySummaryTime: settings.notifications.dailySummaryTime,
      paymentAlerts: settings.notifications.paymentAlerts,
      smsEnabled: settings.notifications.smsAlerts,
      whatsappEnabled: settings.notifications.whatsappAlerts,
      emailEnabled: settings.notifications.emailAlerts,
    },
  });
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings((prev) => ({
          ...prev,
          salon: {
            name: data.salon.name,
            tagline: data.salon.tagline,
            address: data.salon.address,
            city: data.salon.city,
            pincode: data.salon.pincode,
            phone: data.salon.phone,
            email: data.salon.email,
            website: data.salon.website,
            gstin: data.salon.gstin,
            currency: data.salon.currency,
            timezone: data.salon.timezone,
          },
          workingHours: data.businessHours,
          financial: {
            ...prev.financial,
            gstEnabled: data.financial.gstEnabled,
            gstRate: data.financial.defaultGstRate,
            pointsPerRupee: data.financial.loyaltyPointsPerRupee,
            loyaltyRate: data.financial.loyaltyRupeePerPoint,
            roundOff: mapRoundOff(data.financial.roundOffMode),
          },
          notifications: {
            lowStockAlerts: data.notifications.lowStockAlerts,
            lowStockThreshold: data.notifications.lowStockThresholdQty,
            appointmentReminder: data.notifications.appointmentReminderEnabled,
            reminderMinutes: data.notifications.reminderMinutesBefore,
            dailySummary: data.notifications.dailySummaryEnabled,
            dailySummaryTime: data.notifications.dailySummaryTime,
            paymentAlerts: data.notifications.paymentAlerts,
            smsAlerts: data.notifications.smsEnabled,
            whatsappAlerts: data.notifications.whatsappEnabled,
            emailAlerts: data.notifications.emailEnabled,
          },
        }));
      })
      .catch((error) => {
        if (!cancelled) toast.error(getApiErrorMessage(error, "Failed to load settings"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback((updater: (prev: AppSettings) => AppSettings, sync = false) => {
    setSettings((prev) => {
      const next = updater(prev);
      if (sync) {
        void persistDbSettings(next).catch((error) =>
          toast.error(getApiErrorMessage(error, "Failed to save settings")),
        );
      }
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{
      settings,
      loading,
      ROLES,
      MODULES,
      updateSalon: p => patch(s => ({ ...s, salon: { ...s.salon, ...p } }), true),
      updateWorkingHours: (day, p) => patch(s => ({ ...s, workingHours: { ...s.workingHours, [day]: { ...s.workingHours[day], ...p } } }), true),
      setPermission: (role, mod, val) => patch(s => ({ ...s, permissions: { ...s.permissions, [role]: { ...s.permissions[role], [mod]: val } } })),
      setStaffControl: (ctrl, role, val) => patch(s => ({ ...s, staffControls: { ...s.staffControls, [ctrl]: { ...s.staffControls[ctrl], [role]: val } } })),
      updateFinancial: p => patch(s => ({ ...s, financial: { ...s.financial, ...p } }), true),
      setDiscountCap: (role, cap) => patch(s => ({ ...s, financial: { ...s.financial, discountCaps: { ...s.financial.discountCaps, [role]: cap } } }), true),
      updateNotifications: p => patch(s => ({ ...s, notifications: { ...s.notifications, ...p } }), true),
      updateSecurity: p => patch(s => ({ ...s, security: { ...s.security, ...p } })),
      setSessionTimeout: (role, min) => patch(s => ({ ...s, security: { ...s.security, sessionTimeout: { ...s.security.sessionTimeout, [role]: min } } })),
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

// re-export helpers
export { ROLES, MODULES };
