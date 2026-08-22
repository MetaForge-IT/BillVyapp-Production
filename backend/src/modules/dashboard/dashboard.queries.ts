import { Prisma, type PrismaClient } from "@prisma/client";
import { getReadClient } from "../../config/prisma";
import { addDays, localDateKey } from "./dashboard.utils";

export type DayAmountRow = { dayKey: string; total: number };

/** Sum payments grouped by IST calendar day (single query). */
export async function sumPaymentsGroupedByDay(
  salonIds: string[],
  from: Date,
  to: Date,
  db: PrismaClient = getReadClient(),
): Promise<Map<string, number>> {
  if (salonIds.length === 0) return new Map();

  const rows =
    salonIds.length === 1
      ? await db.$queryRaw<Array<{ day_key: Date; total: unknown }>>`
          SELECT DATE(CONVERT_TZ(p.paid_at, '+00:00', '+05:30')) AS day_key,
                 SUM(p.amount) AS total
          FROM payments p
          INNER JOIN invoices i ON i.id = p.invoice_id
          WHERE i.salon_id = ${salonIds[0]!}
            AND i.voided_at IS NULL
            AND p.paid_at >= ${from}
            AND p.paid_at < ${to}
          GROUP BY day_key
        `
      : await db.$queryRaw<Array<{ day_key: Date; total: unknown }>>`
          SELECT DATE(CONVERT_TZ(p.paid_at, '+00:00', '+05:30')) AS day_key,
                 SUM(p.amount) AS total
          FROM payments p
          INNER JOIN invoices i ON i.id = p.invoice_id
          WHERE i.salon_id IN (${Prisma.join(salonIds)})
            AND i.voided_at IS NULL
            AND p.paid_at >= ${from}
            AND p.paid_at < ${to}
          GROUP BY day_key
        `;

  const map = new Map<string, number>();
  for (const row of rows) {
    const key = localDateKey(row.day_key);
    map.set(key, Number(row.total ?? 0));
  }
  return map;
}

export function sumPaymentsInRange(
  dayTotals: Map<string, number>,
  from: Date,
  to: Date,
): number {
  let sum = 0;
  let cursor = from;
  while (cursor < to) {
    sum += dayTotals.get(localDateKey(cursor)) ?? 0;
    cursor = addDays(cursor, 1);
  }
  return sum;
}

export function dayAmountFromMap(map: Map<string, number>, date: Date): number {
  return map.get(localDateKey(date)) ?? 0;
}
