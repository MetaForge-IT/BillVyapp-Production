/**
 * Demo data seed — creates a working demo account plus sample catalog/customer
 * data so the app has something to show. Safe to re-run (upserts by unique keys).
 *
 * Run with: npm run prisma:seed
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

type CatalogService = {
  name: string;
  price: number;
  memberPrice: number | null;
  durationMinutes: number;
};
type CatalogCategory = { category: string; services: CatalogService[] };

const prisma = new PrismaClient();

const DEMO_SALON_EMAIL = "hello@starrkuts-demo.com";
export const DEMO_LOGIN_EMAIL = "manager@starrkuts.com";
const DEMO_LOGIN_PASSWORD = "manager@1234";
const DEMO_LOGIN_NAME = "Starrkuts Manager";
const LEGACY_DEMO_LOGIN_EMAIL = "demo@starrkuts.com";

export const DEV_TEAM_LOGIN_EMAIL = "devteam@metaforgeit.com";
const DEV_TEAM_LOGIN_PASSWORD = "dev@1234";
const DEV_TEAM_LOGIN_NAME = "Dev Team";

async function upsertSalonUser(params: {
  salonId: string;
  email: string;
  password: string;
  fullName: string;
  role?: string;
  phone?: string;
  legacyEmails?: string[];
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const legacy = params.legacyEmails ?? [];
  const existing =
    (await prisma.user.findFirst({
      where: { salonId: params.salonId, email: params.email },
    })) ??
    (legacy.length
      ? await prisma.user.findFirst({
          where: { salonId: params.salonId, email: { in: legacy } },
        })
      : null);

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email: params.email,
        passwordHash,
        fullName: params.fullName,
        role: params.role ?? "manager",
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      salonId: params.salonId,
      email: params.email,
      passwordHash,
      fullName: params.fullName,
      role: params.role ?? "manager",
      phone: params.phone,
      emailVerifiedAt: new Date(),
    },
  });
}

async function main() {
  const salon = await prisma.salon.upsert({
    where: { email: DEMO_SALON_EMAIL },
    update: {},
    create: {
      name: "The Starr Kuts",
      tagline: "Premium salon & grooming lounge",
      address: "12 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      phone: "+91 98765 40000",
      email: DEMO_SALON_EMAIL,
      currency: "INR",
    },
  });

  const owner = await upsertSalonUser({
    salonId: salon.id,
    email: DEMO_LOGIN_EMAIL,
    password: DEMO_LOGIN_PASSWORD,
    fullName: DEMO_LOGIN_NAME,
    role: "manager",
    phone: "+91 98765 43210",
    legacyEmails: [LEGACY_DEMO_LOGIN_EMAIL],
  });

  await upsertSalonUser({
    salonId: salon.id,
    email: DEV_TEAM_LOGIN_EMAIL,
    password: DEV_TEAM_LOGIN_PASSWORD,
    fullName: DEV_TEAM_LOGIN_NAME,
    role: "manager",
  });

  await prisma.salonFinancialSettings.upsert({
    where: { salonId: salon.id },
    update: {},
    create: {
      salonId: salon.id,
      gstEnabled: true,
      defaultGstRate: 18,
      receiptPrefix: "RCP",
      nextReceiptSequence: 2852,
    },
  });

  await prisma.salonNotificationSettings.upsert({
    where: { salonId: salon.id },
    update: {},
    create: { salonId: salon.id },
  });

  // ── Membership tiers ─────────────────────────────────────────────────────
  const tiers = [
    { name: "Basic", slug: "basic", rank: 1, price: 0, discount: 0 },
    { name: "Silver", slug: "silver", rank: 2, price: 1999, discount: 5 },
    { name: "Gold", slug: "gold", rank: 3, price: 4999, discount: 10 },
    { name: "Platinum", slug: "platinum", rank: 4, price: 9999, discount: 15 },
  ];
  const tierMap: Record<string, string> = {};
  for (const t of tiers) {
    const tier = await prisma.membershipTier.upsert({
      where: { salonId_slug: { salonId: salon.id, slug: t.slug } },
      update: {},
      create: {
        salonId: salon.id,
        name: t.name,
        slug: t.slug,
        rank: t.rank,
        price: t.price,
        discountPercent: t.discount,
      },
    });
    tierMap[t.slug] = tier.id;
  }

  // ── Sellable membership plans (Finance → Membership / Customers → Loyalty) ─
  const membershipPlans = [
    { preset: "silver", name: "Silver", price: 1999, discount: 5 },
    { preset: "gold", name: "Gold", price: 4999, discount: 10 },
    { preset: "platinum", name: "Platinum", price: 9999, discount: 15 },
  ] as const;
  for (const mp of membershipPlans) {
    const existing = await prisma.salonPlan.findFirst({
      where: { salonId: salon.id, planType: "membership", namePreset: mp.preset },
    });
    if (!existing) {
      await prisma.salonPlan.create({
        data: {
          salonId: salon.id,
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

  // ── Service catalog (from prisma/service-catalog.json) ───────────────────
  const catalog = JSON.parse(
    readFileSync(join(__dirname, "service-catalog.json"), "utf-8"),
  ) as CatalogCategory[];
  for (let i = 0; i < catalog.length; i += 1) {
    const block = catalog[i];
    const category = await prisma.serviceCategory.upsert({
      where: { salonId_name: { salonId: salon.id, name: block.category } },
      update: { sortOrder: i + 1 },
      create: { salonId: salon.id, name: block.category, sortOrder: i + 1 },
    });
    for (const s of block.services) {
      const existing = await prisma.service.findFirst({
        where: { salonId: salon.id, categoryId: category.id, name: s.name },
      });
      if (!existing) {
        await prisma.service.create({
          data: {
            salonId: salon.id,
            categoryId: category.id,
            name: s.name,
            price: s.price,
            memberPrice: s.memberPrice,
            durationMinutes: s.durationMinutes,
            createdById: owner.id,
          },
        });
      }
    }
  }

  // ── Vendor + products ────────────────────────────────────────────────────
  const vendor = await prisma.vendor.upsert({
    where: { salonId_name: { salonId: salon.id, name: "GlowSupply Distributors" } },
    update: {},
    create: {
      salonId: salon.id,
      name: "GlowSupply Distributors",
      contactPerson: "Ramesh Iyer",
      phone: "+91 98765 20000",
      email: "orders@glowsupply.example.com",
      createdById: owner.id,
    },
  });

  const productCategoryDefs = [
    { name: "Hair Care", sortOrder: 1 },
    { name: "Skin Care", sortOrder: 2 },
  ];
  const productCategories: Record<string, string> = {};
  for (const cat of productCategoryDefs) {
    const created = await prisma.productCategory.upsert({
      where: { salonId_name: { salonId: salon.id, name: cat.name } },
      update: {},
      create: {
        salonId: salon.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
      },
    });
    productCategories[cat.name] = created.id;
  }

  const products = [
    { sku: "LPS-001", name: "Hair Serum Premium", category: "Hair Care", brand: "L'Oreal", stock: 45, min: 20, retail: 850, cost: 620 },
    { sku: "ARG-014", name: "Argan Oil Shampoo", category: "Hair Care", brand: "Moroccanoil", stock: 30, min: 15, retail: 650, cost: 470 },
    { sku: "KRT-007", name: "Keratin Conditioner", category: "Hair Care", brand: "Kerastase", stock: 5, min: 15, retail: 550, cost: 400 },
    { sku: "VTC-022", name: "Vitamin C Face Cream", category: "Skin Care", brand: "Olay", stock: 18, min: 10, retail: 1200, cost: 880 },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { salonId_sku: { salonId: salon.id, sku: p.sku } },
      update: {},
      create: {
        salonId: salon.id,
        vendorId: vendor.id,
        categoryId: productCategories[p.category],
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        stockQty: p.stock,
        minStockQty: p.min,
        retailPrice: p.retail,
        costPrice: p.cost,
        stockStatus: p.stock < p.min ? "low" : "ok",
        createdById: owner.id,
      },
    });
  }

  // ── Customers / appointments / invoices / feedback ────────────────────────
  // Intentionally not seeded — keep production DB free of demo transactional data.

  console.log("Seed complete.");
  console.log(`Manager login → email: ${DEMO_LOGIN_EMAIL}  password: ${DEMO_LOGIN_PASSWORD}`);
  console.log(`Dev team login → email: ${DEV_TEAM_LOGIN_EMAIL}  password: ${DEV_TEAM_LOGIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
