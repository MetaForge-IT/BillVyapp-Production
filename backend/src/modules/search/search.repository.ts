import { prisma } from "../../config/prisma";
import { SEARCH_LIMIT_PER_TYPE, SEARCH_RESULT_TYPES } from "./search.constants";

export type SearchResult = {
  type: string;
  label: string;
  href: string;
  meta: Record<string, unknown>;
};

export class SearchRepository {
  async search(salonId: string, query: string): Promise<SearchResult[]> {
    const term = query.trim();
    const results: SearchResult[] = [];

    const [customers, appointments, services, invoices] = await Promise.all([
      prisma.customer.findMany({
        where: {
          salonId,
          deletedAt: null,
          OR: [{ fullName: { contains: term } }, { phone: { contains: term } }],
        },
        select: { id: true, fullName: true, phone: true },
        take: SEARCH_LIMIT_PER_TYPE,
        orderBy: { fullName: "asc" },
      }),
      prisma.appointment.findMany({
        where: {
          salonId,
          customer: { fullName: { contains: term } },
        },
        select: {
          id: true,
          scheduledDate: true,
          status: true,
          customer: { select: { fullName: true } },
        },
        take: SEARCH_LIMIT_PER_TYPE,
        orderBy: { scheduledDate: "desc" },
      }),
      prisma.service.findMany({
        where: {
          salonId,
          deletedAt: null,
          isActive: true,
          name: { contains: term },
        },
        select: { id: true, name: true, price: true },
        take: SEARCH_LIMIT_PER_TYPE,
        orderBy: { name: "asc" },
      }),
      prisma.invoice.findMany({
        where: {
          salonId,
          receiptNumber: { contains: term },
        },
        select: {
          publicId: true,
          receiptNumber: true,
          totalAmount: true,
          status: true,
          customer: { select: { fullName: true } },
        },
        take: SEARCH_LIMIT_PER_TYPE,
        orderBy: { invoiceDate: "desc" },
      }),
    ]);

    for (const customer of customers) {
      results.push({
        type: SEARCH_RESULT_TYPES.CUSTOMER,
        label: `${customer.fullName} · ${customer.phone}`,
        href: `/customers/${customer.id}`,
        meta: { customerId: customer.id, name: customer.fullName, phone: customer.phone },
      });
    }

    for (const appointment of appointments) {
      const date = appointment.scheduledDate.toISOString().slice(0, 10);
      results.push({
        type: SEARCH_RESULT_TYPES.APPOINTMENT,
        label: `${appointment.customer.fullName} · ${date}`,
        href: `/appointments/${appointment.id}`,
        meta: {
          appointmentId: appointment.id,
          customerName: appointment.customer.fullName,
          date,
          status: appointment.status,
        },
      });
    }

    for (const service of services) {
      results.push({
        type: SEARCH_RESULT_TYPES.SERVICE,
        label: service.name,
        href: `/services/${service.id}`,
        meta: { serviceId: service.id, name: service.name, price: Number(service.price) },
      });
    }

    for (const invoice of invoices) {
      results.push({
        type: SEARCH_RESULT_TYPES.INVOICE,
        label: `${invoice.receiptNumber} · ${invoice.customer.fullName}`,
        href: `/billing/invoices/${invoice.publicId}`,
        meta: {
          invoiceId: invoice.publicId,
          receiptNumber: invoice.receiptNumber,
          customerName: invoice.customer.fullName,
          totalAmount: Number(invoice.totalAmount),
          status: invoice.status,
        },
      });
    }

    return results;
  }
}

export const searchRepository = new SearchRepository();
