import type { Customer, CustomerPreference, MembershipTier, Service } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { AppError, ConflictError } from "../../utils/errors";
import { APPOINTMENT_STATUS } from "../appointments/appointments.constants";
import { INVOICE_STATUS } from "../billing/billing.constants";
import { CUSTOMER_ERROR_CODES, LOYALTY_TRANSACTION_TYPE } from "./customers.constants";
import type {
  CreateCustomerInput,
  RedeemLoyaltyInput,
  UpdateCustomerInput,
} from "./customers.validators";

type CustomerWithRelations = Customer & {
  currentTier: MembershipTier | null;
  preferences: (CustomerPreference & { favoriteService: Pick<Service, "name"> | null }) | null;
};

function formatRelativeDate(date: Date | null): string {
  if (!date) return "Never";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? "s" : ""} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 365)} year${diffDays >= 730 ? "s" : ""} ago`;
}

function mapCustomer(customer: CustomerWithRelations) {
  return {
    id: customer.id,
    name: customer.fullName,
    phone: customer.phone,
    email: customer.email ?? "",
    gender: (customer.gender as "male" | "female" | "other" | null) ?? "other",
    membershipTier: customer.currentTier?.slug ?? "basic",
    loyaltyPoints: customer.loyaltyPoints,
    totalVisits: customer.totalVisits,
    totalSpend: Number(customer.totalSpend),
    lastVisitDate: customer.lastVisitAt?.toISOString().slice(0, 10) ?? "",
    lastVisit: formatRelativeDate(customer.lastVisitAt),
    favoriteService: customer.preferences?.favoriteService?.name ?? "",
    preferredStaff: customer.preferences?.preferredStaffName ?? "",
    birthday: customer.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    satisfaction: customer.avgSatisfaction != null ? Number(customer.avgSatisfaction) : 0,
    joinDate: customer.joinedAt.toISOString().slice(0, 10),
    address: customer.address ?? "",
    notes: customer.preferences?.notes ?? "",
    gstin: customer.gstin ?? "",
    status: customer.status as "active" | "inactive",
  };
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export class CustomersRepository {
  async list(salonId: string) {
    const customers = await prisma.customer.findMany({
      where: { salonId, deletedAt: null },
      include: {
        currentTier: true,
        preferences: { include: { favoriteService: { select: { name: true } } } },
      },
      orderBy: [{ createdAt: "desc" }],
    });
    return customers.map(mapCustomer);
  }

  async getById(salonId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, salonId, deletedAt: null },
      include: {
        currentTier: true,
        preferences: { include: { favoriteService: { select: { name: true } } } },
      },
    });
    if (!customer) {
      throw new AppError(404, "Customer not found", { code: CUSTOMER_ERROR_CODES.NOT_FOUND });
    }
    return mapCustomer(customer);
  }

  async create(auth: AuthContext, input: CreateCustomerInput) {
    const phoneNormalized = normalizePhone(input.phone);
    const existing = await prisma.customer.findFirst({
      where: { salonId: auth.salonId, phoneNormalized, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError("A customer with this phone number already exists");
    }

    const customer = await prisma.customer.create({
      data: {
        salonId: auth.salonId,
        fullName: input.fullName,
        phone: input.phone,
        phoneNormalized,
        email: input.email || null,
        gender: input.gender ?? null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        address: input.address ?? null,
        gstin: input.gstin ?? null,
        status: input.status ?? "active",
        joinedAt: new Date(),
        createdById: auth.userId,
        preferences: input.notes
          ? { create: { notes: input.notes } }
          : undefined,
      },
      include: {
        currentTier: true,
        preferences: { include: { favoriteService: { select: { name: true } } } },
      },
    });

    return mapCustomer(customer);
  }

  async update(auth: AuthContext, customerId: string, input: UpdateCustomerInput) {
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, salonId: auth.salonId, deletedAt: null },
    });
    if (!existing) {
      throw new AppError(404, "Customer not found", { code: CUSTOMER_ERROR_CODES.NOT_FOUND });
    }

    if (input.phone) {
      const phoneNormalized = normalizePhone(input.phone);
      const duplicate = await prisma.customer.findFirst({
        where: {
          salonId: auth.salonId,
          phoneNormalized,
          deletedAt: null,
          NOT: { id: customerId },
        },
      });
      if (duplicate) {
        throw new ConflictError("A customer with this phone number already exists");
      }
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        phoneNormalized: input.phone ? normalizePhone(input.phone) : undefined,
        email: input.email === "" ? null : input.email,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        address: input.address,
        gstin: input.gstin,
        status: input.status,
        updatedById: auth.userId,
        preferences: input.notes
          ? {
              upsert: {
                create: { notes: input.notes },
                update: { notes: input.notes },
              },
            }
          : undefined,
      },
      include: {
        currentTier: true,
        preferences: { include: { favoriteService: { select: { name: true } } } },
      },
    });

    return mapCustomer(customer);
  }

  async getVisits(salonId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, salonId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) {
      throw new AppError(404, "Customer not found", { code: CUSTOMER_ERROR_CODES.NOT_FOUND });
    }

    const [appointments, invoices] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          salonId,
          customerId,
          status: APPOINTMENT_STATUS.COMPLETED,
        },
        include: {
          services: { orderBy: { sortOrder: "asc" }, select: { itemName: true, price: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 200,
      }),
      prisma.invoice.findMany({
        where: {
          salonId,
          customerId,
          status: INVOICE_STATUS.PAID,
          voidedAt: null,
        },
        include: {
          lineItems: { select: { itemName: true, lineTotal: true, lineType: true } },
          payments: { select: { paymentMethod: true, amount: true, paidAt: true }, take: 1 },
        },
        orderBy: { invoiceDate: "desc" },
        take: 200,
      }),
    ]);

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const walletTransactions = invoiceIds.length
      ? await prisma.walletTransaction.findMany({
          where: { salonId, customerId, invoiceId: { in: invoiceIds } },
          select: { invoiceId: true, amount: true },
        })
      : [];
    const walletUsedByInvoiceId = new Map<string, number>();
    for (const tx of walletTransactions) {
      if (tx.invoiceId == null) continue;
      const key = tx.invoiceId.toString();
      walletUsedByInvoiceId.set(key, (walletUsedByInvoiceId.get(key) ?? 0) + Number(tx.amount));
    }

    type VisitEntry = {
      type: "appointment" | "invoice";
      id: string;
      date: string;
      label: string;
      amount: number;
      meta: Record<string, unknown>;
    };

    const visits: VisitEntry[] = [];

    for (const appointment of appointments) {
      const dateSource = appointment.completedAt ?? appointment.scheduledDate;
      const services = appointment.services.map((s) => s.itemName);
      const amount = appointment.services.reduce((sum, s) => sum + Number(s.price), 0);

      visits.push({
        type: "appointment",
        id: appointment.id,
        date: dateSource.toISOString(),
        label: services.join(", ") || "Completed appointment",
        amount,
        meta: {
          appointmentId: appointment.id,
          staffName: appointment.staffName,
          services,
          scheduledDate: appointment.scheduledDate.toISOString().slice(0, 10),
        },
      });
    }

    for (const invoice of invoices) {
      const services = invoice.lineItems
        .filter((line) => line.lineType !== "product")
        .map((line) => line.itemName);
      const products = invoice.lineItems
        .filter((line) => line.lineType === "product")
        .map((line) => line.itemName);

      visits.push({
        type: "invoice",
        id: invoice.publicId,
        date: invoice.invoiceDate.toISOString(),
        label: `${invoice.receiptNumber} · ${services.join(", ") || "Paid invoice"}`,
        amount: Number(invoice.totalAmount),
        meta: {
          invoiceId: invoice.publicId,
          receiptNumber: invoice.receiptNumber,
          services,
          products,
          paymentMethod: invoice.payments[0]?.paymentMethod ?? null,
          amountPaid: Number(invoice.amountPaid),
          membershipUsed: Number(invoice.membershipDiscount) > 0,
          membershipDiscount: Number(invoice.membershipDiscount),
          walletUsed: walletUsedByInvoiceId.get(invoice.id.toString()) ?? 0,
        },
      });
    }

    visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return visits;
  }

  async getLoyaltyTransactions(salonId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, salonId, deletedAt: null },
      select: { id: true, loyaltyPoints: true },
    });
    if (!customer) {
      throw new AppError(404, "Customer not found", { code: CUSTOMER_ERROR_CODES.NOT_FOUND });
    }

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { salonId, customerId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return {
      loyaltyPoints: customer.loyaltyPoints,
      transactions: transactions.map((tx) => ({
        id: tx.publicId,
        type: tx.type,
        points: tx.points,
        balanceAfter: tx.balanceAfter,
        note: tx.note ?? "",
        invoiceId: tx.invoiceId != null ? String(tx.invoiceId) : null,
        createdAt: tx.createdAt.toISOString(),
      })),
    };
  }

  async redeemLoyalty(auth: AuthContext, customerId: string, input: RedeemLoyaltyInput) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, salonId: auth.salonId, deletedAt: null },
    });
    if (!customer) {
      throw new AppError(404, "Customer not found", { code: CUSTOMER_ERROR_CODES.NOT_FOUND });
    }

    if (customer.loyaltyPoints < input.points) {
      throw new AppError(400, "Insufficient loyalty points", {
        code: CUSTOMER_ERROR_CODES.INSUFFICIENT_LOYALTY_POINTS,
      });
    }

    const balanceAfter = customer.loyaltyPoints - input.points;

    const [updatedCustomer, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: balanceAfter, updatedById: auth.userId },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          salonId: auth.salonId,
          customerId,
          type: LOYALTY_TRANSACTION_TYPE.REDEEM,
          points: -input.points,
          balanceAfter,
          note: `Redeemed ${input.points} points`,
        },
      }),
    ]);

    return {
      loyaltyPoints: updatedCustomer.loyaltyPoints,
      transaction: {
        id: transaction.publicId,
        type: transaction.type,
        points: transaction.points,
        balanceAfter: transaction.balanceAfter,
        note: transaction.note ?? "",
        createdAt: transaction.createdAt.toISOString(),
      },
    };
  }

  async softDelete(auth: AuthContext, customerId: string) {
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, salonId: auth.salonId, deletedAt: null },
    });
    if (!existing) {
      throw new AppError(404, "Customer not found", { code: CUSTOMER_ERROR_CODES.NOT_FOUND });
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        deletedAt: new Date(),
        deletedById: auth.userId,
        status: "inactive",
      },
    });
  }
}

export const customersRepository = new CustomersRepository();
