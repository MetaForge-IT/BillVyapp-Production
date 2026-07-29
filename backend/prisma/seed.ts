/**
 * Production-safe seed — salon + service catalog + login accounts.
 * Safe to re-run (upserts by unique keys). Does NOT seed inventory/vendors.
 *
 * Production login accounts (always upserted):
 *   Dev     → devteam@metaforgeit.com / Dev Team / dev@1234 / 9644925737
 *   Manager → manager@starrkuts.com   / Durga    / Du@24m#  / 7995352422
 *   Admin   → admin@starrkuts.com     / Vikram   / vik@247Admin / 9849992474
 *
 * Run with: npm run prisma:seed
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
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
  gender?: "MALE" | "FEMALE" | "UNISEX";
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

const DEMO_SALON_EMAIL = "hello@starrkuts-demo.com";
const LEGACY_DEMO_LOGIN_EMAIL = "demo@starrkuts.com";

/** Production login accounts — kept in seed so deploy/seed always restores them. */
const PRODUCTION_LOGIN_ACCOUNTS = [
  {
    role: "manager",
    email: "devteam@metaforgeit.com",
    fullName: "Dev Team",
    password: "dev@1234",
    phone: "9644925737",
  },
  {
    role: "manager",
    email: "manager@starrkuts.com",
    fullName: "Durga",
    password: "Du@24m#",
    phone: "7995352422",
    legacyEmails: [LEGACY_DEMO_LOGIN_EMAIL],
  },
  {
    role: "admin",
    email: "admin@starrkuts.com",
    fullName: "Vikram",
    password: "vik@247Admin",
    phone: "9849992474",
  },
] as const;

export const DEMO_LOGIN_EMAIL = "manager@starrkuts.com";
export const DEV_TEAM_LOGIN_EMAIL = "devteam@metaforgeit.com";
export const ADMIN_LOGIN_EMAIL = "admin@starrkuts.com";

async function upsertSalonUser(params: {
  salonId: string;
  email: string;
  password: string;
  fullName: string;
  role?: string;
  phone?: string;
  legacyEmails?: readonly string[];
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const legacy = params.legacyEmails ?? [];
  const existing =
    (await prisma.user.findFirst({
      where: { salonId: params.salonId, email: params.email },
    })) ??
    (legacy.length
      ? await prisma.user.findFirst({
          where: { salonId: params.salonId, email: { in: [...legacy] } },
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
        phone: params.phone,
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

  // ── Production login accounts (Dev / Manager / Admin) ────────────────────
  let ownerId: string | null = null;
  for (const account of PRODUCTION_LOGIN_ACCOUNTS) {
    const user = await upsertSalonUser({
      salonId: salon.id,
      email: account.email,
      password: account.password,
      fullName: account.fullName,
      role: account.role,
      phone: account.phone,
      legacyEmails: "legacyEmails" in account ? account.legacyEmails : undefined,
    });
    if (account.email === DEMO_LOGIN_EMAIL) {
      ownerId = user.id;
    }
  }

  if (!ownerId) {
    throw new Error("Manager account missing after seed — cannot continue catalog seed.");
  }
  const owner = { id: ownerId };

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

  // ── Service catalog (PDF menu + Laser Hair Reduction) ────────────────────
  const catalogFiles = ["service-catalog.json", "laser-hair-reduction-catalog.json"];
  const catalog: CatalogCategory[] = catalogFiles.flatMap((file) =>
    JSON.parse(readFileSync(join(__dirname, file), "utf-8")) as CatalogCategory[],
  );
  for (let i = 0; i < catalog.length; i += 1) {
    const block = catalog[i];
    const category = await prisma.serviceCategory.upsert({
      where: { salonId_name: { salonId: salon.id, name: block.category } },
      update: {
        sortOrder: i + 1,
        description: block.description ?? undefined,
        icon: block.icon ?? undefined,
      },
      create: {
        salonId: salon.id,
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
      const serviceCode = buildServiceCode({
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
          OR: [
            { serviceCode },
            { displayName, gender, serviceGroup },
            { name: fullName },
          ],
        },
      });
      if (!existing) {
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
            createdById: owner.id,
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
            sortOrder: si + 1,
          },
        });
      }
    }
  }

  // ── Inventory / vendors ───────────────────────────────────────────────────
  // Intentionally NOT seeded. Demo products/vendors caused production noise;
  // inventory stays empty until staff add real stock.

  // ── Sellable packages (Walk-In / Appointments Packages tab) ───────────────
  const packageCategoryNames = ["Package", "Make Up Package", "Pre Bridal Package"];
  const packageServices = await prisma.service.findMany({
    where: {
      salonId: salon.id,
      deletedAt: null,
      isActive: true,
      category: { name: { in: packageCategoryNames } },
    },
    include: { category: { select: { name: true } } },
  });
  for (const service of packageServices) {
    const name = service.displayName || service.name;
    const existingPkg = await prisma.salonPlan.findFirst({
      where: { salonId: salon.id, planType: "package", name },
    });
    if (existingPkg) continue;
    await prisma.salonPlan.create({
      data: {
        salonId: salon.id,
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

  // ── Customers / appointments / invoices / feedback ────────────────────────
  // Intentionally not seeded — keep production DB free of demo transactional data.

  console.log("Seed complete.");
  console.log("Production login accounts:");
  for (const account of PRODUCTION_LOGIN_ACCOUNTS) {
    console.log(
      `  ${account.role.padEnd(8)} → ${account.email} / ${account.fullName} / ${account.password} / ${account.phone}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
