import { prisma } from "../../config/prisma";
import { STOCK_STATUS } from "../inventory/inventory.shared";
import {
  NOTIFICATION_CATEGORY,
  NOTIFICATION_REFERENCE_TYPE,
} from "./app-notifications.constants";
import { appNotificationsRepository } from "./app-notifications.repository";

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export class AppNotificationGenerator {
  async notifyNewAppointment(params: {
    salonId: string;
    appointmentId: string;
    customerName: string;
    serviceName: string;
    scheduledDate: Date;
    scheduledTime: Date;
    staffName?: string | null;
  }) {
    const timeLabel = formatTime(params.scheduledTime);
    const dateLabel = formatDate(params.scheduledDate);
    const staff = params.staffName ? ` · ${params.staffName}` : "";

    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "New Appointment",
      message: `${params.customerName} — ${params.serviceName} on ${dateLabel} at ${timeLabel}${staff}`,
      category: NOTIFICATION_CATEGORY.APPOINTMENT,
      actionHref: `/appointments?appointment=${params.appointmentId}`,
      referenceType: NOTIFICATION_REFERENCE_TYPE.APPOINTMENT,
      referenceId: `${params.appointmentId}:new`,
    });
  }

  async notifyAppointmentCancelled(params: {
    salonId: string;
    appointmentId: string;
    customerName: string;
    serviceName: string;
    scheduledDate: Date;
    scheduledTime: Date;
  }) {
    const timeLabel = formatTime(params.scheduledTime);
    const dateLabel = formatDate(params.scheduledDate);

    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Appointment Cancelled",
      message: `${params.customerName} — ${params.serviceName} on ${dateLabel} at ${timeLabel} was cancelled`,
      category: NOTIFICATION_CATEGORY.APPOINTMENT,
      actionHref: `/appointments?appointment=${params.appointmentId}`,
      referenceType: NOTIFICATION_REFERENCE_TYPE.APPOINTMENT,
      referenceId: `${params.appointmentId}:cancelled`,
    });
  }

  async notifyPendingPayment(params: {
    salonId: string;
    invoicePublicId: string;
    receiptNumber: string;
    customerName: string;
    balanceAmount: number;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Pending Payment",
      message: `${formatInr(params.balanceAmount)} outstanding · ${params.customerName} · ${params.receiptNumber}`,
      category: NOTIFICATION_CATEGORY.PAYMENT,
      actionHref: "/finance?tab=receipts&section=pending",
      referenceType: NOTIFICATION_REFERENCE_TYPE.INVOICE,
      referenceId: params.invoicePublicId,
    });
  }

  async notifyInvoiceGenerated(params: {
    salonId: string;
    invoicePublicId: string;
    receiptNumber: string;
    customerName: string;
    totalAmount: number;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Invoice Generated",
      message: `${params.receiptNumber} — ${formatInr(params.totalAmount)} · ${params.customerName}`,
      category: NOTIFICATION_CATEGORY.PAYMENT,
      actionHref: `/finance?tab=receipts&invoice=${params.invoicePublicId}`,
      referenceType: NOTIFICATION_REFERENCE_TYPE.INVOICE,
      referenceId: `${params.invoicePublicId}:generated`,
    });
  }

  async notifyPaymentReceived(params: {
    salonId: string;
    invoicePublicId: string;
    paymentPublicId: string;
    receiptNumber: string;
    customerName: string;
    amount: number;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Payment Received",
      message: `${formatInr(params.amount)} received from ${params.customerName} · ${params.receiptNumber}`,
      category: NOTIFICATION_CATEGORY.SUCCESS,
      actionHref: `/finance?tab=receipts&invoice=${params.invoicePublicId}`,
      referenceType: NOTIFICATION_REFERENCE_TYPE.INVOICE,
      referenceId: `${params.invoicePublicId}:payment:${params.paymentPublicId}`,
    });
  }

  async notifyMembershipUsed(params: {
    salonId: string;
    invoicePublicId: string;
    receiptNumber: string;
    customerName: string;
    discountAmount: number;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Membership Used",
      message: `${params.customerName} used their membership discount (${formatInr(params.discountAmount)} off) · ${params.receiptNumber}`,
      category: NOTIFICATION_CATEGORY.SUCCESS,
      actionHref: `/finance?tab=receipts&invoice=${params.invoicePublicId}`,
      referenceType: NOTIFICATION_REFERENCE_TYPE.INVOICE,
      referenceId: `${params.invoicePublicId}:membership`,
    });
  }

  async notifyWalletUsed(params: {
    salonId: string;
    invoicePublicId: string;
    enrollmentId: string;
    customerName: string;
    amount: number;
    balanceAfter: number;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Wallet Used",
      message: `${params.customerName} redeemed ${formatInr(params.amount)} from their membership wallet — ${formatInr(params.balanceAfter)} left`,
      category: NOTIFICATION_CATEGORY.SUCCESS,
      actionHref: `/finance?tab=receipts&invoice=${params.invoicePublicId}`,
      referenceType: NOTIFICATION_REFERENCE_TYPE.ENROLLMENT,
      referenceId: `${params.enrollmentId}:wallet:${params.invoicePublicId}`,
    });
  }

  async notifyLowStock(params: {
    salonId: string;
    productId: string;
    productName: string;
    stockQty: number;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Low Stock Alert",
      message: `${params.productName} — only ${params.stockQty} units left`,
      category: NOTIFICATION_CATEGORY.INVENTORY,
      actionHref: "/inventory",
      referenceType: NOTIFICATION_REFERENCE_TYPE.PRODUCT,
      referenceId: `${params.productId}:low`,
    });
  }

  async notifyOutOfStock(params: {
    salonId: string;
    productId: string;
    productName: string;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Product Out of Stock",
      message: `${params.productName} is out of stock`,
      category: NOTIFICATION_CATEGORY.INVENTORY,
      actionHref: "/inventory",
      referenceType: NOTIFICATION_REFERENCE_TYPE.PRODUCT,
      referenceId: `${params.productId}:out`,
    });
  }

  async notifyMembershipExpiry(params: {
    salonId: string;
    enrollmentId: string;
    customerName: string;
    planName: string;
    expiryDate: Date;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Membership Expiry",
      message: `${params.customerName}'s ${params.planName} expires on ${formatDate(params.expiryDate)}`,
      category: NOTIFICATION_CATEGORY.WARNING,
      actionHref: "/memberships",
      referenceType: NOTIFICATION_REFERENCE_TYPE.ENROLLMENT,
      referenceId: params.enrollmentId,
    });
  }

  async notifyCustomerBirthday(params: {
    salonId: string;
    customerId: string;
    customerName: string;
  }) {
    const today = startOfLocalDay();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Customer Birthday",
      message: `Today is ${params.customerName}'s birthday — send a greeting or offer`,
      category: NOTIFICATION_CATEGORY.SUCCESS,
      actionHref: "/customers",
      referenceType: NOTIFICATION_REFERENCE_TYPE.CUSTOMER,
      referenceId: `${params.customerId}:${key}`,
    });
  }

  async notifyNewFeedback(params: {
    salonId: string;
    feedbackId: string;
    customerName: string;
    rating: number;
    serviceName: string;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "New Customer Feedback",
      message: `${params.customerName} rated ${params.rating}★ · ${params.serviceName}`,
      category: NOTIFICATION_CATEGORY.SUCCESS,
      actionHref: "/feedback",
      referenceType: NOTIFICATION_REFERENCE_TYPE.FEEDBACK,
      referenceId: `${params.feedbackId}:new`,
    });
  }

  async notifyLowRatingFeedback(params: {
    salonId: string;
    feedbackId: string;
    customerName: string;
    rating: number;
    serviceName: string;
  }) {
    await appNotificationsRepository.createIfUnreadExists({
      salonId: params.salonId,
      title: "Low Rating Alert",
      message: `${params.customerName} gave ${params.rating}★ for ${params.serviceName} — needs attention`,
      category: NOTIFICATION_CATEGORY.WARNING,
      actionHref: "/feedback",
      referenceType: NOTIFICATION_REFERENCE_TYPE.FEEDBACK,
      referenceId: `${params.feedbackId}:low`,
    });
  }

  async syncAutomatedNotifications(salonId: string) {
    const today = startOfLocalDay();
    const weekAhead = addDays(today, 7);
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const [pendingInvoices, lowStockProducts, expiringEnrollments, birthdayCustomers] =
      await Promise.all([
        prisma.invoice.findMany({
          where: {
            salonId,
            voidedAt: null,
            balanceAmount: { gt: 0 },
            status: { in: ["pending", "partially_paid"] },
          },
          include: { customer: { select: { fullName: true } } },
          take: 100,
        }),
        prisma.product.findMany({
          where: {
            salonId,
            deletedAt: null,
            isActive: true,
            stockStatus: { in: [STOCK_STATUS.LOW, STOCK_STATUS.CRITICAL, STOCK_STATUS.OUT] },
          },
          select: { id: true, name: true, stockQty: true, stockStatus: true },
        }),
        prisma.customerPlanEnrollment.findMany({
          where: {
            salonId,
            status: "active",
            expiryDate: { gte: today, lte: weekAhead },
          },
          include: {
            customer: { select: { fullName: true } },
            plan: { select: { name: true } },
          },
        }),
        prisma.customer.findMany({
          where: {
            salonId,
            deletedAt: null,
            dateOfBirth: { not: null },
          },
          select: { id: true, fullName: true, dateOfBirth: true },
        }),
      ]);

    for (const invoice of pendingInvoices) {
      await this.notifyPendingPayment({
        salonId,
        invoicePublicId: invoice.publicId,
        receiptNumber: invoice.receiptNumber,
        customerName: invoice.customer.fullName,
        balanceAmount: Number(invoice.balanceAmount),
      });
    }

    for (const product of lowStockProducts) {
      if (product.stockStatus === STOCK_STATUS.OUT) {
        await this.notifyOutOfStock({
          salonId,
          productId: product.id,
          productName: product.name,
        });
      } else {
        await this.notifyLowStock({
          salonId,
          productId: product.id,
          productName: product.name,
          stockQty: product.stockQty,
        });
      }
    }

    for (const enrollment of expiringEnrollments) {
      await this.notifyMembershipExpiry({
        salonId,
        enrollmentId: enrollment.id,
        customerName: enrollment.customer.fullName,
        planName: enrollment.plan.name,
        expiryDate: enrollment.expiryDate,
      });
    }

    for (const customer of birthdayCustomers) {
      if (!customer.dateOfBirth) continue;
      const dob = customer.dateOfBirth;
      if (dob.getMonth() + 1 === month && dob.getDate() === day) {
        await this.notifyCustomerBirthday({
          salonId,
          customerId: customer.id,
          customerName: customer.fullName,
        });
      }
    }
  }

  async notifyStockStatusChange(params: {
    salonId: string;
    productId: string;
    productName: string;
    stockQty: number;
    stockStatus: string;
  }) {
    if (params.stockStatus === STOCK_STATUS.OUT) {
      await this.notifyOutOfStock({
        salonId: params.salonId,
        productId: params.productId,
        productName: params.productName,
      });
      return;
    }

    if (
      params.stockStatus === STOCK_STATUS.LOW ||
      params.stockStatus === STOCK_STATUS.CRITICAL
    ) {
      await this.notifyLowStock({
        salonId: params.salonId,
        productId: params.productId,
        productName: params.productName,
        stockQty: params.stockQty,
      });
    }
  }
}

export const appNotificationGenerator = new AppNotificationGenerator();
