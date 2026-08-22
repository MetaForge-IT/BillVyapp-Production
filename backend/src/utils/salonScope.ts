import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { AuthContext } from "../modules/auth/auth.types";
import { ForbiddenError } from "./errors";

/** Resolve franchise id from auth or the admin's primary shop. */
export async function resolveAuthFranchiseId(auth: AuthContext): Promise<string | null> {
  if (auth.franchiseId) return auth.franchiseId;

  if (auth.role !== "admin" || !auth.salonId) return null;

  const salon = await prisma.salon.findUnique({
    where: { id: auth.salonId },
    select: { franchiseId: true },
  });
  return salon?.franchiseId ?? null;
}

export async function isFranchiseScopedAdmin(auth: AuthContext): Promise<boolean> {
  return auth.role === "admin" && Boolean(await resolveAuthFranchiseId(auth));
}

/** @deprecated Prefer isFranchiseScopedAdmin — sync check misses franchise via salon. */
export function isFranchiseAdmin(auth: AuthContext): boolean {
  return auth.role === "admin" && Boolean(auth.franchiseId);
}

export async function getFranchiseSalonIds(franchiseId: string): Promise<string[]> {
  const salons = await prisma.salon.findMany({
    where: { franchiseId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return salons.map((salon) => salon.id);
}

/** KPI cards and dashboard aggregates — all franchise shops for admin. */
export async function resolveKpiSalonIds(auth: AuthContext): Promise<string[]> {
  const franchiseId = await resolveAuthFranchiseId(auth);
  if (auth.role === "admin" && franchiseId) {
    const ids = await getFranchiseSalonIds(franchiseId);
    return ids.length > 0 ? ids : [auth.salonId];
  }
  return [auth.salonId];
}

/** Invoice/receipt lists — optional single-shop filter for franchise admin. */
export async function resolveListSalonIds(
  auth: AuthContext,
  querySalonId?: string,
): Promise<string[]> {
  const franchiseId = await resolveAuthFranchiseId(auth);
  if (auth.role === "admin" && franchiseId) {
    const franchiseSalonIds = await getFranchiseSalonIds(franchiseId);
    if (querySalonId) {
      if (!franchiseSalonIds.includes(querySalonId)) {
        throw new ForbiddenError("Shop not in your franchise");
      }
      return [querySalonId];
    }
    return franchiseSalonIds.length > 0 ? franchiseSalonIds : [auth.salonId];
  }
  return [auth.salonId];
}

export function salonIdFilter(
  salonIds: string[],
): { salonId: string } | { salonId: { in: string[] } } {
  if (salonIds.length === 1) return { salonId: salonIds[0]! };
  return { salonId: { in: salonIds } };
}

export function invoiceSalonWhere(
  salonIds: string[],
): Prisma.InvoiceWhereInput {
  return salonIdFilter(salonIds);
}
