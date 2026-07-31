import type { Invoice, InvoiceLineItem, Payment, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import type { CheckoutInput, CollectPaymentInput, ConfirmOnlyInput, RequestRefundInput } from "./billing.validators";
import {
  APPOINTMENT_STATUS,
  BILLING_ERROR_CODES,
  INVOICE_STATUS,
  REFUND_NOTE_PREFIX,
  type InvoiceStatus,
} from "./billing.constants";
import { AppError } from "../../utils/errors";
import { applyStockChange, MOVEMENT_TYPE, notifyStockChangeResult, type StockChangeResult } from "../inventory/inventory.shared";
import { appNotificationGenerator } from "../app-notifications/app-notifications.generator";
import { LOYALTY_TRANSACTION_TYPE } from "../customers/customers.constants";

type InvoiceWithRelations = Invoice & {
  lineItems: InvoiceLineItem[];
  payments: Payment[];
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length > 10) return digits.slice(-12).replace(/^0+/, "") || digits;
  return digits;
}

function phoneLookupKeys(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const last10 = normalized.slice(-10);
  const keys = new Set<string>();
  if (normalized) keys.add(normalized);
  if (last10) {
    keys.add(last10);
    keys.add(`91${last10}`);
  }
  return [...keys];
}

function computeInvoiceStatus(totalAmount: number, amountPaid: number): InvoiceStatus {
  if (amountPaid <= 0) return INVOICE_STATUS.PENDING;
  if (amountPaid < totalAmount) return INVOICE_STATUS.PARTIALLY_PAID;
  return INVOICE_STATUS.PAID;
}

function parseRefundReason(notes: string | null | undefined): string | null {
  if (!notes) return null;
  if (notes.startsWith(REFUND_NOTE_PREFIX)) {
    return notes.slice(REFUND_NOTE_PREFIX.length).trim();
  }
  return notes;
}

function formatRefundNote(reason: string): string {
  return `${REFUND_NOTE_PREFIX} ${reason.trim()}`;
}

const ACTIVE_SALE_STATUSES: InvoiceStatus[] = [
  INVOICE_STATUS.PENDING,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.PAID,
  INVOICE_STATUS.DRAFT,
];

const REFUNDABLE_STATUSES: InvoiceStatus[] = [
  INVOICE_STATUS.PAID,
  INVOICE_STATUS.PARTIALLY_PAID,
];

function getRefundApprovalPin(): string {
  const pin = process.env.REFUND_APPROVAL_PIN;
  if (!pin) {
    throw new AppError(500, "Refund approval PIN is not configured on this server", {
      code: BILLING_ERROR_CODES.REFUND_PIN_INVALID,
    });
  }
  return pin;
}

async function restoreRetailStockForRefund(
  tx: Prisma.TransactionClient,
  params: { salonId: string; invoiceId: bigint },
): Promise<StockChangeResult[]> {
  const results: StockChangeResult[] = [];
  const movements = await tx.stockMovement.findMany({
    where: {
      invoiceId: params.invoiceId,
      movementType: MOVEMENT_TYPE.RETAIL_SALE,
    },
  });

  for (const movement of movements) {
    if (!movement.productId) continue;

    const existingReversal = await tx.stockMovement.findFirst({
      where: {
        invoiceId: params.invoiceId,
        productId: movement.productId,
        movementType: MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
        note: { contains: "Refund reversal" },
      },
      select: { id: true },
    });
    if (existingReversal) continue;

    const qtyRestored = Math.abs(movement.qtyChange);
    const result = await applyStockChange(tx, {
      salonId: params.salonId,
      productId: movement.productId,
      qtyChange: qtyRestored,
      movementType: MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
      invoiceId: params.invoiceId,
      note: "Refund reversal: stock restored",
    });
    results.push(result);
  }

  return results;
}

function mapRefundRecord(
  invoice: InvoiceWithRelations & {
    customer: { fullName: string; phone: string };
    updatedBy?: { fullName: string } | null;
  },
) {
  const isPending = invoice.status === INVOICE_STATUS.REFUND_PENDING;
  const isApproved =
    Boolean(invoice.voidedAt) ||
    invoice.status === INVOICE_STATUS.REFUNDED ||
    invoice.status === INVOICE_STATUS.VOID;

  return {
    ...mapInvoice(invoice),
    customerName: invoice.customer.fullName,
    customerPhone: invoice.customer.phone,
    voidedAt: invoice.voidedAt?.toISOString() ?? null,
    refundStatus: isPending ? "pending" : "approved",
    refundReason: parseRefundReason(invoice.notes) ?? (isApproved ? "Refunded invoice" : ""),
    refundAmount: Number(invoice.amountPaid) || Number(invoice.totalAmount),
    approvedBy: invoice.updatedBy?.fullName ?? null,
    requestedAt: isPending ? invoice.updatedAt.toISOString() : null,
  };
}

