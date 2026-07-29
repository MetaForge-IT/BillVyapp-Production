/**
 * Clear all inventory + vendor data (products, stock, POs, categories, vendors).
 * Does not touch services, customers, or auth users.
 *
 *   npx tsx scripts/clear-inventory.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing inventory and vendors…");

  // Detach invoice lines that reference products (keep invoice history)
  await prisma.invoiceLineItem.updateMany({
    where: { productId: { not: null } },
    data: { productId: null },
  });

  await prisma.stockMovement.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.serviceProductLink.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.vendor.deleteMany();

  const [products, categories, vendors, movements, pos] = await Promise.all([
    prisma.product.count(),
    prisma.productCategory.count(),
    prisma.vendor.count(),
    prisma.stockMovement.count(),
    prisma.purchaseOrder.count(),
  ]);

  console.log("Inventory cleared:", { products, categories, vendors, movements, purchaseOrders: pos });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
