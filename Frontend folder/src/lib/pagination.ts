export type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
};

/** Operational working-set size for boards / pickers (API max is 200). */
export const LIST_WORKING_LIMIT = 200;