function mapInvoice(invoice: InvoiceWithRelations) {
  const total = Number(invoice.totalAmount);
  const paid = Number(invoice.amountPaid);
  const balance = Number(invoice.balanceAmount);

  return {
    id: invoice.publicId,
    receiptNumber: invoice.receiptNumber,
    customerId: invoice.customerId,
    appointmentId: invoice.appointmentId,
    invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
    invoiceTime: invoice.invoiceTime.toISOString().slice(11, 19),
    source: invoice.source,
    status: invoice.status,
    paymentStatus: invoice.status,
    subtotal: Number(invoice.subtotal),
    discountAmount: Number(invoice.discountAmount),
    membershipDiscount: Number(invoice.membershipDiscount),
    couponDiscount: Number(invoice.couponDiscount),
    manualDiscountAmount: Number(invoice.manualDiscountAmount),
    manualDiscountReason: invoice.manualDiscountReason,
    gstRate: Number(invoice.gstRate),
    gstAmount: Number(invoice.gstAmount),
    totalAmount: total,
    paidAmount: paid,
    balanceAmount: balance,
    dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? null,
    loyaltyPointsEarned: invoice.loyaltyPointsEarned,
    notes: invoice.notes,
    items: invoice.lineItems.map((line) => ({
      lineType: line.lineType,
      itemName: line.itemName,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      lineDiscount: Number(line.lineDiscount),
      lineTotal: Number(line.lineTotal),
    })),
    payments: invoice.payments.map((p) => ({
      id: p.publicId,
      paymentMethod: p.paymentMethod,
      amount: Number(p.amount),
      reference: p.reference,
      paidAt: p.paidAt.toISOString(),
    })),
  };
}

