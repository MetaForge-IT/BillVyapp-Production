/**
 * Seed sellable packages (salon_plans with planType=package) from catalog package services.
 * The Walk-In / Appointments "Packages" tab reads these — not the services table.
 *
 *   npx tsx scripts/seed-packages.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PACKAGE_CATEGORIES = ["Package", "Make Up Package", "Pre Bridal Package"];

async function main() {
  const salon = await prisma.salon.findFirst({ orderBy: { createdAt: "asc" } });
  if (!salon) throw new Error("No salon found");

  const packageServices = await prisma.service.findMany({
    where: {
      salonId: salon.id,
      deletedAt: null,
      isActive: true,
      category: { name: { in: PACKAGE_CATEGORIES } },
    },
    include: { category: { select: { name: true } } },
    orderBy: [{ category: { name: "asc" } }, { sortOrder: "asc" }],
  });

  let created = 0;
  let skipped = 0;

  for (const service of packageServices) {
    const name = service.displayName || service.name;
    const existing = await prisma.salonPlan.findFirst({
      where: {
        salonId: salon.id,
        planType: "package",
        name,
      },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.salonPlan.create({
      data: {
        salonId: salon.id,
        name,
        namePreset: "custom",
        planType: "package",
        price: service.price,
        validityDays: 30,
        serviceLimit: 1,
        discountPercent:
          service.memberPrice != null && Number(service.price) > 0
            ? Math.round(
                ((Number(service.price) - Number(service.memberPrice)) / Number(service.price)) *
                  100,
              )
            : null,
        description: `${service.category.name} offer`,
        isActive: true,
        planServices: {
          create: [{ serviceId: service.id, quantity: 1 }],
        },
      },
    });
    created += 1;
  }

  // A few multi-service combo packages (if linked services exist)
  const combos: Array<{
    name: string;
    price: number;
    serviceNames: string[];
    description: string;
  }> = [
    {
      name: "Mens Hair Cut + Wash Combo",
      price: 250,
      serviceNames: ["Hair Cut Basic Men", "Shampoo & Conditioning - Men Basic"],
      description: "Haircut with basic wash",
    },
    {
      name: "Ladies Hair Cut + Blowdry Combo",
      price: 500,
      serviceNames: ["Hair Cut Basic Women", "Blowdry Straight (Short)"],
      description: "Ladies cut with blowdry",
    },
  ];

  for (const combo of combos) {
    const existing = await prisma.salonPlan.findFirst({
      where: { salonId: salon.id, planType: "package", name: combo.name },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const linked: { serviceId: string; quantity: number }[] = [];
    for (const display of combo.serviceNames) {
      const svc = await prisma.service.findFirst({
        where: {
          salonId: salon.id,
          deletedAt: null,
          isActive: true,
          OR: [{ displayName: display }, { name: { contains: display } }],
        },
      });
      if (svc) linked.push({ serviceId: svc.id, quantity: 1 });
    }
    if (linked.length === 0) continue;

    await prisma.salonPlan.create({
      data: {
        salonId: salon.id,
        name: combo.name,
        namePreset: "custom",
        planType: "package",
        price: combo.price,
        validityDays: 30,
        serviceLimit: linked.length,
        description: combo.description,
        isActive: true,
        planServices: { create: linked },
      },
    });
    created += 1;
  }

  const total = await prisma.salonPlan.count({
    where: { salonId: salon.id, planType: "package", isActive: true },
  });
  console.log(`Packages seeded: created=${created}, skipped=${skipped}, active packages now=${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
