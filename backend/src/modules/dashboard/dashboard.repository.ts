import { getReadClient } from "../../config/prisma";
import { STOCK_STATUS } from "../inventory/inventory.shared";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  CHECKED_IN_STATUSES,
  REVENUE_STATUSES,
} from "./dashboard.constants";
import {
  dayAmountFromMap,
  sumPaymentsGroupedByDay,
  sumPaymentsInRange,
} from "./dashboard.queries";
import {
  addDays,
  dayShortLabel,
  formatDateKey,
  formatInr,
  formatTime12h,
  initialsFromName,
  localDayRange,
  localDateKey,
  percentChange,
  startOfLocalDay,
  startOfMonth,
  startOfWeek,
} from "./dashboard.utils";
import { salonIdFilter } from "../../utils/salonScope";

function buildSparklineFromMap(
  start: Date,
  days: number,
  map: Map<string, number>,
  transform: (value: number) => number = (v) => v,
): { v: number }[] {
  const result: { v: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const day = addDays(start, i);
    result.push({ v: transform(dayAmountFromMap(map, day)) });
  }
  return result;
}

function groupFeedbackAvgByDay(
  rows: Array<{ createdAt: Date; rating: number }>,
): Map<string, { sum: number; count: number }> {
  const map = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const key = localDateKey(row.createdAt);
    const existing = map.get(key) ?? { sum: 0, count: 0 };
    existing.sum += row.rating;
    existing.count += 1;
    map.set(key, existing);
  }
  return map;
}

