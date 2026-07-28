/**
 * Wipe all salon transactional/demo data, keeping the service catalog (+ salon/users).
 *
 * Kept:
 *   - salons, users, salon settings, business hours
 *   - service_categories, services
 *   - packages / package_services
 *   - salon_plans / salon_plan_services
 *   - membership_tiers
 *
 * Deleted:
 *   - customers and related (memberships, loyalty, wallet, advances, preferences)
 *   - appointments, invoices, payments, coupons/redemptions
 *   - products, stock, vendors, POs, service-product links
 *   - feedback, notifications, expenses, budgets, day closes
 *   - auth session tokens (refresh / OTP / reset / verify) — users remain
 *
 * Run on AWS after pull:
 *   cd backend
 *   npx tsx scripts/wipe-keep-services.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping non-service data…");

  // Deepest dependents first (MySQL FK order)
  await prisma.payment.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.invoice.deleteMany();

  await prisma.appointmentService.deleteMany();
  await prisma.appointment.deleteMany();

  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.serviceProductLink.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.vendor.deleteMany();

  await prisma.customerAdvance.deleteMany();
  await prisma.customerPlanEnrollment.deleteMany();
  await prisma.customerMembership.deleteMany();
  await prisma.customerPreference.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.customer.deleteMany();

  await prisma.coupon.deleteMany();
  await prisma.notification.deleteMany();

  await prisma.budgetLine.deleteMany();
  await prisma.budgetPeriod.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.dayClose.deleteMany();

  await prisma.refreshToken.deleteMany();
  await prisma.loginOtpChallenge.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();

  // Reset receipt sequence so new bills start clean
  await prisma.salonFinancialSettings.updateMany({
    data: { nextReceiptSequence: 1 },
  });

  const [services, categories, users, customers, invoices, products] = await Promise.all([
    prisma.service.count(),
    prisma.serviceCategory.count(),
    prisma.user.count(),
    prisma.customer.count(),
    prisma.invoice.count(),
    prisma.product.count(),
  ]);

  console.log("Wipe complete. Remaining counts:");
  console.log({ services, categories, users, customers, invoices, products });
  console.log("Logins (seed): manager@starrkuts.com / manager@1234");
  console.log("               devteam@metaforgeit.com / dev@1234");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
