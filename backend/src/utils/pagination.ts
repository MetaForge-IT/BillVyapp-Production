import { z } from "zod";
import type { PaginationMeta } from "../types";

/** Shared list pagination query (matches services module conventions). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

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
