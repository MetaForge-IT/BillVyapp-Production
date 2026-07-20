import type {
  BusinessHour,
  Salon,
  SalonFinancialSettings,
  SalonNotificationSettings,
} from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/errors";
import {
  DAY_NAMES,
  formatTimeValue,
  parseTimeValue,
  SETTINGS_ERROR_CODES,
} from "./settings.constants";
import type { UpdateSettingsInput } from "./settings.validators";

function mapSalonProfile(salon: Salon) {
  return {
    name: salon.name,
    tagline: salon.tagline ?? "",
    address: salon.address ?? "",
    city: salon.city ?? "",
    state: salon.state ?? "",
    pincode: salon.pincode ?? "",
    phone: salon.phone,
    email: salon.email,
    website: salon.website ?? "",
    gstin: salon.gstin ?? "",
    logoUrl: salon.logoUrl ?? "",
    timezone: salon.timezone,
    currency: salon.currency,
  };
}

function mapBusinessHours(hours: BusinessHour[]) {
  const byDay: Record<string, { open: string; close: string; closed: boolean }> = {};
  for (const dayName of DAY_NAMES) {
    byDay[dayName] = { open: "09:00", close: "20:00", closed: false };
  }

  for (const hour of hours) {
    const dayName = DAY_NAMES[hour.dayOfWeek];
    if (!dayName) continue;
    byDay[dayName] = {
      open: formatTimeValue(hour.openTime),
      close: formatTimeValue(hour.closeTime),
      closed: hour.isClosed,
    };
  }

  return byDay;
}

function mapFinancialSettings(settings: SalonFinancialSettings | null) {
  if (!settings) {
    return {
      gstEnabled: true,
      defaultGstRate: 18,
      loyaltyPointsPerRupee: 0.1,
      loyaltyRupeePerPoint: 0.5,
      maxDiscountPercent: 50,
      roundOffMode: "none",
      receiptPrefix: "RCP",
    };
  }

  return {
    gstEnabled: settings.gstEnabled,
    defaultGstRate: Number(settings.defaultGstRate),
    loyaltyPointsPerRupee: Number(settings.loyaltyPointsPerRupee),
    loyaltyRupeePerPoint: Number(settings.loyaltyRupeePerPoint),
    maxDiscountPercent: Number(settings.maxDiscountPercent),
    roundOffMode: settings.roundOffMode,
    receiptPrefix: settings.receiptPrefix,
  };
}

function mapNotificationSettings(settings: SalonNotificationSettings | null) {
  if (!settings) {
    return {
      lowStockAlerts: true,
      lowStockThresholdQty: 10,
      appointmentReminderEnabled: true,
      reminderMinutesBefore: 60,
      dailySummaryEnabled: false,
      dailySummaryTime: "20:00",
      paymentAlerts: true,
      smsEnabled: true,
      whatsappEnabled: true,
      emailEnabled: true,
    };
  }

  return {
    lowStockAlerts: settings.lowStockAlerts,
    lowStockThresholdQty: settings.lowStockThresholdQty,
    appointmentReminderEnabled: settings.appointmentReminderEnabled,
    reminderMinutesBefore: settings.reminderMinutesBefore,
    dailySummaryEnabled: settings.dailySummaryEnabled,
    dailySummaryTime: formatTimeValue(settings.dailySummaryTime),
    paymentAlerts: settings.paymentAlerts,
    smsEnabled: settings.smsEnabled,
    whatsappEnabled: settings.whatsappEnabled,
    emailEnabled: settings.emailEnabled,
  };
}

function dayNameToIndex(dayName: string): number | undefined {
  const index = DAY_NAMES.findIndex((d) => d.toLowerCase() === dayName.toLowerCase());
  return index >= 0 ? index : undefined;
}