function countByDayFromDates(dates: Date[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const date of dates) {
    const key = localDateKey(date);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export class DashboardRepository {
  async getDashboard(salonIds: string[]) {
    const prisma = getReadClient();
    const sw = salonIdFilter(salonIds);
    const today = startOfLocalDay();
    const tomorrow = addDays(today, 1);
    const yesterday = addDays(today, -1);
    const todayRange = localDayRange(today);
    const yesterdayRange = localDayRange(yesterday);
    const weekStart = startOfWeek(today);
    const monthStart = startOfMonth(today);
    const trendStart = addDays(today, -6);
    const sparklineStart = addDays(today, -6);
    const customerTrendStart = addDays(today, -29);

    const [
      paymentDayTotals,
      todayAppointments,
      yesterdayAppointments,
      checkedInToday,
      noShowsToday,
      walkInsToday,
      pendingAgg,
      totalCustomers,
      newCustomersToday,
      newCustomersYesterday,
      newCustomersMonth,
      activeMemberships,
      inventoryProducts,
      feedbackToday,
      feedbackYesterday,
      feedbackAllAgg,
      feedbackPositiveCount,
      recentFeedbackRaw,
      feedbackWeekRows,
      appointmentStatusGroups,
      appointmentDayGroups,
      walkInsWeek,
      bookedAppointmentsToday,
      serviceLines,
      topCustomersRaw,
      customerVisitTrend,
      newCustomerDayGroups,
      paymentMethods,
      upcomingRaw,
      membershipCustomers,
      returningCustomers,
      cancelledToday,
      pendingCreatedRows,
    ] = await Promise.all([
      sumPaymentsGroupedByDay(salonIds, monthStart, tomorrow, prisma),
      prisma.appointment.count({
        where: {
          ...sw,
          scheduledDate: todayRange,
          status: { not: "cancelled" },
        },
      }),
      prisma.appointment.count({
        where: {
          ...sw,
          scheduledDate: yesterdayRange,
          status: { not: "cancelled" },
        },
      }),
      prisma.appointment.count({
        where: {
          ...sw,
          scheduledDate: todayRange,
          status: { in: [...CHECKED_IN_STATUSES] },
        },
      }),
      prisma.appointment.count({
        where: {
          ...sw,
          scheduledDate: todayRange,
          status: "no_show",
        },
      }),
      prisma.appointment.count({
        where: {
          ...sw,
          scheduledDate: todayRange,
          appointmentType: "walk_in",
          status: { not: "cancelled" },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          ...sw,
          voidedAt: null,
          balanceAmount: { gt: 0 },
          status: { in: ["pending", "partially_paid"] },
        },
        _sum: { balanceAmount: true },
        _count: { _all: true },
      }),
      prisma.customer.count({
        where: { ...sw, deletedAt: null, status: "active" },
      }),
      prisma.customer.count({
        where: {
          ...sw,
          deletedAt: null,
          joinedAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.customer.count({
        where: {
          ...sw,
          deletedAt: null,
          joinedAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.customer.count({
        where: {
          ...sw,
          deletedAt: null,
          joinedAt: { gte: monthStart, lt: tomorrow },
        },
      }),
      prisma.customerPlanEnrollment.count({
        where: {
          ...sw,
          status: "active",
          expiryDate: { gte: today },
        },
      }),
      prisma.product.findMany({
        where: { ...sw, deletedAt: null, isActive: true },
        select: { stockQty: true, costPrice: true, stockStatus: true, name: true, id: true, minStockQty: true, sku: true },
      }),
      prisma.feedback.aggregate({
        where: { ...sw, createdAt: { gte: today, lt: tomorrow } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.feedback.aggregate({
        where: { ...sw, createdAt: { gte: yesterday, lt: today } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.feedback.aggregate({
        where: { ...sw },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.feedback.count({
        where: { ...sw, rating: { gte: 4 } },
      }),
      prisma.feedback.findMany({
        where: { ...sw },
        include: {
          customer: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.feedback.findMany({
        where: { ...sw, createdAt: { gte: sparklineStart, lt: tomorrow } },
        select: { createdAt: true, rating: true },
      }),
      prisma.appointment.groupBy({
        by: ["status"],
        where: { ...sw, scheduledDate: { gte: weekStart, lt: tomorrow } },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ["scheduledDate"],
        where: {
          ...sw,
          scheduledDate: { gte: trendStart, lt: tomorrow },
          status: { not: "cancelled" },
        },
        _count: { _all: true },
      }),
      prisma.appointment.count({
        where: {
          ...sw,
          appointmentType: "walk_in",
          scheduledDate: { gte: weekStart, lt: tomorrow },
          status: { not: "cancelled" },
        },
      }),
      prisma.appointment.count({
        where: {
          ...sw,
          appointmentType: "appointment",
          scheduledDate: todayRange,
          status: { not: "cancelled" },
        },
      }),
      prisma.invoiceLineItem.findMany({
        where: {
          lineType: "service",
          invoice: {
            ...sw,
            voidedAt: null,
            status: { in: [...REVENUE_STATUSES] },
            invoiceDate: { gte: trendStart, lt: tomorrow },
          },
        },
        select: {
          itemName: true,
          quantity: true,
          lineTotal: true,
          serviceId: true,
          service: {
            select: {
              category: { select: { name: true } },
            },
          },
        },
      }),
      prisma.customer.findMany({
        where: { ...sw, deletedAt: null },
        orderBy: { totalSpend: "desc" },
        take: 5,
        select: { id: true, fullName: true, totalSpend: true, totalVisits: true },
      }),
      prisma.customer.findMany({
        where: {
          ...sw,
          deletedAt: null,
          joinedAt: { gte: customerTrendStart, lt: tomorrow },
        },
        select: { joinedAt: true },
      }),
      prisma.customer.groupBy({
        by: ["joinedAt"],
        where: {
          ...sw,
          deletedAt: null,
          joinedAt: { gte: sparklineStart, lt: tomorrow },
        },
        _count: { _all: true },
      }),
      prisma.payment.groupBy({
        by: ["paymentMethod"],
        where: {
          paidAt: { gte: trendStart, lt: tomorrow },
          invoice: { ...sw, voidedAt: null },
        },
        _sum: { amount: true },
      }),
      prisma.appointment.findMany({
        where: {
          ...sw,
          scheduledDate: { gte: todayRange.gte },
          status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
        },
        include: {
          customer: { select: { fullName: true } },
          services: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
        orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
        take: 5,
      }),
      prisma.customerPlanEnrollment.count({
        where: { ...sw, status: "active" },
      }),
      prisma.customer.count({
        where: { ...sw, deletedAt: null, totalVisits: { gt: 1 } },
      }),
      prisma.appointment.count({
        where: { ...sw, scheduledDate: todayRange, status: "cancelled" },
      }),
      prisma.invoice.findMany({
        where: {
          ...sw,
          voidedAt: null,
          balanceAmount: { gt: 0 },
          createdAt: { gte: sparklineStart, lt: tomorrow },
        },
        select: { createdAt: true },
      }),
    ]);

    const todayRevenue = dayAmountFromMap(paymentDayTotals, today);
    const yesterdayRevenue = dayAmountFromMap(paymentDayTotals, yesterday);
    const dailySales = todayRevenue;
    const weeklySales = sumPaymentsInRange(paymentDayTotals, weekStart, tomorrow);
    const monthlySales = sumPaymentsInRange(paymentDayTotals, monthStart, tomorrow);

    const appointmentDayMap = new Map<string, number>();
    for (const row of appointmentDayGroups) {
      appointmentDayMap.set(formatDateKey(row.scheduledDate), row._count._all);
    }

    const revenueSparkline = buildSparklineFromMap(trendStart, 7, paymentDayTotals, (v) =>
      Math.round(v / 1000) || 0,
    );
    const appointmentSparkline = buildSparklineFromMap(trendStart, 7, appointmentDayMap);
    const weeklyTrend: { day: string; date: string; revenue: number; appointments: number }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const dayStart = addDays(trendStart, i);
      const dayKey = localDateKey(dayStart);
      weeklyTrend.push({
        day: dayShortLabel(dayStart),
        date: dayKey,
        revenue: Math.round(paymentDayTotals.get(dayKey) ?? 0),
        appointments: appointmentDayMap.get(formatDateKey(dayStart)) ?? 0,
      });
    }

    const feedbackByDay = groupFeedbackAvgByDay(feedbackWeekRows);
    const satisfactionSparkline: { v: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const dayStart = addDays(today, -i);
      const bucket = feedbackByDay.get(localDateKey(dayStart));
      satisfactionSparkline.push({
        v: bucket && bucket.count > 0 ? bucket.sum / bucket.count : 0,
      });
    }

    const newCustomerDayMap = new Map<string, number>();
    for (const row of newCustomerDayGroups) {
      newCustomerDayMap.set(formatDateKey(row.joinedAt), row._count._all);
    }
    const newCustomerSparkline: { v: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const dayStart = addDays(today, -i);
      newCustomerSparkline.push({
        v: newCustomerDayMap.get(formatDateKey(dayStart)) ?? 0,
      });
    }

    const pendingAmount = Number(pendingAgg._sum.balanceAmount ?? 0);
    const pendingPaymentsCount = pendingAgg._count._all;
    const pendingByDay = countByDayFromDates(pendingCreatedRows.map((row) => row.createdAt));
    const pendingSparkline: { v: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const dayStart = addDays(today, -i);
      pendingSparkline.push({ v: pendingByDay.get(localDateKey(dayStart)) ?? 0 });
    }

    const inventoryValue = inventoryProducts.reduce(
      (sum, product) => sum + product.stockQty * Number(product.costPrice),
      0,
    );
    const lowStockCount = inventoryProducts.filter(
      (p) =>
        p.stockStatus === STOCK_STATUS.LOW ||
        p.stockStatus === STOCK_STATUS.CRITICAL,
    ).length;
    const outOfStockCount = inventoryProducts.filter(
      (p) => p.stockStatus === STOCK_STATUS.OUT,
    ).length;
    const lowStockProducts = inventoryProducts
      .filter(
        (p) =>
          p.stockStatus === STOCK_STATUS.LOW ||
          p.stockStatus === STOCK_STATUS.CRITICAL ||
          p.stockStatus === STOCK_STATUS.OUT,
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stockQty,
        minStock: p.minStockQty,
        stockStatus: p.stockStatus,
      }));

    const revenueChange = percentChange(todayRevenue, yesterdayRevenue);
    const appointmentChange = percentChange(todayAppointments, yesterdayAppointments);
    const newCustomerChange = percentChange(newCustomersToday, newCustomersYesterday);

    const todayRating = Number(feedbackToday._avg.rating ?? 0);
    const yesterdayRating = Number(feedbackYesterday._avg.rating ?? 0);
    const ratingDelta = Math.round((todayRating - yesterdayRating) * 10) / 10;
    const totalReviews = feedbackAllAgg._count.rating;
    const averageRating = Number(feedbackAllAgg._avg.rating ?? 0);
    const satisfactionPercent =
      totalReviews > 0 ? Math.round((feedbackPositiveCount / totalReviews) * 100) : 0;
    const recentReviews = recentFeedbackRaw.map((item) => ({
      id: item.publicId,
      customer: item.customer.fullName,
      rating: item.rating,
      comment: item.comment ?? "",
      service: item.serviceName ?? "",
      date: item.createdAt.toISOString(),
    }));

    const serviceAgg = new Map<string, { name: string; bookings: number; revenue: number }>();
    for (const line of serviceLines) {
      const key = line.serviceId ?? line.itemName;
      const existing = serviceAgg.get(key) ?? {
        name: line.itemName,
        bookings: 0,
        revenue: 0,
      };
      existing.bookings += line.quantity;
      existing.revenue += Number(line.lineTotal);
      serviceAgg.set(key, existing);
    }

    const topServicesSorted = Array.from(serviceAgg.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);
    const maxServiceRevenue = topServicesSorted[0]?.revenue ?? 1;
    const topServices = topServicesSorted.map((service) => ({
      name: service.name,
      bookings: service.bookings,
      revenue: Math.round(service.revenue),
      pct: Math.round((service.revenue / maxServiceRevenue) * 100),
    }));

    const categoryAgg = new Map<string, { name: string; bookings: number; revenue: number }>();
    for (const line of serviceLines) {
      const name = line.service?.category?.name ?? "Other";
      const existing = categoryAgg.get(name) ?? { name, bookings: 0, revenue: 0 };
      existing.bookings += line.quantity;
      existing.revenue += Number(line.lineTotal);
      categoryAgg.set(name, existing);
    }

    const appointmentAnalytics = {
      completed: appointmentStatusGroups.find((g) => g.status === "completed")?._count._all ?? 0,
      pending: appointmentStatusGroups.find((g) => g.status === "pending")?._count._all ?? 0,
      cancelled: appointmentStatusGroups.find((g) => g.status === "cancelled")?._count._all ?? 0,
      walkIns: walkInsWeek,
      bookedAppointments: bookedAppointmentsToday,
    };

    const visitTrendMap = new Map<string, number>();
    for (let i = 29; i >= 0; i -= 1) {
      const day = addDays(today, -i);
      visitTrendMap.set(day.toISOString().slice(0, 10), 0);
    }
    for (const customer of customerVisitTrend) {
      const key = customer.joinedAt.toISOString().slice(0, 10);
      if (visitTrendMap.has(key)) {
        visitTrendMap.set(key, (visitTrendMap.get(key) ?? 0) + 1);
      }
    }

    const paymentTotal = paymentMethods.reduce(
      (sum, row) => sum + Number(row._sum.amount ?? 0),
      0,
    );
    const paymentMethodDistribution = paymentMethods
      .map((row) => ({
        method: row.paymentMethod,
        amount: Math.round(Number(row._sum.amount ?? 0)),
        pct: paymentTotal > 0
          ? Math.round((Number(row._sum.amount ?? 0) / paymentTotal) * 100)
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const upcomingAppointments = upcomingRaw.map((appointment) => ({
      id: appointment.id,
      time: formatTime12h(appointment.scheduledTime),
      customer: appointment.customer.fullName,
      service: appointment.services[0]?.itemName ?? "Service",
      staff: appointment.staffName ?? "Unassigned",
      avatar: initialsFromName(appointment.customer.fullName),
      duration: `${appointment.durationMinutes} min`,
      date: formatDateKey(appointment.scheduledDate),
    }));

    const alerts: Array<{
      id: string;
      title: string;
      detail: string;
      urgent: boolean;
      href: string;
      type: string;
    }> = [];

    for (const product of lowStockProducts.slice(0, 3)) {
      alerts.push({
        id: `stock-${product.id}`,
        title: product.stockStatus === STOCK_STATUS.OUT ? "Out of Stock" : "Low Stock Alert",
        detail:
          product.stockStatus === STOCK_STATUS.OUT
            ? `${product.name} — out of stock`
            : `${product.name} — only ${product.stock} units left`,
        urgent: product.stockStatus === STOCK_STATUS.CRITICAL || product.stockStatus === STOCK_STATUS.OUT,
        href: "/inventory",
        type: "inventory",
      });
    }

    if (pendingPaymentsCount > 0) {
      alerts.push({
        id: "payments",
        title: "Pending Payments",
        detail: `${pendingPaymentsCount} invoice${pendingPaymentsCount > 1 ? "s" : ""} · ${formatInr(pendingAmount)} outstanding`,
        urgent: true,
        href: "/finance?tab=receipts&section=pending",
        type: "payment",
      });
    }

    if (cancelledToday > 0) {
      alerts.push({
        id: "cancelled",
        title: "Cancelled Appointments",
        detail: `${cancelledToday} appointment${cancelledToday > 1 ? "s" : ""} cancelled today`,
        urgent: false,
        href: "/appointments",
        type: "appointment",
      });
    }

    return {
      businessKpis: {
        todayRevenue: Math.round(todayRevenue),
        yesterdayRevenue: Math.round(yesterdayRevenue),
        todayAppointments,
        yesterdayAppointments,
        walkInCount: walkInsToday,
        upcomingAppointmentsCount: upcomingAppointments.length,
        pendingPaymentsAmount: Math.round(pendingAmount),
        pendingPaymentsCount,
        totalCustomers,
        activeMemberships,
        inventoryValue: Math.round(inventoryValue),
        lowStockProductsCount: lowStockCount + outOfStockCount,
        checkedInToday,
        noShowsToday,
        newCustomersToday,
        newCustomersMonth,
        customerSatisfaction: todayRating,
        satisfactionReviewCount: feedbackToday._count.rating,
      },
      kpiMetrics: [
        {
          label: "Today's Revenue",
          value: formatInr(todayRevenue),
          change: revenueChange.text,
          changePositive: revenueChange.positive,
          comparison: `vs ${formatInr(yesterdayRevenue)} yesterday`,
          sparkline: revenueSparkline,
          accent: "#D4AF37",
        },
        {
          label: "Today's Walk-ins",
          value: String(walkInsToday),
          change: appointmentChange.text,
          changePositive: appointmentChange.positive,
          comparison: `${checkedInToday} checked in · ${noShowsToday} no-shows`,
          sparkline: appointmentSparkline,
        },
        {
          label: "New Customers",
          value: String(newCustomersToday),
          change: newCustomerChange.text,
          changePositive: newCustomerChange.positive,
          comparison: `${newCustomersMonth} total this month`,
          sparkline: newCustomerSparkline,
        },
        {
          label: "Pending Payments",
          value: formatInr(pendingAmount),
          change: `${pendingPaymentsCount} bills`,
          changePositive: false,
          comparison: pendingPaymentsCount > 0 ? "Requires follow-up today" : "All clear",
          sparkline: pendingSparkline,
          accent: "#111118",
        },
        {
          label: "Customer Satisfaction",
          value: todayRating > 0 ? todayRating.toFixed(1) : "—",
          change: ratingDelta !== 0 ? `${ratingDelta >= 0 ? "+" : ""}${ratingDelta.toFixed(1)}` : "—",
          changePositive: ratingDelta >= 0,
          comparison:
            feedbackToday._count.rating > 0
              ? `Based on ${feedbackToday._count.rating} reviews today`
              : "No reviews today",
          sparkline: satisfactionSparkline,
          accent: "#D4AF37",
        },
      ],
      salesAnalytics: {
        dailySales: Math.round(dailySales),
        weeklySales: Math.round(weeklySales),
        monthlySales: Math.round(monthlySales),
        revenueTrend: weeklyTrend,
        paymentMethodDistribution,
      },
      appointmentAnalytics,
      customerAnalytics: {
        newCustomers: newCustomersToday,
        returningCustomers,
        membershipCustomers,
        topCustomers: topCustomersRaw.map((customer) => ({
          id: customer.id,
          name: customer.fullName,
          totalSpend: Math.round(Number(customer.totalSpend)),
          visits: customer.totalVisits,
        })),
        customerVisitTrend: Array.from(visitTrendMap.entries()).map(([date, count]) => ({
          date,
          count,
        })),
      },
      serviceAnalytics: {
        mostBookedServices: [...topServicesSorted]
          .sort((a, b) => b.bookings - a.bookings)
          .slice(0, 5)
          .map((s) => ({ name: s.name, bookings: s.bookings, revenue: Math.round(s.revenue) })),
        highestRevenueServices: topServices,
        categoryPerformance: Array.from(categoryAgg.values())
          .sort((a, b) => b.revenue - a.revenue)
          .map((c) => ({
            name: c.name,
            bookings: c.bookings,
            revenue: Math.round(c.revenue),
          })),
      },
      inventoryAnalytics: {
        totalProducts: inventoryProducts.length,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        inventoryValue: Math.round(inventoryValue),
        lowStockProducts,
      },
      feedbackAnalytics: {
        averageRating: Math.round(averageRating * 10) / 10,
        satisfactionPercent,
        totalReviews,
        recentReviews,
      },
      weeklyTrend,
      topServices,
      upcomingAppointments,
      alerts,
      refreshedAt: new Date().toISOString(),
    };
  }
}

export const dashboardRepository = new DashboardRepository();
