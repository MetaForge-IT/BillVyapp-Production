/**
 * Backfill loyalty earn transactions for paid invoices that never credited points.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: "paid",
      voidedAt: null,
      totalAmount: { gt: 0 },
    },
    include: {
      customer: {
        include: { currentTier: { select: { pointsMultiplier: true } } },
      },
    },
    orderBy: { invoiceDate: "asc" },
  });

  let credited = 0;
  for (const invoice of invoices) {
    const existing = await prisma.loyaltyTransaction.findFirst({
      where: { invoiceId: invoice.id, type: "earn" },
      select: { id: true },
    });
    if (existing) continue;

    const settings = await prisma.salonFinancialSettings.findUnique({
      where: { salonId: invoice.salonId },
      select: { loyaltyPointsPerRupee: true },
    });
    const rate = settings ? Number(settings.loyaltyPointsPerRupee) : 0.1;
    const multiplier = invoice.customer.currentTier
      ? Number(invoice.customer.currentTier.pointsMultiplier) || 1
      : 1;

    let points = invoice.loyaltyPointsEarned;
    if (points <= 0) {
      points = Math.floor(Number(invoice.totalAmount) * rate * multiplier);
    } else if (multiplier !== 1) {
      points = Math.floor(points * multiplier);
    }
    if (points <= 0) continue;

    const balanceAfter = invoice.customer.loyaltyPoints + points;
    await prisma.$transaction([
      prisma.loyaltyTransaction.create({
        data: {
          salonId: invoice.salonId,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          type: "earn",
          points,
          balanceAfter,
          note: `Backfill earn on ${invoice.receiptNumber}`,
        },
      }),
      prisma.customer.update({
        where: { id: invoice.customerId },
        data: { loyaltyPoints: balanceAfter },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { loyaltyPointsEarned: points },
      }),
    ]);
    credited += 1;
    console.log(
      `+${points} pts → ${invoice.customer.fullName} (${invoice.receiptNumber}, ₹${Number(invoice.totalAmount)})`,
    );
  }

  console.log(`Done. Credited ${credited} invoice(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
