/**
 * Refine service catalog after schema migration 20260729150000_service_catalog_v2.
 * Preserves IDs, prices, durations. Improves display_name / service_group / searchable name / codes.
 *
 *   npx tsx scripts/refine-service-catalog-v2.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  buildSearchableName,
  buildServiceCode,
  inferGenderFromText,
  inferServiceGroup,
} from "../src/modules/services/services.catalog";

const prisma = new PrismaClient();

async function uniqueCode(
  salonId: string,
  base: string,
  used: Set<string>,
  excludeId: string,
): Promise<string> {
  let code = base.slice(0, 64);
  let attempt = 0;
  while (attempt < 30) {
    const takenInBatch = used.has(`${salonId}:${code}`);
    if (!takenInBatch) {
      const exists = await prisma.service.findFirst({
        where: {
          salonId,
          serviceCode: code,
          NOT: { id: excludeId },
        },
        select: { id: true },
      });
      if (!exists) {
        used.add(`${salonId}:${code}`);
        return code;
      }
    }
    attempt += 1;
    code = `${base.slice(0, 55)}-${attempt}`.slice(0, 64);
  }
  const fallback = `${base.slice(0, 40)}-${excludeId.slice(0, 8)}`.slice(0, 64);
  used.add(`${salonId}:${fallback}`);
  return fallback;
}

async function main() {
  const services = await prisma.service.findMany({
    where: { deletedAt: null },
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const usedCodes = new Set<string>();
  // Reserve existing non-temp codes so we don't steal them mid-pass
  for (const service of services) {
    if (!service.serviceCode.startsWith("SVC-")) {
      usedCodes.add(`${service.salonId}:${service.serviceCode}`);
    }
  }

  let updated = 0;
  for (const service of services) {
    const displayName = service.displayName || service.name.split(" - ").pop() || service.name;
    // Re-infer group when still equal to category (migration default) or empty
    const inferredGroup = inferServiceGroup(service.category.name, displayName);
    const existingGroup = (service.serviceGroup ?? "").trim();
    const serviceGroup =
      !existingGroup ||
      existingGroup.toLowerCase() === service.category.name.trim().toLowerCase()
        ? inferredGroup
        : existingGroup;
    const gender =
      service.gender !== "UNISEX"
        ? service.gender
        : inferGenderFromText(service.category.name, displayName, service.name);
    const name = buildSearchableName(service.category.name, serviceGroup, displayName, gender);

    const desiredBase = buildServiceCode({
      gender,
      categoryName: service.category.name,
      serviceGroup,
      displayName,
      suffix: service.id.slice(0, 6),
    });

    // Keep existing serviceCode if already non-temp; otherwise upgrade from SVC-* temps
    const serviceCode = service.serviceCode.startsWith("SVC-")
      ? await uniqueCode(service.salonId, desiredBase, usedCodes, service.id)
      : service.serviceCode;

    await prisma.service.update({
      where: { id: service.id },
      data: {
        displayName,
        serviceGroup,
        gender,
        name,
        serviceCode,
      },
    });
    updated += 1;
  }

  console.log(`Refined ${updated} services.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
