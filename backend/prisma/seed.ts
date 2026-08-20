/**
 * Dev/local seed — franchise + login accounts + Starr Kuts catalog on existing shops.
 *
 * BLOCKED on production/EC2 by default. Accidental `npm run prisma:seed` will exit
 * without writing anything unless you explicitly set:
 *   ALLOW_PROD_SEED=true
 *
 * Safe to re-run locally (upserts by unique keys).
 *
 * Production login accounts (upserted when seed is allowed):
 *   Super Admin → superadmin@metaforgeit.com / Metaforge Super Admin / meta@12#IT / 9849154456
 *   Admin       → srinivas@starrkuts.com     / Srinivas Varma       / sri@91#Ad  / 8341539999
 *   Admin       → harish@starrkuts.com       / harish               / Harish@123 / 8374789348
 *   Manager     → devteam@metaforgeit.com    / Dev Team             / dev@1234   / 9644925737
 *
 * Run with: npm run prisma:seed
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { seedServiceCatalogForSalon } from "../src/modules/services/seed-service-catalog";

const prisma = new PrismaClient();

function assertSeedAllowed(): void {
  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  const isProd = nodeEnv === "production";
  const allow = (process.env.ALLOW_PROD_SEED ?? "").toLowerCase() === "true";

  if (isProd && !allow) {
    console.error(
      [
        "Refusing to run seed: NODE_ENV=production.",
        "No database changes were made.",
        "This protects EC2/production from accidental seed runs.",
        "Only if you intentionally need a one-off prod seed, re-run with:",
        "  ALLOW_PROD_SEED=true npm run prisma:seed",
      ].join("\n"),
    );
    process.exit(1);
  }

  if (isProd && allow) {
    console.warn(
      "ALLOW_PROD_SEED=true — running seed against production. Proceeding with upserts only.",
    );
  }
}

const FRANCHISE_SLUG = "starr-kuts";

/** Franchise staff — no salon until they create/link a shop in the app. */
const FRANCHISE_ADMIN_ACCOUNTS = [
  {
    role: "admin" as const,
    email: "srinivas@starrkuts.com",
    fullName: "Srinivas Varma",
    password: "sri@91#Ad",
    phone: "8341539999",
  },
  {
    role: "admin" as const,
    email: "harish@starrkuts.com",
    fullName: "harish",
    password: "Harish@123",
    phone: "8374789348",
  },
  {
    role: "manager" as const,
    email: "devteam@metaforgeit.com",
    fullName: "Dev Team",
    password: "dev@1234",
    phone: "9644925737",
  },
];

const SUPER_ADMIN = {
  email: "superadmin@metaforgeit.com",
  fullName: "Metaforge Super Admin",
  password: "meta@12#IT",
  phone: "9849154456",
} as const;

export const SUPER_ADMIN_LOGIN_EMAIL = SUPER_ADMIN.email;
export const ADMIN_LOGIN_EMAIL = "srinivas@starrkuts.com";
export const DEV_TEAM_LOGIN_EMAIL = "devteam@metaforgeit.com";

async function upsertFranchiseUser(params: {
  franchiseId: string;
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "manager";
  phone?: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  const existing = await prisma.user.findFirst({
    where: { email: params.email },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        // Keep an existing salon link if they already created a shop; otherwise null.
        salonId: existing.salonId,
        franchiseId: params.franchiseId,
        email: params.email,
        passwordHash,
        fullName: params.fullName,
        role: params.role,
        phone: params.phone,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      salonId: null,
      franchiseId: params.franchiseId,
      email: params.email,
      passwordHash,
      fullName: params.fullName,
      role: params.role,
      phone: params.phone,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });
}

async function upsertSuperAdmin() {
  const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 10);
  const existing = await prisma.user.findFirst({
    where: { email: SUPER_ADMIN.email },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        salonId: null,
        franchiseId: null,
        passwordHash,
        fullName: SUPER_ADMIN.fullName,
        role: "super_admin",
        phone: SUPER_ADMIN.phone,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      salonId: null,
      franchiseId: null,
      email: SUPER_ADMIN.email,
      passwordHash,
      fullName: SUPER_ADMIN.fullName,
      role: "super_admin",
      phone: SUPER_ADMIN.phone,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });
}

async function main() {
  assertSeedAllowed();

  // ── Franchise (brand only — no shops) ───────────────────────────────────
  const franchise = await prisma.franchise.upsert({
    where: { slug: FRANCHISE_SLUG },
    update: { name: "Starr Kuts", isActive: true },
    create: {
      name: "Starr Kuts",
      slug: FRANCHISE_SLUG,
      isActive: true,
    },
  });

  // ── Super Admin (platform) ──────────────────────────────────────────────
  await upsertSuperAdmin();

  // ── Franchise users (admins + managers) ─────────────────────────────────
  let catalogOwnerId: string | null = null;
  for (const account of FRANCHISE_ADMIN_ACCOUNTS) {
    const user = await upsertFranchiseUser({
      franchiseId: franchise.id,
      email: account.email,
      password: account.password,
      fullName: account.fullName,
      role: account.role,
      phone: account.phone,
    });
    if (account.email === ADMIN_LOGIN_EMAIL) {
      catalogOwnerId = user.id;
    }
  }

  // Deactivate legacy demo seed accounts if they still exist.
  // Do not touch manager@starrkuts.com — that account is created/managed in production.
  await prisma.user.updateMany({
    where: {
      email: { in: ["admin@starrkuts.com", "demo@starrkuts.com"] },
    },
    data: { isActive: false },
  });

  // ── Service catalog on every existing franchise shop ─────────────────────
  const shops = await prisma.salon.findMany({
    where: { franchiseId: franchise.id },
    select: { id: true, name: true, city: true },
    orderBy: { createdAt: "asc" },
  });

  // Franchise admins/managers with no salonId get linked to the first shop so
  // Services / settings APIs are not scoped to an empty salon_id.
  if (shops.length > 0) {
    const primaryShopId = shops[0].id;
    const linked = await prisma.user.updateMany({
      where: {
        franchiseId: franchise.id,
        role: { in: ["admin", "manager"] },
        salonId: null,
        isActive: true,
      },
      data: { salonId: primaryShopId },
    });
    if (linked.count > 0) {
      console.log(
        `Linked ${linked.count} franchise user(s) to primary shop "${shops[0].name}" (${primaryShopId})`,
      );
    }
  }

  if (shops.length === 0) {
    console.log(
      "No shops under franchise yet — catalog will be applied when you re-seed after a shop exists (or upload services).",
    );
  } else {
    for (const shop of shops) {
      const result = await seedServiceCatalogForSalon(prisma, shop.id, catalogOwnerId);
      console.log(
        `Catalog seeded for "${shop.name}"${shop.city ? ` (${shop.city})` : ""}: ${result.categories} categories, ${result.services} services`,
      );
    }
  }

  console.log("Seed complete.");
  console.log(`Franchise: ${franchise.name} (${franchise.slug}) — no shops seeded`);
  console.log("Production login accounts:");
  console.log(
    `  ${"super_admin".padEnd(12)} → ${SUPER_ADMIN.email} / ${SUPER_ADMIN.fullName} / ${SUPER_ADMIN.password} / ${SUPER_ADMIN.phone}`,
  );
  for (const account of FRANCHISE_ADMIN_ACCOUNTS) {
    console.log(
      `  ${account.role.padEnd(12)} → ${account.email} / ${account.fullName} / ${account.password} / ${account.phone}`,
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
