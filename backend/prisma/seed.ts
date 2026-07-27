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
export const DEMO_LOGIN_EMAIL = "demo@starrkuts.com";
const DEMO_LOGIN_PASSWORD = "Demo@1234";

function phoneNorm(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

function timeAt(hours: number, minutes: number): Date {
  return new Date(`1970-01-01T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00.000Z`);
}

function startOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

  const passwordHash = await bcrypt.hash(DEMO_LOGIN_PASSWORD, 10);

  const owner = await prisma.user.upsert({
    where: { salonId_email: { salonId: salon.id, email: DEMO_LOGIN_EMAIL } },
    update: { passwordHash, emailVerifiedAt: new Date() },
    create: {
      salonId: salon.id,
      email: DEMO_LOGIN_EMAIL,
      passwordHash,
      fullName: "Vikram Malhotra",
      role: "manager",
      phone: "+91 98765 43210",
      emailVerifiedAt: new Date(),
    },
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
  const serviceMap: Record<string, { id: string; price: number; duration: number }> = {};
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
      const service =
        existing ??
        (await prisma.service.create({
          data: {
            salonId: salon.id,
            categoryId: category.id,
            name: s.name,
            price: s.price,
            memberPrice: s.memberPrice,
            durationMinutes: s.durationMinutes,
            createdById: owner.id,
          },
        }));
      if (!serviceMap[s.name]) {
        serviceMap[s.name] = { id: service.id, price: s.price, duration: s.durationMinutes };
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

  // ── Customers ─────────────────────────────────────────────────────────────
  const customerDefs = [
    { name: "Sarah Johnson", phone: "+91 98765 43210", email: "sarah.j@email.com", gender: "female", tier: "platinum", visits: 47, spend: 124500, loyalty: 2450, satisfaction: 4.9, status: "active", lastVisit: "2026-06-15", joined: "2024-01-15" },
    { name: "Michael Chen", phone: "+91 98765 43211", email: "michael.c@email.com", gender: "male", tier: "gold", visits: 28, spend: 67800, loyalty: 1280, satisfaction: 4.7, status: "active", lastVisit: "2026-06-10", joined: "2024-03-20" },
    { name: "Lisa Anderson", phone: "+91 98765 43212", email: "lisa.a@email.com", gender: "female", tier: "platinum", visits: 62, spend: 186000, loyalty: 3120, satisfaction: 5.0, status: "active", lastVisit: "2026-06-17", joined: "2023-11-10" },
    { name: "Emily Davis", phone: "+91 98765 43213", email: "emily.d@email.com", gender: "female", tier: "silver", visits: 15, spend: 34500, loyalty: 650, satisfaction: 4.8, status: "active", lastVisit: "2026-06-14", joined: "2024-09-05" },
    { name: "Robert Wilson", phone: "+91 98765 43214", email: "robert.w@email.com", gender: "male", tier: "gold", visits: 31, spend: 78600, loyalty: 1540, satisfaction: 4.6, status: "active", lastVisit: "2026-06-12", joined: "2024-02-14" },
    { name: "Jessica Martinez", phone: "+91 98765 43215", email: "jessica.m@email.com", gender: "female", tier: "basic", visits: 8, spend: 18400, loyalty: 320, satisfaction: 4.5, status: "inactive", lastVisit: "2026-04-10", joined: "2025-12-01" },
    { name: "Raj Kumar", phone: "+91 98765 43216", email: "raj.k@email.com", gender: "male", tier: "silver", visits: 12, spend: 24000, loyalty: 480, satisfaction: 4.3, status: "inactive", lastVisit: "2026-03-15", joined: "2025-06-10" },
    { name: "Deepa Nair", phone: "+91 99887 66554", email: "deepa.n@email.com", gender: "female", tier: "gold", visits: 20, spend: 52000, loyalty: 900, satisfaction: 4.6, status: "active", lastVisit: "2026-06-28", joined: "2024-06-01" },
    { name: "Karthik Menon", phone: "+91 88776 55443", email: "karthik.m@email.com", gender: "male", tier: "silver", visits: 10, spend: 28000, loyalty: 400, satisfaction: 4.4, status: "active", lastVisit: "2026-06-29", joined: "2025-01-10" },
  ];

  const customerMap: Record<string, string> = {};
  for (const c of customerDefs) {
    const normalized = phoneNorm(c.phone);
    const customer = await prisma.customer.upsert({
      where: { salonId_phoneNormalized: { salonId: salon.id, phoneNormalized: normalized } },
      update: {
        currentTierId: tierMap[c.tier],
        totalVisits: c.visits,
        totalSpend: c.spend,
        loyaltyPoints: c.loyalty,
        avgSatisfaction: c.satisfaction,
        status: c.status,
        lastVisitAt: new Date(c.lastVisit),
      },
      create: {
        salonId: salon.id,
        fullName: c.name,
        phone: c.phone,
        phoneNormalized: normalized,
        email: c.email,
        gender: c.gender,
        currentTierId: tierMap[c.tier],
        totalVisits: c.visits,
        totalSpend: c.spend,
        loyaltyPoints: c.loyalty,
        avgSatisfaction: c.satisfaction,
        status: c.status,
        lastVisitAt: new Date(c.lastVisit),
        joinedAt: new Date(c.joined),
        createdById: owner.id,
      },
    });
    customerMap[c.name] = customer.id;
  }

  // ── Appointments (spread across recent + upcoming days for dashboard) ─────
  const today = startOfDay();
  const legacyDemoDate = new Date("2026-06-25");
  const legacyOffsets = [-4, -2, -1, 0, 0, 1];
  const legacyAppointments = await prisma.appointment.findMany({
    where: { salonId: salon.id, scheduledDate: legacyDemoDate },
    orderBy: { scheduledTime: "asc" },
  });
  for (let i = 0; i < legacyAppointments.length; i += 1) {
    await prisma.appointment.update({
      where: { id: legacyAppointments[i].id },
      data: { scheduledDate: addDays(today, legacyOffsets[i] ?? 0) },
    });
  }

  const appointmentDefs = [
    { customer: "Sarah Johnson", service: "Cellular Radiance Facial", time: [9, 0], duration: 45, status: "confirmed", type: "appointment", staff: "Emma Wilson", dayOffset: -4 },
    { customer: "Michael Chen", service: "Hair Cut Basic Men", time: [9, 30], duration: 30, status: "confirmed", type: "appointment", staff: "David Brown", dayOffset: -2 },
    { customer: "Lisa Anderson", service: "Aroma Oil for Female (Short)", time: [10, 30], duration: 45, status: "in_progress", type: "walk_in", staff: "Maria Garcia", dayOffset: -1 },
    { customer: "Robert Wilson", service: "Beard Trimming", time: [11, 0], duration: 20, status: "confirmed", type: "appointment", staff: "James Lee", dayOffset: 0 },
    { customer: "Emily Davis", service: "Express Manicure", time: [14, 0], duration: 30, status: "pending", type: "appointment", staff: "Sophie Turner", dayOffset: 0 },
    { customer: "Raj Kumar", service: "Bridal Make Up with Mac", time: [15, 0], duration: 120, status: "confirmed", type: "appointment", staff: "Emma Wilson", dayOffset: 1 },
  ];

  const appointmentMap: Record<string, string> = {};
  for (const a of appointmentDefs) {
    const customerId = customerMap[a.customer];
    const svc = serviceMap[a.service];
    if (!customerId || !svc) continue;

    const scheduledDate = addDays(today, a.dayOffset);

    const existing = await prisma.appointment.findFirst({
      where: {
        salonId: salon.id,
        customerId,
        scheduledDate,
        scheduledTime: timeAt(a.time[0], a.time[1]),
      },
    });

    const appointment =
      existing ??
      (await prisma.appointment.create({
        data: {
          salonId: salon.id,
          customerId,
          appointmentType: a.type,
          status: a.status,
          scheduledDate,
          scheduledTime: timeAt(a.time[0], a.time[1]),
          durationMinutes: a.duration,
          staffName: a.staff,
          createdById: owner.id,
          services: {
            create: [{
              serviceId: svc.id,
              itemName: a.service,
              price: svc.price,
              durationMinutes: svc.duration,
              sortOrder: 0,
            }],
          },
        },
      }));
    appointmentMap[`${a.customer}-${a.service}`] = appointment.id;
  }

  // ── Invoices / receipts ───────────────────────────────────────────────────
  const invoiceDefs = [
    { receipt: "RCP-2847", customer: "Sarah Johnson", services: ["Cellular Radiance Facial", "Brightening Mask"], subtotal: 3900, discount: 390, gst: 632, total: 4142, paid: 4142, status: "paid", method: "upi", source: "pos", date: "2026-06-18" },
    { receipt: "RCP-2846", customer: "Michael Chen", services: ["Hair Cut Basic Men"], subtotal: 200, discount: 0, gst: 36, total: 236, paid: 236, status: "paid", method: "upi", source: "appointment", date: "2026-06-17" },
    { receipt: "RCP-2845", customer: "Emily Davis", services: ["Express Manicure", "Express Pedicure"], subtotal: 700, discount: 70, gst: 113, total: 743, paid: 743, status: "paid", method: "card", source: "appointment", date: "2026-06-16" },
    { receipt: "RCP-2848", customer: "Deepa Nair", services: ["Hair Spa Experience Premium - Women (Medium)"], subtotal: 1500, discount: 0, gst: 270, total: 1500, paid: 500, status: "partially_paid", method: "upi", source: "appointment", date: "2026-06-28", dueDate: "2026-07-01" },
    { receipt: "RCP-2849", customer: "Karthik Menon", services: ["Beard Designing"], subtotal: 175, discount: 0, gst: 32, total: 175, paid: 0, status: "pending", method: "none", source: "appointment", date: "2026-06-29", dueDate: "2026-06-30" },
  ];

  for (const inv of invoiceDefs) {
    const customerId = customerMap[inv.customer];
    if (!customerId) continue;

    const existing = await prisma.invoice.findFirst({
      where: { salonId: salon.id, receiptNumber: inv.receipt },
    });
    if (existing) continue;

    const invoiceDate = new Date(inv.date);
    const balance = inv.total - inv.paid;

    await prisma.invoice.create({
      data: {
        salonId: salon.id,
        customerId,
        receiptNumber: inv.receipt,
        invoiceDate,
        invoiceTime: timeAt(11, 30),
        source: inv.source,
        status: inv.status,
        subtotal: inv.subtotal,
        discountAmount: inv.discount,
        gstRate: 18,
        gstAmount: inv.gst,
        totalAmount: inv.total,
        amountPaid: inv.paid,
        balanceAmount: balance,
        dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
        createdById: owner.id,
        lineItems: {
          create: inv.services.map((name) => ({
            lineType: "service",
            itemName: name,
            quantity: 1,
            unitPrice: inv.subtotal / inv.services.length,
            lineDiscount: inv.discount / inv.services.length,
            lineTotal: (inv.subtotal - inv.discount) / inv.services.length,
          })),
        },
        payments:
          inv.paid > 0
            ? {
                create: [{
                  paymentMethod: inv.method === "none" ? "cash" : inv.method,
                  amount: inv.paid,
                  paidAt: invoiceDate,
                }],
              }
            : undefined,
      },
    });
  }

  // ── Completed appointments + feedback ─────────────────────────────────────
  const completedAppointmentDefs = [
    { customer: "Sarah Johnson", service: "Cellular Radiance Facial", staff: "Emma Wilson", rating: 5, comment: "Absolutely loved the result! Emma understood exactly what I wanted and delivered perfectly.", source: "google", status: "resolved", replied: true, replyText: "Thank you Sarah! We are thrilled you loved your visit." },
    { customer: "Michael Chen", service: "Hair Cut Basic Men", staff: "David Brown", rating: 4, comment: "Great haircut, very professional. The wait time was a bit long but the quality made up for it.", source: "app", status: "reviewed", replied: true, replyText: "Thank you Michael! We're glad you enjoyed your visit." },
    { customer: "Lisa Anderson", service: "Aroma Oil for Female (Short)", staff: "Maria Garcia", rating: 5, comment: "Best head massage I've had. Will definitely be coming back!", source: "app", status: "new", replied: false },
    { customer: "Emily Davis", service: "Express Manicure", staff: "Sophie Turner", rating: 2, comment: "Disappointed with the service this time. Products felt cheap.", source: "google", status: "new", replied: false },
    { customer: "Raj Kumar", service: "Bridal Make Up with Mac", staff: "Emma Wilson", rating: 1, comment: "Very unhappy with the bridal makeup. Too expensive for what was delivered.", source: "google", status: "new", replied: false },
  ];

  for (const fb of completedAppointmentDefs) {
    const customerId = customerMap[fb.customer];
    const appointmentKey = `${fb.customer}-${fb.service}`;
    const appointmentId = appointmentMap[appointmentKey];
    if (!customerId || !appointmentId) continue;

    await prisma.appointment.updateMany({
      where: { id: appointmentId, salonId: salon.id },
      data: { status: "completed", completedAt: new Date() },
    });

    const existingFeedback = await prisma.feedback.findFirst({
      where: { salonId: salon.id, appointmentId },
    });
    if (existingFeedback) continue;

    const sentiment = fb.rating >= 4 ? "positive" : fb.rating === 3 ? "neutral" : "negative";
    await prisma.feedback.create({
      data: {
        salonId: salon.id,
        customerId,
        appointmentId,
        serviceName: fb.service,
        staffName: fb.staff,
        rating: fb.rating,
        comment: fb.comment,
        sentiment,
        status: fb.status,
        source: fb.source,
        isReplied: fb.replied ?? false,
        replyText: fb.replyText ?? null,
        repliedAt: fb.replied ? new Date() : null,
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Demo login → email: ${DEMO_LOGIN_EMAIL}  password: ${DEMO_LOGIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
