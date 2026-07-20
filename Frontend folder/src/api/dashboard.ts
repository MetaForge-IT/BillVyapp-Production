import { apiClient } from "../lib/axios";

export interface DashboardSparkPoint {
  v: number;
}

export interface DashboardKpiMetric {
  label: string;
  value: string;
  change: string;
  changePositive: boolean;
  comparison: string;
  sparkline: DashboardSparkPoint[];
  accent?: string;
}

export interface DashboardTrendPoint {
  day: string;
  date: string;
  revenue: number;
  appointments: number;
}

export interface DashboardServicePerformance {
  name: string;
  bookings: number;
  revenue: number;
  pct: number;
}

export interface DashboardUpcomingAppointment {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  avatar: string;
  duration: string;
  date?: string;
}

export interface DashboardAlert {
  id: string;
  title: string;
  detail: string;
  urgent: boolean;
  href: string;
  type: string;
}

export interface DashboardData {
  businessKpis: {
    todayRevenue: number;
    yesterdayRevenue: number;
    todayAppointments: number;
    yesterdayAppointments: number;
    walkInCount: number;
    upcomingAppointmentsCount: number;
    pendingPaymentsAmount: number;
    pendingPaymentsCount: number;
    totalCustomers: number;
    activeMemberships: number;
    inventoryValue: number;
    lowStockProductsCount: number;
    checkedInToday: number;
    noShowsToday: number;
    newCustomersToday: number;
    newCustomersMonth: number;
    customerSatisfaction: number;
    satisfactionReviewCount: number;
  };
  kpiMetrics: DashboardKpiMetric[];
  salesAnalytics: {
    dailySales: number;
    weeklySales: number;
    monthlySales: number;
    revenueTrend: DashboardTrendPoint[];
    paymentMethodDistribution: Array<{ method: string; amount: number; pct: number }>;
  };
  appointmentAnalytics: {
    completed: number;
    pending: number;
    cancelled: number;
    walkIns: number;
    bookedAppointments: number;
  };
  customerAnalytics: {
    newCustomers: number;
    returningCustomers: number;
    membershipCustomers: number;
    topCustomers: Array<{ id: string; name: string; totalSpend: number; visits: number }>;
    customerVisitTrend: Array<{ date: string; count: number }>;
  };
  serviceAnalytics: {
    mostBookedServices: Array<{ name: string; bookings: number; revenue: number }>;
    highestRevenueServices: DashboardServicePerformance[];
    categoryPerformance: Array<{ name: string; bookings: number; revenue: number }>;
  };
  inventoryAnalytics: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    inventoryValue: number;
    lowStockProducts: Array<{
      id: string;
      name: string;
      sku: string;
      stock: number;
      minStock: number;
      stockStatus: string;
    }>;
  };
  feedbackAnalytics: {
    averageRating: number;
    satisfactionPercent: number;
    totalReviews: number;
    recentReviews: Array<{
      id: string;
      customer: string;
      rating: number;
      comment: string;
      service: string;
      date: string;
    }>;
  };
  weeklyTrend: DashboardTrendPoint[];
  topServices: DashboardServicePerformance[];
  upcomingAppointments: DashboardUpcomingAppointment[];
  alerts: DashboardAlert[];
  refreshedAt: string;
}

interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get<ApiEnvelope<DashboardData>>("/dashboard");
  return data.data;
}