export class SettingsRepository {
  async get(salonId: string) {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      include: {
        businessHours: { orderBy: { dayOfWeek: "asc" } },
        financialSettings: true,
        notificationSettings: true,
      },
    });

    if (!salon) {
      throw new AppError(404, "Salon not found", { code: SETTINGS_ERROR_CODES.NOT_FOUND });
    }

    return {
      salon: mapSalonProfile(salon),
      businessHours: mapBusinessHours(salon.businessHours),
      financial: mapFinancialSettings(salon.financialSettings),
      notifications: mapNotificationSettings(salon.notificationSettings),
    };
  }

  async update(salonId: string, input: UpdateSettingsInput) {
    if (input.salon) {
      await prisma.salon.update({
        where: { id: salonId },
        data: {
          name: input.salon.name,
          tagline: input.salon.tagline,
          address: input.salon.address,
          city: input.salon.city,
          state: input.salon.state,
          pincode: input.salon.pincode,
          phone: input.salon.phone,
          email: input.salon.email,
          website: input.salon.website,
          gstin: input.salon.gstin,
          logoUrl: input.salon.logoUrl,
          timezone: input.salon.timezone,
          currency: input.salon.currency,
        },
      });
    }

    if (input.businessHours) {
      for (const [dayName, hours] of Object.entries(input.businessHours)) {
        const dayOfWeek = dayNameToIndex(dayName);
        if (dayOfWeek === undefined) continue;

        await prisma.businessHour.upsert({
          where: { salonId_dayOfWeek: { salonId, dayOfWeek } },
          create: {
            salonId,
            dayOfWeek,
            openTime: hours.open ? parseTimeValue(hours.open) : parseTimeValue("09:00"),
            closeTime: hours.close ? parseTimeValue(hours.close) : parseTimeValue("20:00"),
            isClosed: hours.closed ?? false,
          },
          update: {
            openTime: hours.open ? parseTimeValue(hours.open) : undefined,
            closeTime: hours.close ? parseTimeValue(hours.close) : undefined,
            isClosed: hours.closed,
          },
        });
      }
    }

    if (input.financial) {
      await prisma.salonFinancialSettings.upsert({
        where: { salonId },
        create: {
          salonId,
          gstEnabled: input.financial.gstEnabled ?? true,
          defaultGstRate: input.financial.defaultGstRate ?? 18,
          loyaltyPointsPerRupee: input.financial.loyaltyPointsPerRupee ?? 0.1,
          loyaltyRupeePerPoint: input.financial.loyaltyRupeePerPoint ?? 0.5,
          maxDiscountPercent: input.financial.maxDiscountPercent ?? 50,
          roundOffMode: input.financial.roundOffMode ?? "none",
          receiptPrefix: input.financial.receiptPrefix ?? "RCP",
        },
        update: {
          gstEnabled: input.financial.gstEnabled,
          defaultGstRate: input.financial.defaultGstRate,
          loyaltyPointsPerRupee: input.financial.loyaltyPointsPerRupee,
          loyaltyRupeePerPoint: input.financial.loyaltyRupeePerPoint,
          maxDiscountPercent: input.financial.maxDiscountPercent,
          roundOffMode: input.financial.roundOffMode,
          receiptPrefix: input.financial.receiptPrefix,
        },
      });
    }

    if (input.notifications) {
      await prisma.salonNotificationSettings.upsert({
        where: { salonId },
        create: {
          salonId,
          lowStockAlerts: input.notifications.lowStockAlerts ?? true,
          lowStockThresholdQty: input.notifications.lowStockThresholdQty ?? 10,
          appointmentReminderEnabled: input.notifications.appointmentReminderEnabled ?? true,
          reminderMinutesBefore: input.notifications.reminderMinutesBefore ?? 60,
          dailySummaryEnabled: input.notifications.dailySummaryEnabled ?? false,
          dailySummaryTime: input.notifications.dailySummaryTime
            ? parseTimeValue(input.notifications.dailySummaryTime)
            : parseTimeValue("20:00"),
          paymentAlerts: input.notifications.paymentAlerts ?? true,
          smsEnabled: input.notifications.smsEnabled ?? true,
          whatsappEnabled: input.notifications.whatsappEnabled ?? true,
          emailEnabled: input.notifications.emailEnabled ?? true,
        },
        update: {
          lowStockAlerts: input.notifications.lowStockAlerts,
          lowStockThresholdQty: input.notifications.lowStockThresholdQty,
          appointmentReminderEnabled: input.notifications.appointmentReminderEnabled,
          reminderMinutesBefore: input.notifications.reminderMinutesBefore,
          dailySummaryEnabled: input.notifications.dailySummaryEnabled,
          dailySummaryTime: input.notifications.dailySummaryTime
            ? parseTimeValue(input.notifications.dailySummaryTime)
            : undefined,
          paymentAlerts: input.notifications.paymentAlerts,
          smsEnabled: input.notifications.smsEnabled,
          whatsappEnabled: input.notifications.whatsappEnabled,
          emailEnabled: input.notifications.emailEnabled,
        },
      });
    }

    return this.get(salonId);
  }
}

export const settingsRepository = new SettingsRepository();
