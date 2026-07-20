/**
 * Merge duplicate customers created by billing phone-normalization mismatch
 * (10-digit vs 91XXXXXXXXXX). Keeps the richer profile and soft-deletes duplicates.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      salonId: true,
      fullName: true,
      phoneNormalized: true,
      loyaltyPoints: true,
      currentTierId: true,
      totalSpend: true,
      totalVisits: true,
      createdAt: true,
    },
  });

  const groups = new Map<string, typeof customers>();
  for (const c of customers) {
    const key = `${c.salonId}:${c.phoneNormalized.slice(-10)}`;
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }

  let merged = 0;
  for (const [, list] of groups) {
    if (list.length < 2) continue;

    list.sort((a, b) => {
      const score = (x: (typeof list)[number]) =>
        (x.currentTierId ? 100000 : 0) + x.loyaltyPoints + Number(x.totalSpend) + x.totalVisits * 10;
      return score(b) - score(a) || a.createdAt.getTime() - b.createdAt.getTime();
    });

    const keep = list[0];
    const drop = list.slice(1);

    for (const dup of drop) {
      await prisma.$transaction(async (tx) => {
        await tx.invoice.updateMany({
          where: { customerId: dup.id },
          data: { customerId: keep.id },
        });
        await tx.appointment.updateMany({
          where: { customerId: dup.id },
          data: { customerId: keep.id },
        });
        await tx.loyaltyTransaction.updateMany({
          where: { customerId: dup.id },
          data: { customerId: keep.id },
        });
        await tx.customerPlanEnrollment.updateMany({
          where: { customerId: dup.id },
          data: { customerId: keep.id },
        });
        await tx.customerAdvance.updateMany({
          where: { customerId: dup.id },
          data: { customerId: keep.id },
        });
        await tx.customer.update({
          where: { id: dup.id },
          data: {
            deletedAt: new Date(),
            status: "inactive",
            phoneNormalized: `dup_${dup.id.slice(0, 8)}_${dup.phoneNormalized}`.slice(0, 20),
          },
        });
      });
      merged += 1;
      console.log(`Merged ${dup.fullName} (${dup.id}) → ${keep.id} [${keep.loyaltyPoints} pts]`);
    }
  }

  console.log(`Done. Merged ${merged} duplicate customer(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
