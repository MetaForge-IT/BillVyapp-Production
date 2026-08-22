import { z } from "zod";
import type { PaginationMeta } from "../types";

/** Hard cap for all paginated list endpoints. */
export const MAX_PAGE_LIMIT = 200;

/** Shared list pagination query (matches services module conventions). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional().default(50),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function clampPageLimit(limit: number | undefined, fallback = 50): number {
  const value = limit ?? fallback;
  return Math.min(Math.max(1, value), MAX_PAGE_LIMIT);
}

export function paginationSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export type PaginatedResult<T> = PaginationMeta & {
  items: T[];
};

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}
