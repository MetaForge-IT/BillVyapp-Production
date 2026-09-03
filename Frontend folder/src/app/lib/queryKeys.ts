export const queryKeys = {
  appointments: (params?: { date?: string; page?: number; limit?: number }) =>
    ["appointments", params ?? { page: 1, limit: 200 }] as const,
  customers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    salonId?: string;
  }) => ["customers", params ?? { page: 1, limit: 200 }] as const,
  billing: {
    invoices: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      salonId?: string;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      paymentMethod?: string;
    }) => ["billing", "invoices", params ?? { page: 1, limit: 200 }] as const,
    invoicesSummary: (params?: {
      period?: string;
      salonId?: string;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
    }) => ["billing", "invoices", "summary", params ?? {}] as const,
    pending: (params?: { page?: number; limit?: number; search?: string }) =>
      ["billing", "pending", params ?? { page: 1, limit: 200 }] as const,
  },
} as const;
