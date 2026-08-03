/**
 * Upsert the Starr Kuts service catalog (+ membership / packages) onto a salon.
 * Safe to re-run. Used by prisma seed and by admin shop create.
 */
import { readFileSync } from "fs";
import { join } from "path";
import type { PrismaClient, ServiceGender } from "@prisma/client";
import {
  buildSearchableName,
  buildServiceCode,
  inferGenderFromText,
  inferServiceGroup,
} from "./services.catalog";

type CatalogService = {
  name?: string;
  displayName?: string;
  serviceGroup?: string | null;
  gender?: ServiceGender;
  price: number;
  memberPrice: number | null;
  durationMinutes: number;
};

/** Old catalog displayNames → new name, so reseed updates instead of duplicating. */
const LEGACY_DISPLAY_NAMES: Record<string, string[]> = {
  "Hair Cut Basic Women": ["Haircut Ladies Basic"],
};

type CatalogCategory = {
  category: string;
  description?: string;
  icon?: string | null;
  services: CatalogService[];
};

function loadCatalog(): CatalogCategory[] {
  // Prefer prisma/ next to compiled seed; fall back to cwd-relative for runtime imports.
  const candidates = [
    join(__dirname, "../../../prisma"),
    join(process.cwd(), "prisma"),
  ];
  let catalogDir = candidates[0];
  for (const dir of candidates) {
    try {
      readFileSync(join(dir, "service-catalog.json"), "utf-8");
      catalogDir = dir;
      break;
    } catch {
      // try next
    }
  }

  const catalogFiles = ["service-catalog.json", "laser-hair-reduction-catalog.json"];
  return catalogFiles.flatMap(
    (file) => JSON.parse(readFileSync(join(catalogDir, file), "utf-8")) as CatalogCategory[],
  );
}

async function uniqueServiceCode(
  prisma: PrismaClient,
  salonId: string,
  base: string,
): Promise<string> {
  let code = base.slice(0, 64);
  let attempt = 0;
  while (attempt < 30) {
    const exists = await prisma.service.findFirst({
      where: { salonId, serviceCode: code },
      select: { id: true },
    });
    if (!exists) return code;
    attempt += 1;
    code = `${base.slice(0, 55)}-${attempt}`.slice(0, 64);
  }
  return `${base.slice(0, 48)}-${Date.now().toString(36)}`.slice(0, 64);
}

/** Seed membership tiers + sellable membership plans for a salon. */
async function seedMembership(prisma: PrismaClient, salonId: string) {
  const tiers = [
    { name: "Basic", slug: "basic", rank: 1, price: 0, discount: 0 },
    { name: "Silver", slug: "silver", rank: 2, price: 1999, discount: 5 },
    { name: "Gold", slug: "gold", rank: 3, price: 4999, discount: 10 },
    { name: "Platinum", slug: "platinum", rank: 4, price: 9999, discount: 15 },
  ];
  for (const t of tiers) {
    await prisma.membershipTier.upsert({
      where: { salonId_slug: { salonId, slug: t.slug } },
      update: {},
      create: {
        salonId,
        name: t.name,
        slug: t.slug,
        rank: t.rank,
        price: t.price,
        discountPercent: t.discount,
      },
    });
  }

  const membershipPlans = [
    { preset: "silver", name: "Silver", price: 1999, discount: 5 },
    { preset: "gold", name: "Gold", price: 4999, discount: 10 },
    { preset: "platinum", name: "Platinum", price: 9999, discount: 15 },
  ] as const;
  for (const mp of membershipPlans) {
    const existing = await prisma.salonPlan.findFirst({
      where: { salonId, planType: "membership", namePreset: mp.preset },
    });
    if (!existing) {
      await prisma.salonPlan.create({
        data: {
          salonId,
          name: mp.name,
          namePreset: mp.preset,
          planType: "membership",
          price: mp.price,
          validityDays: 365,
          discountPercent: mp.discount,
          description: `${mp.name} annual membership`,
          isActive: true,
        },
      });
    }
  }
}

