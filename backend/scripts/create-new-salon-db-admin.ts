import { PrismaClient } from "@prisma/client";

/**
 * Creates new_salon_app using an admin DATABASE_URL override:
 *   ADMIN_DATABASE_URL="mysql://admin:ENCODED_PASS@HOST:3306/mysql"
 *
 * Or set via CLI:
 *   set ADMIN_DATABASE_URL=... && npx tsx scripts/create-new-salon-db-admin.ts
 */
const url =
  process.env.ADMIN_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!url) {
  console.error("Set ADMIN_DATABASE_URL (admin user) to create the database.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  await prisma.$executeRawUnsafe(
    "CREATE DATABASE IF NOT EXISTS `new_salon_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
  );
  console.log("CREATE DATABASE ok");

  // Grant app user if present (ignore errors if user/host differs)
  try {
    await prisma.$executeRawUnsafe(
      "GRANT ALL PRIVILEGES ON `new_salon_app`.* TO 'salon_app'@'%'",
    );
    await prisma.$executeRawUnsafe("FLUSH PRIVILEGES");
    console.log("GRANT to salon_app@% ok");
  } catch (e) {
    console.warn("GRANT skipped/failed:", (e as Error).message);
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
