import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, type Customer, type FetchCustomersParams } from "../../api/customers";
import { LIST_WORKING_LIMIT } from "../../lib/pagination";
import { useAuthStore } from "../../stores/authStore";
import { queryKeys } from "../lib/queryKeys";

type CustomersUpdater = Customer[] | ((prev: Customer[]) => Customer[]);

export function useCustomersQuery(options?: FetchCustomersParams & { enabled?: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const params: FetchCustomersParams = {
    page: options?.page ?? 1,
    limit: options?.limit ?? LIST_WORKING_LIMIT,
    search: options?.search,
    status: options?.status,
    salonId: options?.salonId,
  };
  const enabled = Boolean(accessToken) && (options?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: () => fetchCustomers(params),
    enabled,
  });

  const setCustomersCache = useCallback(
    (updater: CustomersUpdater) => {
      queryClient.setQueryData(queryKeys.customers(params), (prev) => {
        const current = prev ?? {
          items: [] as Customer[],
          page: params.page ?? 1,
          limit: params.limit ?? LIST_WORKING_LIMIT,
          total: 0,
          totalPages: 1,
        };
        const items = typeof updater === "function" ? updater(current.items) : updater;
        return {
          ...current,
          items,
          total: items.length,
          totalPages: Math.max(1, Math.ceil(items.length / current.limit) || 1),
        };
      });
    },
    // params object identity — serialize stable deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, params.page, params.limit, params.search, params.status, params.salonId],
  );

  const reloadCustomers = useCallback(async () => {
    const rows = await queryClient.fetchQuery({
      queryKey: queryKeys.customers(params),
      queryFn: () => fetchCustomers(params),
    });
    return rows.items;
  }, [queryClient, params.page, params.limit, params.search, params.status, params.salonId]);

  const invalidateCustomers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
  }, [queryClient]);

  return {
    customers: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    page: query.data?.page ?? params.page ?? 1,
    limit: query.data?.limit ?? params.limit ?? LIST_WORKING_LIMIT,
    customersLoading: query.isLoading || (query.isFetching && !query.data),
    error: query.error,
    reloadCustomers,
    setCustomersCache,
    invalidateCustomers,
  };
}