/** Seed PDF menu + Laser Hair Reduction services for a salon. */
async function seedServices(
  prisma: PrismaClient,
  salonId: string,
  createdById: string | null,
) {
  const catalog = loadCatalog();
  for (let i = 0; i < catalog.length; i += 1) {
    const block = catalog[i];
    const category = await prisma.serviceCategory.upsert({
      where: { salonId_name: { salonId, name: block.category } },
      update: {
        sortOrder: i + 1,
        description: block.description ?? undefined,
        icon: block.icon ?? undefined,
      },
      create: {
        salonId,
        name: block.category,
        description: block.description ?? null,
        icon: block.icon ?? null,
        sortOrder: i + 1,
      },
    });

    for (let si = 0; si < block.services.length; si += 1) {
      const s = block.services[si];
      const displayName = (s.displayName ?? s.name)!.trim();
      const serviceGroup =
        s.serviceGroup?.trim() || inferServiceGroup(block.category, displayName);
      const gender =
        s.gender ?? inferGenderFromText(block.category, displayName, serviceGroup);
      const fullName = buildSearchableName(block.category, serviceGroup, displayName, gender);
      const baseCode = buildServiceCode({
        gender,
        categoryName: block.category,
        serviceGroup,
        displayName,
        suffix: String(si + 1),
      });

      const legacyNames = LEGACY_DISPLAY_NAMES[displayName] ?? [];
      const existing = await prisma.service.findFirst({
        where: {
          salonId,
          categoryId: category.id,
          OR: [
            { serviceCode: baseCode },
            { displayName, gender, serviceGroup },
            { name: fullName },
            ...(legacyNames.length
              ? [{ displayName: { in: legacyNames } }]
              : []),
          ],
        },
      });

      if (!existing) {
        const serviceCode = await uniqueServiceCode(prisma, salonId, baseCode);
        await prisma.service.create({
          data: {
            salonId,
            categoryId: category.id,
            serviceCode,
            name: fullName,
            displayName,
            serviceGroup,
            price: s.price,
            memberPrice: s.memberPrice,
            durationMinutes: s.durationMinutes,
            gender,
            sortOrder: si + 1,
            createdById,
          },
        });
      } else {
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            name: fullName,
            displayName,
            serviceGroup,
            gender,
            price: s.price,
            memberPrice: s.memberPrice,
            durationMinutes: s.durationMinutes,
            sortOrder: si + 1,
            isActive: true,
            updatedById: createdById,
          },
        });
      }
    }
  }
}

/** Turn package-category services into sellable salon plans. */
async function seedPackages(prisma: PrismaClient, salonId: string) {
  const packageCategoryNames = ["Package", "Make Up Package", "Pre Bridal Package"];
  const packageServices = await prisma.service.findMany({
    where: {
      salonId,
      deletedAt: null,
      isActive: true,
      category: { name: { in: packageCategoryNames } },
    },
    include: { category: { select: { name: true } } },
  });

  for (const service of packageServices) {
    const name = service.displayName || service.name;
    const existingPkg = await prisma.salonPlan.findFirst({
      where: { salonId, planType: "package", name },
    });
    if (existingPkg) continue;
    await prisma.salonPlan.create({
      data: {
        salonId,
        name,
        namePreset: "custom",
        planType: "package",
        price: service.price,
        validityDays: 30,
        serviceLimit: 1,
        description: `${service.category.name} offer`,
        isActive: true,
        planServices: { create: [{ serviceId: service.id, quantity: 1 }] },
      },
    });
  }
}

/**
 * Full catalog bootstrap for one salon: membership + services + packages.
 * Idempotent — safe on every shop create and every `prisma:seed` run.
 */
export async function seedServiceCatalogForSalon(
  prisma: PrismaClient,
  salonId: string,
  createdById: string | null = null,
): Promise<{ categories: number; services: number }> {
  await seedMembership(prisma, salonId);
  await seedServices(prisma, salonId, createdById);
  await seedPackages(prisma, salonId);

  const [categories, services] = await Promise.all([
    prisma.serviceCategory.count({ where: { salonId } }),
    prisma.service.count({ where: { salonId, deletedAt: null } }),
  ]);
  return { categories, services };
}
