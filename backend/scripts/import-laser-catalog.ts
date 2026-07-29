/**
 * Upsert Laser Hair Reduction (+ optional extra catalog JSON) into the active salon.
 * Preserves existing services; only creates missing LHR rows / updates matching ones.
 *
 *   npx tsx scripts/import-laser-catalog.ts
 *   npx tsx scripts/import-laser-catalog.ts --file=prisma/laser-hair-reduction-catalog.json
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient, type ServiceGender } from "@prisma/client";
import {
  buildSearchableName,
  buildServiceCode,
  inferGenderFromText,
  inferServiceGroup,
} from "../src/modules/services/services.catalog";

type CatalogService = {
  name?: string;
  displayName?: string;
  serviceGroup?: string | null;
  gender?: ServiceGender;
  price: number;
  memberPrice: number | null;
  durationMinutes: number;
};

type CatalogCategory = {
  category: string;
  description?: string;
  icon?: string | null;
  services: CatalogService[];
};

const prisma = new PrismaClient();

async function uniqueCode(salonId: string, base: string): Promise<string> {
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

async function main() {
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const relative = fileArg?.slice("--file=".length) || "prisma/laser-hair-reduction-catalog.json";
  const catalogPath = join(process.cwd(), relative);
  const catalog = JSON.parse(readFileSync(catalogPath, "utf-8")) as CatalogCategory[];

  const salon = await prisma.salon.findFirst({ orderBy: { createdAt: "asc" } });
  if (!salon) throw new Error("No salon found");

  const user = await prisma.user.findFirst({ where: { salonId: salon.id } });
  let created = 0;
  let updated = 0;

  for (let i = 0; i < catalog.length; i += 1) {
    const block = catalog[i];
    const category = await prisma.serviceCategory.upsert({
      where: { salonId_name: { salonId: salon.id, name: block.category } },
      update: {
        description: block.description ?? undefined,
        icon: block.icon ?? undefined,
      },
      create: {
        salonId: salon.id,
        name: block.category,
        description: block.description ?? null,
        icon: block.icon ?? null,
        sortOrder: 100 + i,
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

      const existing = await prisma.service.findFirst({
        where: {
          salonId: salon.id,
          categoryId: category.id,
          deletedAt: null,
          displayName,
          gender,
          serviceGroup,
        },
      });

      if (existing) {
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
            updatedById: user?.id ?? null,
          },
        });
        updated += 1;
      } else {
        const serviceCode = await uniqueCode(salon.id, baseCode);
        await prisma.service.create({
          data: {
            salonId: salon.id,
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
            createdById: user?.id ?? null,
          },
        });
        created += 1;
      }
    }
  }

  console.log(
    `Laser catalog import done for salon "${salon.name}": created=${created}, updated=${updated}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
