import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    "CREATE DATABASE IF NOT EXISTS `new_salon_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
  );
  console.log("Database new_salon_app is ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
