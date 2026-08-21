export const queryKeys = {
  appointments: (params?: { date?: string; page?: number; limit?: number }) =>
    ["appointments", params ?? { page: 1, limit: 200 }] as const,
  customers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => ["customers", params ?? { page: 1, limit: 200 }] as const,
  billing: {
    invoices: (params?: { page?: number; limit?: number; search?: string }) =>
      ["billing", "invoices", params ?? { page: 1, limit: 200 }] as const,
    pending: (params?: { page?: number; limit?: number; search?: string }) =>
      ["billing", "pending", params ?? { page: 1, limit: 200 }] as const,
  },
} as const;
