import type { PrismaClient } from "@prisma/client";
import { SEARCH_LIMIT_PER_TYPE } from "./search.constants";

const FULLTEXT_MIN_TERM_LENGTH = 3;

/** Build a safe BOOLEAN MODE prefix query, e.g. "john*" or "hair cut*". */
export function toFulltextBooleanTerm(term: string): string | null {
  const tokens = term
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{N}@.+_-]/gu, ""))
    .filter((part) => part.length >= FULLTEXT_MIN_TERM_LENGTH);

  if (tokens.length === 0) return null;
  return tokens.map((token) => `${token}*`).join(" ");
}

export type FulltextCustomerRow = {
  id: string;
  full_name: string;
  phone: string;
};

export type FulltextServiceRow = {
  id: string;
  name: string;
  display_name: string;
  price: unknown;
};

export async function searchCustomersFulltext(
  db: PrismaClient,
  salonId: string,
  term: string,
  limit = SEARCH_LIMIT_PER_TYPE,
): Promise<FulltextCustomerRow[] | null> {
  const booleanTerm = toFulltextBooleanTerm(term);
  if (!booleanTerm) return null;

  return db.$queryRaw<FulltextCustomerRow[]>`
    SELECT c.id, c.full_name, c.phone
    FROM customers c
    WHERE c.salon_id = ${salonId}
      AND c.deleted_at IS NULL
      AND MATCH(c.full_name) AGAINST(${booleanTerm} IN BOOLEAN MODE)
    ORDER BY c.full_name ASC
    LIMIT ${limit}
  `;
}

export async function searchServicesFulltext(
  db: PrismaClient,
  salonId: string,
  term: string,
  limit = SEARCH_LIMIT_PER_TYPE,
): Promise<FulltextServiceRow[] | null> {
  const booleanTerm = toFulltextBooleanTerm(term);
  if (!booleanTerm) return null;

  return db.$queryRaw<FulltextServiceRow[]>`
    SELECT s.id, s.name, s.display_name, s.price
    FROM services s
    WHERE s.salon_id = ${salonId}
      AND s.deleted_at IS NULL
      AND s.is_active = 1
      AND MATCH(s.name, s.display_name) AGAINST(${booleanTerm} IN BOOLEAN MODE)
    ORDER BY s.name ASC
    LIMIT ${limit}
  `;
}