async function resolveCustomerId(
  salonId: string,
  input: { customerId?: string; customerName: string; customerPhone: string },
): Promise<string> {
  if (input.customerId) {
    const existing = await prisma.customer.findFirst({
      where: { id: input.customerId, salonId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError(404, "Customer not found", {
        code: BILLING_ERROR_CODES.CUSTOMER_NOT_FOUND,
      });
    }
    return existing.id;
  }

  const keys = phoneLookupKeys(input.customerPhone);
  const matches = await prisma.customer.findMany({
    where: {
      salonId,
      deletedAt: null,
      phoneNormalized: { in: keys },
    },
    select: {
      id: true,
      loyaltyPoints: true,
      currentTierId: true,
      createdAt: true,
    },
    orderBy: [{ loyaltyPoints: "desc" }, { createdAt: "asc" }],
  });
  if (matches.length > 0) {
    // Prefer a profile that already has membership / history over a billing duplicate.
    const preferred =
      matches.find((m) => m.currentTierId) ??
      matches.find((m) => m.loyaltyPoints > 0) ??
      matches[0];
    return preferred.id;
  }

  const phoneNormalized = normalizePhone(input.customerPhone);
  const created = await prisma.customer.create({
    data: {
      salonId,
      fullName: input.customerName,
      phone: input.customerPhone,
      phoneNormalized,
      joinedAt: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}

async function applyPaidInvoiceCustomerEffects(
  tx: Prisma.TransactionClient,
  params: {
    salonId: string;
    customerId: string;
    invoiceId: bigint;
    totalAmount: number;
    loyaltyPointsEarned: number;
    receiptNumber: string;
  },
): Promise<number> {
  const alreadyEarned = await tx.loyaltyTransaction.findFirst({
    where: {
      invoiceId: params.invoiceId,
      type: LOYALTY_TRANSACTION_TYPE.EARN,
    },
    select: { id: true, points: true },
  });
  if (alreadyEarned) {
    return alreadyEarned.points;
  }

  const customer = await tx.customer.findFirst({
    where: { id: params.customerId, salonId: params.salonId, deletedAt: null },
    include: { currentTier: { select: { pointsMultiplier: true } } },
  });
  if (!customer) return 0;

  const settings = await tx.salonFinancialSettings.findUnique({
    where: { salonId: params.salonId },
    select: { loyaltyPointsPerRupee: true },
  });
  const rate = settings ? Number(settings.loyaltyPointsPerRupee) : 0.1;
  const multiplier = customer.currentTier
    ? Number(customer.currentTier.pointsMultiplier) || 1
    : 1;

  let points = params.loyaltyPointsEarned;
  if (points <= 0 && params.totalAmount > 0) {
    points = Math.floor(params.totalAmount * rate * multiplier);
  } else if (points > 0 && multiplier !== 1) {
    points = Math.floor(points * multiplier);
  }
  points = Math.max(0, points);

  const balanceAfter = customer.loyaltyPoints + points;

  if (points > 0) {
    await tx.loyaltyTransaction.create({
      data: {
        salonId: params.salonId,
        customerId: params.customerId,
        invoiceId: params.invoiceId,
        type: LOYALTY_TRANSACTION_TYPE.EARN,
        points,
        balanceAfter,
        note: `Earned on ${params.receiptNumber}`,
      },
    });
  }

  await tx.customer.update({
    where: { id: params.customerId },
    data: {
      ...(points > 0 ? { loyaltyPoints: balanceAfter } : {}),
      totalSpend: { increment: params.totalAmount },
      totalVisits: { increment: 1 },
      lastVisitAt: new Date(),
    },
  });

  return points;
}

type WalletDeductionResult = {
  enrollmentId: string;
  customerName: string;
  amount: number;
  balanceAfter: number;
};

/**
 * Debits a membership enrollment's wallet for a "wallet" payment method. Must run inside
 * the same transaction as the invoice/payment write it belongs to, so an insufficient-balance
 * or expired-membership rejection rolls back the whole checkout/collection.
 */
async function applyWalletDeduction(
  tx: Prisma.TransactionClient,
  params: {
    salonId: string;
    customerId: string;
    invoiceId: bigint;
    enrollmentId: string;
    amount: number;
  },
): Promise<WalletDeductionResult> {
  const enrollment = await tx.customerPlanEnrollment.findFirst({
    where: {
      id: params.enrollmentId,
      salonId: params.salonId,
      customerId: params.customerId,
      status: "active",
    },
    include: { customer: { select: { fullName: true } } },
  });

  if (!enrollment) {
    throw new AppError(404, "Membership enrollment not found for this customer", {
      code: BILLING_ERROR_CODES.MEMBERSHIP_NOT_FOUND,
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (enrollment.expiryDate < today) {
    throw new AppError(400, "This customer's membership has expired", {
      code: BILLING_ERROR_CODES.MEMBERSHIP_EXPIRED,
    });
  }

  const walletTotal = Number(enrollment.walletTotal);
  const walletUsed = Number(enrollment.walletUsed);
  const balance = walletTotal - walletUsed;

  if (params.amount > balance + 0.01) {
    throw new AppError(400, "Insufficient wallet balance", {
      code: BILLING_ERROR_CODES.WALLET_INSUFFICIENT,
    });
  }

  const newWalletUsed = walletUsed + params.amount;
  const balanceAfter = Math.max(0, walletTotal - newWalletUsed);

  await tx.customerPlanEnrollment.update({
    where: { id: enrollment.id },
    data: { walletUsed: newWalletUsed },
  });

  await tx.walletTransaction.create({
    data: {
      salonId: params.salonId,
      customerId: params.customerId,
      enrollmentId: enrollment.id,
      invoiceId: params.invoiceId,
      type: "debit",
      amount: params.amount,
      balanceAfter,
      note: `Redeemed at checkout, invoice ${params.invoiceId}`,
    },
  });

  return {
    enrollmentId: enrollment.id,
    customerName: enrollment.customer.fullName,
    amount: params.amount,
    balanceAfter,
  };
}

async function nextReceiptNumber(salonId: string): Promise<string> {
  const settings = await prisma.salonFinancialSettings.findUnique({
    where: { salonId },
    select: { receiptPrefix: true, nextReceiptSequence: true },
  });

  const prefix = settings?.receiptPrefix ?? "RCP";
  const sequence = settings?.nextReceiptSequence ?? 1;
  const receiptNumber = `${prefix}-${String(sequence).padStart(4, "0")}`;

  if (settings) {
    await prisma.salonFinancialSettings.update({
      where: { salonId },
      data: { nextReceiptSequence: sequence + 1 },
    });
  }

  return receiptNumber;
}

async function assertAppointmentCheckoutReady(
  salonId: string,
  appointmentId?: string,
): Promise<string | undefined> {
  if (!appointmentId) return undefined;

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId },
    select: { id: true, status: true },
  });

  if (!appointment) {
    throw new AppError(404, "Appointment not found", {
      code: BILLING_ERROR_CODES.APPOINTMENT_NOT_FOUND,
    });
  }

  const allowed = [
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.IN_PROGRESS,
    APPOINTMENT_STATUS.PENDING,
  ];
  if (!allowed.includes(appointment.status as typeof allowed[number])) {
    throw new AppError(400, "Appointment is not eligible for checkout", {
      code: BILLING_ERROR_CODES.APPOINTMENT_INVALID_STATE,
    });
  }

  return appointment.id;
}

function buildLineItems(items: ResolvedLineItem[]) {
  return items.map((item) => {
    const lineTotal = item.unitPrice * item.quantity - item.lineDiscount;
    return {
      lineType: item.lineType,
      serviceId: item.serviceId ?? null,
      productId: item.productId ?? null,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscount: item.lineDiscount,
      lineTotal: Math.max(0, lineTotal),
    };
  });
}

type ResolvedLineItem = {
  lineType: ConfirmOnlyInput["items"][number]["lineType"];
  serviceId?: string;
  productId?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
};

async function deductRetailStockForInvoice(
  tx: Prisma.TransactionClient,
  params: {
    salonId: string;
    invoiceId: bigint;
    lines: Array<{ productId?: string | null; quantity: number; itemName: string }>;
  },
): Promise<StockChangeResult[]> {
  const results: StockChangeResult[] = [];

  for (const line of params.lines) {
    if (!line.productId) continue;

    const existingMovement = await tx.stockMovement.findFirst({
      where: {
        invoiceId: params.invoiceId,
        productId: line.productId,
        movementType: MOVEMENT_TYPE.RETAIL_SALE,
      },
      select: { id: true },
    });
    if (existingMovement) continue;

    const result = await applyStockChange(tx, {
      salonId: params.salonId,
      productId: line.productId,
      qtyChange: -line.quantity,
      movementType: MOVEMENT_TYPE.RETAIL_SALE,
      invoiceId: params.invoiceId,
      note: `Retail sale: ${line.itemName}`,
    });
    results.push(result);
  }

  return results;
}

async function resolveBillingLineItems(
  salonId: string,
  items: ConfirmOnlyInput["items"],
): Promise<ResolvedLineItem[]> {
  const resolved: ResolvedLineItem[] = [];

  for (const item of items) {
    if (item.lineType === "product") {
      const dbProduct = item.productId
        ? await prisma.product.findFirst({
            where: { id: item.productId, salonId, deletedAt: null, isActive: true },
          })
        : await prisma.product.findFirst({
            where: { salonId, name: item.itemName, deletedAt: null, isActive: true },
          });

      if (!dbProduct) {
        throw new AppError(400, `Product "${item.itemName}" is not available for billing`, {
          code: BILLING_ERROR_CODES.PRODUCT_UNAVAILABLE,
        });
      }

      if (dbProduct.stockQty < item.quantity) {
        throw new AppError(400, `Insufficient stock for "${dbProduct.name}"`, {
          code: BILLING_ERROR_CODES.INSUFFICIENT_STOCK,
        });
      }

      resolved.push({
        lineType: item.lineType,
        productId: dbProduct.id,
        itemName: dbProduct.name,
        quantity: item.quantity,
        unitPrice: Number(dbProduct.retailPrice),
        lineDiscount: item.lineDiscount ?? 0,
      });
      continue;
    }

    if (item.lineType !== "service") {
      resolved.push({
        lineType: item.lineType,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineDiscount: item.lineDiscount ?? 0,
      });
      continue;
    }

    const dbService = item.serviceId
      ? await prisma.service.findFirst({
          where: { id: item.serviceId, salonId, isActive: true, deletedAt: null },
        })
      : await prisma.service.findFirst({
          where: { salonId, name: item.itemName, isActive: true, deletedAt: null },
        });

    if (!dbService) {
      throw new AppError(400, `Service "${item.itemName}" is not available for billing`, {
        code: BILLING_ERROR_CODES.SERVICE_UNAVAILABLE,
      });
    }

    resolved.push({
      lineType: item.lineType,
      serviceId: dbService.id,
      itemName: dbService.name,
      quantity: item.quantity,
      unitPrice: Number(dbService.price),
      lineDiscount: item.lineDiscount ?? 0,
    });
  }

  return resolved;
}

async function computeTotalsFromLines(
  salonId: string,
  lines: ResolvedLineItem[],
  input: ConfirmOnlyInput,
) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity - line.lineDiscount,
    0,
  );

  const settings = await prisma.salonFinancialSettings.findUnique({
    where: { salonId },
    select: { gstEnabled: true, defaultGstRate: true, maxDiscountPercent: true },
  });
  const gstEnabled = settings?.gstEnabled ?? true;
  const defaultGstRate = settings ? Number(settings.defaultGstRate) : 18;
  const maxDiscountPercent = settings ? Number(settings.maxDiscountPercent) : 50;

  const discountAmount = input.discountAmount ?? 0;
  const membershipDiscount = input.membershipDiscount ?? 0;
  const couponDiscount = input.couponDiscount ?? 0;
  const manualDiscountAmount = input.manualDiscountAmount ?? 0;
  const totalDiscount = discountAmount + membershipDiscount + couponDiscount + manualDiscountAmount;

  if (subtotal > 0 && totalDiscount > (subtotal * maxDiscountPercent) / 100 + 0.01) {
    throw new AppError(
      400,
      `Total discount cannot exceed ${maxDiscountPercent}% of the subtotal`,
      { code: BILLING_ERROR_CODES.DISCOUNT_EXCEEDS_LIMIT },
    );
  }

  const taxable = Math.max(0, subtotal - totalDiscount);
  // gstEnabled=false always wins; otherwise an explicit client rate (including 0) is
  // honored, and only a truly omitted rate falls back to the salon's configured default.
  const gstRate = !gstEnabled ? 0 : input.gstRate ?? defaultGstRate;
  const gstAmount = Math.round((taxable * gstRate) / 100);
  const totalAmount = Math.max(0, taxable + gstAmount);

  return {
    subtotal,
    discountAmount,
    membershipDiscount,
    couponDiscount,
    manualDiscountAmount,
    manualDiscountReason:
      manualDiscountAmount > 0 ? (input.manualDiscountReason ?? "").trim() || null : null,
    gstRate,
    gstAmount,
    totalAmount,
  };
}

/**
 * Records a coupon redemption against the invoice and bumps the coupon's used
 * count, so the discount shown on the bill is traceable back to the coupon.
 */
async function recordCouponRedemption(
  tx: Prisma.TransactionClient,
  params: {
    salonId: string;
    couponCode?: string;
    discountApplied: number;
    invoiceId: bigint;
    customerId: string;
    redeemedAt: Date;
  },
) {
  const code = params.couponCode?.trim().toUpperCase();
  if (!code || params.discountApplied <= 0) return;

  const coupon = await tx.coupon.findFirst({
    where: { salonId: params.salonId, codeUpper: code, deletedAt: null },
    select: { id: true, status: true, usageLimit: true, usedCount: true },
  });

  if (!coupon || coupon.status !== "active") {
    throw new AppError(400, "Coupon is not valid or is no longer active", {
      code: BILLING_ERROR_CODES.INVALID_COUPON,
    });
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(400, "Coupon has reached its usage limit", {
      code: BILLING_ERROR_CODES.INVALID_COUPON,
    });
  }

  await tx.couponRedemption.create({
    data: {
      couponId: coupon.id,
      invoiceId: params.invoiceId,
      customerId: params.customerId,
      discountApplied: params.discountApplied,
      redeemedAt: params.redeemedAt,
    },
  });
  await tx.coupon.update({
    where: { id: coupon.id },
    data: { usedCount: { increment: 1 } },
  });
}

export class BillingRepository {
  async confirmOnly(auth: AuthContext, input: ConfirmOnlyInput) {
    const appointmentId = await assertAppointmentCheckoutReady(
      auth.salonId,
      input.appointmentId,
    );
    const customerId = await resolveCustomerId(auth.salonId, input);
    const receiptNumber = await nextReceiptNumber(auth.salonId);
    const now = new Date();
    const dueDate = input.dueDate ? new Date(input.dueDate) : new Date(now.getTime() + 7 * 86400000);

    const resolvedLines = await resolveBillingLineItems(auth.salonId, input.items);
    const totals = await computeTotalsFromLines(auth.salonId, resolvedLines, input);
    const lineItems = buildLineItems(resolvedLines);

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          salonId: auth.salonId,
          customerId,
          appointmentId,
          receiptNumber,
          invoiceDate: now,
          invoiceTime: now,
          source: input.source,
          status: INVOICE_STATUS.PENDING,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          membershipDiscount: totals.membershipDiscount,
          couponDiscount: totals.couponDiscount,
          manualDiscountAmount: totals.manualDiscountAmount,
          manualDiscountReason: totals.manualDiscountReason,
          gstRate: totals.gstRate,
          gstAmount: totals.gstAmount,
          totalAmount: totals.totalAmount,
          amountPaid: 0,
          balanceAmount: totals.totalAmount,
          dueDate,
          loyaltyPointsEarned: 0,
          notes: input.notes,
          createdById: auth.userId,
          lineItems: {
            create: lineItems,
          },
        },
        include: { lineItems: true, payments: true, customer: { select: { fullName: true } } },
      });

      await recordCouponRedemption(tx, {
        salonId: auth.salonId,
        couponCode: input.couponCode,
        discountApplied: totals.couponDiscount,
        invoiceId: created.id,
        customerId,
        redeemedAt: now,
      });

      if (appointmentId) {
        await tx.appointment.updateMany({
          where: { id: appointmentId, salonId: auth.salonId },
          data: {
            status: APPOINTMENT_STATUS.COMPLETED,
            completedAt: now,
            updatedById: auth.userId,
          },
        });
      }

      return created;
    });

    void appNotificationGenerator
      .notifyInvoiceGenerated({
        salonId: auth.salonId,
        invoicePublicId: invoice.publicId,
        receiptNumber: invoice.receiptNumber,
        customerName: invoice.customer.fullName,
        totalAmount: Number(invoice.totalAmount),
      })
      .catch(() => {});

    void appNotificationGenerator
      .notifyPendingPayment({
        salonId: auth.salonId,
        invoicePublicId: invoice.publicId,
        receiptNumber: invoice.receiptNumber,
        customerName: invoice.customer.fullName,
        balanceAmount: Number(invoice.balanceAmount),
      })
      .catch(() => {});

    if (Number(invoice.membershipDiscount) > 0) {
      void appNotificationGenerator
        .notifyMembershipUsed({
          salonId: auth.salonId,
          invoicePublicId: invoice.publicId,
          receiptNumber: invoice.receiptNumber,
          customerName: invoice.customer.fullName,
          discountAmount: Number(invoice.membershipDiscount),
        })
        .catch(() => {});
    }

    return mapInvoice(invoice);
  }

  async checkout(auth: AuthContext, input: CheckoutInput) {
    const appointmentId = await assertAppointmentCheckoutReady(
      auth.salonId,
      input.appointmentId,
    );
    const customerId = await resolveCustomerId(auth.salonId, input);
    const receiptNumber = await nextReceiptNumber(auth.salonId);
    const now = new Date();

    const resolvedLines = await resolveBillingLineItems(auth.salonId, input.items);
    const totals = await computeTotalsFromLines(auth.salonId, resolvedLines, input);
    const lineItems = buildLineItems(resolvedLines);

    const paymentTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentTotal - totals.totalAmount) > 0.01) {
      throw new AppError(400, "Payment total must match invoice total", {
        code: BILLING_ERROR_CODES.INVALID_PAYMENT_AMOUNT,
      });
    }

    const { invoice, stockResults, walletDeductions } = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          salonId: auth.salonId,
          customerId,
          appointmentId,
          receiptNumber,
          invoiceDate: now,
          invoiceTime: now,
          source: input.source,
          status: INVOICE_STATUS.PAID,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          membershipDiscount: totals.membershipDiscount,
          couponDiscount: totals.couponDiscount,
          manualDiscountAmount: totals.manualDiscountAmount,
          manualDiscountReason: totals.manualDiscountReason,
          gstRate: totals.gstRate,
          gstAmount: totals.gstAmount,
          totalAmount: totals.totalAmount,
          amountPaid: totals.totalAmount,
          balanceAmount: 0,
          loyaltyPointsEarned: input.loyaltyPointsEarned ?? 0,
          notes: input.notes,
          createdById: auth.userId,
          lineItems: {
            create: lineItems,
          },
          payments: {
            create: input.payments.map((p) => ({
              paymentMethod: p.paymentMethod,
              amount: p.amount,
              reference: p.reference,
              paidAt: now,
            })),
          },
        },
        include: { lineItems: true, payments: true, customer: { select: { fullName: true } } },
      });

      await recordCouponRedemption(tx, {
        salonId: auth.salonId,
        couponCode: input.couponCode,
        discountApplied: totals.couponDiscount,
        invoiceId: created.id,
        customerId,
        redeemedAt: now,
      });

      const walletDeductions: WalletDeductionResult[] = [];
      for (const payment of input.payments) {
        if (payment.paymentMethod !== "wallet" || !payment.planEnrollmentId) continue;
        const result = await applyWalletDeduction(tx, {
          salonId: auth.salonId,
          customerId,
          invoiceId: created.id,
          enrollmentId: payment.planEnrollmentId,
          amount: payment.amount,
        });
        walletDeductions.push(result);
      }

      const earnedPoints = await applyPaidInvoiceCustomerEffects(tx, {
        salonId: auth.salonId,
        customerId,
        invoiceId: created.id,
        totalAmount: totals.totalAmount,
        loyaltyPointsEarned: input.loyaltyPointsEarned ?? 0,
        receiptNumber,
      });

      let invoiceWithPoints = created;
      if (earnedPoints !== created.loyaltyPointsEarned) {
        invoiceWithPoints = await tx.invoice.update({
          where: { id: created.id },
          data: { loyaltyPointsEarned: earnedPoints },
          include: { lineItems: true, payments: true, customer: { select: { fullName: true } } },
        });
      }

      const stockResults = await deductRetailStockForInvoice(tx, {
        salonId: auth.salonId,
        invoiceId: created.id,
        lines: created.lineItems,
      });

      if (appointmentId) {
        await tx.appointment.updateMany({
          where: { id: appointmentId, salonId: auth.salonId },
          data: {
            status: APPOINTMENT_STATUS.COMPLETED,
            completedAt: now,
            updatedById: auth.userId,
          },
        });
      }

      return { invoice: invoiceWithPoints, stockResults, walletDeductions };
    });

    stockResults.forEach(notifyStockChangeResult);

    void appNotificationGenerator
      .notifyInvoiceGenerated({
        salonId: auth.salonId,
        invoicePublicId: invoice.publicId,
        receiptNumber: invoice.receiptNumber,
        customerName: invoice.customer.fullName,
        totalAmount: Number(invoice.totalAmount),
      })
      .catch(() => {});

    for (const payment of invoice.payments) {
      if (Number(payment.amount) <= 0) continue;
      void appNotificationGenerator
        .notifyPaymentReceived({
          salonId: auth.salonId,
          invoicePublicId: invoice.publicId,
          paymentPublicId: payment.publicId,
          receiptNumber: invoice.receiptNumber,
          customerName: invoice.customer.fullName,
          amount: Number(payment.amount),
        })
        .catch(() => {});
    }

    if (Number(invoice.membershipDiscount) > 0) {
      void appNotificationGenerator
        .notifyMembershipUsed({
          salonId: auth.salonId,
          invoicePublicId: invoice.publicId,
          receiptNumber: invoice.receiptNumber,
          customerName: invoice.customer.fullName,
          discountAmount: Number(invoice.membershipDiscount),
        })
        .catch(() => {});
    }

    for (const deduction of walletDeductions) {
      void appNotificationGenerator
        .notifyWalletUsed({
          salonId: auth.salonId,
          invoicePublicId: invoice.publicId,
          enrollmentId: deduction.enrollmentId,
          customerName: deduction.customerName,
          amount: deduction.amount,
          balanceAfter: deduction.balanceAfter,
        })
        .catch(() => {});
    }

    return mapInvoice(invoice);
  }

  async listPending(auth: AuthContext) {
    const invoices = await prisma.invoice.findMany({
      where: {
        salonId: auth.salonId,
        status: { in: [INVOICE_STATUS.PENDING, INVOICE_STATUS.PARTIALLY_PAID] },
        balanceAmount: { gt: 0 },
        voidedAt: null,
      },
      include: {
        lineItems: true,
        payments: true,
        customer: { select: { fullName: true, phone: true } },
      },
      orderBy: [{ dueDate: "asc" }, { invoiceDate: "desc" }],
    });

    return invoices.map((invoice) => {
      const mapped = mapInvoice(invoice);

      return {
        ...mapped,
        customer: invoice.customer.fullName,
        phone: invoice.customer.phone,
        services: invoice.lineItems.map((line) => line.itemName),
        receiptNo: mapped.receiptNumber,
        date: mapped.invoiceDate,
      };
    });
  }

  async listInvoices(auth: AuthContext) {
    const invoices = await prisma.invoice.findMany({
      where: {
        salonId: auth.salonId,
        voidedAt: null,
        status: { in: ACTIVE_SALE_STATUSES },
      },
      include: {
        lineItems: true,
        payments: true,
        customer: { select: { fullName: true, phone: true } },
      },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

    return invoices.map((invoice) => {
      const mapped = mapInvoice(invoice);
      const primaryPayment = invoice.payments[0];

      return {
        ...mapped,
        customer: invoice.customer.fullName,
        phone: invoice.customer.phone,
        services: invoice.lineItems.map((line) => line.itemName),
        receiptNo: mapped.receiptNumber,
        date: mapped.invoiceDate,
        time: new Date(`1970-01-01T${mapped.invoiceTime}Z`).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        discount: mapped.discountAmount,
        gst: mapped.gstAmount,
        total: mapped.totalAmount,
        paymentMethod: (primaryPayment?.paymentMethod ?? "none") as
          | "cash"
          | "card"
          | "upi"
          | "wallet"
          | "none",
      };
    });
  }

  async listRefunds(auth: AuthContext) {
    const invoices = await prisma.invoice.findMany({
      where: {
        salonId: auth.salonId,
        OR: [
          { status: INVOICE_STATUS.REFUND_PENDING },
          { voidedAt: { not: null } },
          { status: { in: [INVOICE_STATUS.VOID, INVOICE_STATUS.REFUNDED, "voided"] } },
        ],
      },
      include: {
        lineItems: true,
        payments: true,
        customer: { select: { fullName: true, phone: true } },
        updatedBy: { select: { fullName: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { voidedAt: "desc" }, { invoiceDate: "desc" }],
      take: 500,
    });

    return invoices.map((invoice) => mapRefundRecord(invoice));
  }

  async collectPayment(
    auth: AuthContext,
    invoicePublicId: string,
    input: CollectPaymentInput,
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: { publicId: invoicePublicId, salonId: auth.salonId, voidedAt: null },
      include: {
        lineItems: true,
        payments: true,
        customer: { select: { fullName: true } },
      },
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found", {
        code: BILLING_ERROR_CODES.INVOICE_NOT_FOUND,
      });
    }

    const balance = Number(invoice.balanceAmount);
    if (balance <= 0 || invoice.status === INVOICE_STATUS.PAID) {
      throw new AppError(400, "Invoice is already fully paid", {
        code: BILLING_ERROR_CODES.INVOICE_ALREADY_PAID,
      });
    }

    if (input.amount > balance + 0.01) {
      throw new AppError(400, "Payment amount exceeds outstanding balance", {
        code: BILLING_ERROR_CODES.INVALID_PAYMENT_AMOUNT,
      });
    }

    const now = new Date();
    const newPaid = Number(invoice.amountPaid) + input.amount;
    const newBalance = Math.max(0, Number(invoice.totalAmount) - newPaid);
    const newStatus = computeInvoiceStatus(Number(invoice.totalAmount), newPaid);

    const { updated, stockResults, payment, walletDeduction } = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentMethod: input.paymentMethod,
          amount: input.amount,
          reference: input.reference,
          paidAt: now,
        },
      });

      let walletDeduction: WalletDeductionResult | null = null;
      if (input.paymentMethod === "wallet" && input.planEnrollmentId) {
        walletDeduction = await applyWalletDeduction(tx, {
          salonId: auth.salonId,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          enrollmentId: input.planEnrollmentId,
          amount: input.amount,
        });
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newPaid,
          balanceAmount: newBalance,
          status: newStatus,
          updatedById: auth.userId,
        },
        include: { lineItems: true, payments: true },
      });

      let stockResults: StockChangeResult[] = [];
      if (newStatus === INVOICE_STATUS.PAID) {
        stockResults = await deductRetailStockForInvoice(tx, {
          salonId: auth.salonId,
          invoiceId: invoice.id,
          lines: updatedInvoice.lineItems,
        });

        const earnedPoints = await applyPaidInvoiceCustomerEffects(tx, {
          salonId: auth.salonId,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          totalAmount: Number(invoice.totalAmount),
          loyaltyPointsEarned: invoice.loyaltyPointsEarned,
          receiptNumber: invoice.receiptNumber,
        });

        if (earnedPoints !== updatedInvoice.loyaltyPointsEarned) {
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { loyaltyPointsEarned: earnedPoints },
          });
          updatedInvoice.loyaltyPointsEarned = earnedPoints;
        }
      }

      return { updated: updatedInvoice, stockResults, payment: createdPayment, walletDeduction };
    });

    stockResults.forEach(notifyStockChangeResult);

    if (Number(payment.amount) > 0) {
      void appNotificationGenerator
        .notifyPaymentReceived({
          salonId: auth.salonId,
          invoicePublicId: invoice.publicId,
          paymentPublicId: payment.publicId,
          receiptNumber: invoice.receiptNumber,
          customerName: invoice.customer.fullName,
          amount: Number(payment.amount),
        })
        .catch(() => {});
    }

    if (walletDeduction) {
      void appNotificationGenerator
        .notifyWalletUsed({
          salonId: auth.salonId,
          invoicePublicId: invoice.publicId,
          enrollmentId: walletDeduction.enrollmentId,
          customerName: walletDeduction.customerName,
          amount: walletDeduction.amount,
          balanceAfter: walletDeduction.balanceAfter,
        })
        .catch(() => {});
    }

    if (newBalance > 0) {
      void appNotificationGenerator
        .notifyPendingPayment({
          salonId: auth.salonId,
          invoicePublicId: invoice.publicId,
          receiptNumber: invoice.receiptNumber,
          customerName: invoice.customer.fullName,
          balanceAmount: newBalance,
        })
        .catch(() => {});
    }

    return mapInvoice(updated);
  }

  async requestRefund(
    auth: AuthContext,
    invoicePublicId: string,
    input: RequestRefundInput,
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: { publicId: invoicePublicId, salonId: auth.salonId, voidedAt: null },
      include: { lineItems: true, payments: true, customer: { select: { fullName: true, phone: true } } },
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found", {
        code: BILLING_ERROR_CODES.INVOICE_NOT_FOUND,
      });
    }

    if (invoice.status === INVOICE_STATUS.REFUND_PENDING) {
      throw new AppError(400, "Refund is already pending approval", {
        code: BILLING_ERROR_CODES.REFUND_ALREADY_PENDING,
      });
    }

    if (!REFUNDABLE_STATUSES.includes(invoice.status as InvoiceStatus)) {
      throw new AppError(400, "Only paid invoices can be refunded", {
        code: BILLING_ERROR_CODES.REFUND_NOT_ELIGIBLE,
      });
    }

    if (Number(invoice.amountPaid) <= 0) {
      throw new AppError(400, "No payment collected on this invoice", {
        code: BILLING_ERROR_CODES.REFUND_NOT_ELIGIBLE,
      });
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: INVOICE_STATUS.REFUND_PENDING,
        notes: formatRefundNote(input.reason),
        updatedById: auth.userId,
      },
      include: {
        lineItems: true,
        payments: true,
        customer: { select: { fullName: true, phone: true } },
        updatedBy: { select: { fullName: true } },
      },
    });

    return mapRefundRecord(updated);
  }

  async approveRefund(auth: AuthContext, invoicePublicId: string, pin: string) {
    if (pin !== getRefundApprovalPin()) {
      throw new AppError(403, "Invalid approval PIN", {
        code: BILLING_ERROR_CODES.REFUND_PIN_INVALID,
      });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { publicId: invoicePublicId, salonId: auth.salonId, voidedAt: null },
      include: { lineItems: true, payments: true, customer: { select: { fullName: true, phone: true } } },
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found", {
        code: BILLING_ERROR_CODES.INVOICE_NOT_FOUND,
      });
    }

    if (invoice.status !== INVOICE_STATUS.REFUND_PENDING) {
      throw new AppError(400, "No pending refund request for this invoice", {
        code: BILLING_ERROR_CODES.REFUND_NOT_PENDING,
      });
    }

    const now = new Date();
    const { updated, stockResults } = await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: INVOICE_STATUS.REFUNDED,
          voidedAt: now,
          updatedById: auth.userId,
        },
        include: {
          lineItems: true,
          payments: true,
          customer: { select: { fullName: true, phone: true } },
          updatedBy: { select: { fullName: true } },
        },
      });

      const stockResults = await restoreRetailStockForRefund(tx, {
        salonId: auth.salonId,
        invoiceId: invoice.id,
      });

      return { updated: updatedInvoice, stockResults };
    });

    stockResults.forEach(notifyStockChangeResult);

    return mapRefundRecord(updated);
  }

  async rejectRefund(auth: AuthContext, invoicePublicId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { publicId: invoicePublicId, salonId: auth.salonId, voidedAt: null },
      include: { lineItems: true, payments: true, customer: { select: { fullName: true, phone: true } } },
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found", {
        code: BILLING_ERROR_CODES.INVOICE_NOT_FOUND,
      });
    }

    if (invoice.status !== INVOICE_STATUS.REFUND_PENDING) {
      throw new AppError(400, "No pending refund request for this invoice", {
        code: BILLING_ERROR_CODES.REFUND_NOT_PENDING,
      });
    }

    const restoredStatus = computeInvoiceStatus(
      Number(invoice.totalAmount),
      Number(invoice.amountPaid),
    );

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: restoredStatus,
        notes: null,
        updatedById: auth.userId,
      },
      include: {
        lineItems: true,
        payments: true,
        customer: { select: { fullName: true, phone: true } },
        updatedBy: { select: { fullName: true } },
      },
    });

    return mapInvoice(updated);
  }
}

export const billingRepository = new BillingRepository();
