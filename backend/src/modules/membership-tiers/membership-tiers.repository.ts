import type { MembershipTier } from "@prisma/client";
import { prisma } from "../../config/prisma";

function mapTier(tier: MembershipTier) {
  return {
    id: tier.id,
    name: tier.name,
    slug: tier.slug,
    rank: tier.rank,
    price: Number(tier.price),
    durationMonths: tier.durationMonths,
    discountPercent: Number(tier.discountPercent),
    pointsMultiplier: Number(tier.pointsMultiplier),
    benefits: tier.benefits ?? "",
    isActive: tier.isActive,
  };
}

export class MembershipTiersRepository {
  async listActive(salonId: string) {
    const tiers = await prisma.membershipTier.findMany({
      where: { salonId, isActive: true },
      orderBy: { rank: "asc" },
    });
    return tiers.map(mapTier);
  }
}

export const membershipTiersRepository = new MembershipTiersRepository();
