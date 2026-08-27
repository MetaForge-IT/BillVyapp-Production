import type { BudgetLine, DayClose, Expense, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { MAX_PAGE_LIMIT } from "../../utils/pagination";
import { AppError } from "../../utils/errors";
import { formatDbDateKey, istDayRangeForDateKey } from "../../utils/ist";
import { resolveListSalonIds, salonIdFilter } from "../../utils/salonScope";
import type { AuthContext } from "../auth/auth.types";
import { ACCOUNTING_ERROR_CODES } from "./accounting.constants";
import type {
  CreateDayCloseInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  UpsertBudgetInput,
} from "./accounting.validators";

function toDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(value: Date): string {
  return formatDbDateKey(value);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

function endOfMonthExclusive(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

type ExpenseWithDeleteMeta = Expense & {
  deleteRequestedBy?: { fullName: string } | null;
  deleteRejectedBy?: { fullName: string } | null;
  salon?: { id: string; name: string; displayName: string | null } | null;
};

const expenseDeleteInclude = {
  deleteRequestedBy: { select: { fullName: true } },
  deleteRejectedBy: { select: { fullName: true } },
  salon: { select: { id: true, name: true, displayName: true } },
} as const;

function mapExpense(expense: ExpenseWithDeleteMeta) {
  const deleteRequested = Boolean(expense.deleteRequestedAt);
  const deleteRejected = Boolean(expense.deleteRejectedAt) && !deleteRequested;
  const shopName =
    expense.salon?.displayName?.trim() || expense.salon?.name?.trim() || null;
  return {
    id: expense.id,
    salonId: expense.salonId,
    salonName: shopName,
    date: formatDate(expense.date),
    category: expense.category,
    sub: expense.subCategory,
    subCategory: expense.subCategory,
    amount: Number(expense.amount),
    source: expense.source,
    remarks: expense.remarks ?? "",
    deleteRequested,
    deleteRequestedAt: expense.deleteRequestedAt?.toISOString() ?? null,
    deleteRequestedById: expense.deleteRequestedById ?? null,
    deleteRequestedByName: expense.deleteRequestedBy?.fullName ?? null,
    deleteRejected,
    deleteRejectedAt: expense.deleteRejectedAt?.toISOString() ?? null,
    deleteRejectedById: expense.deleteRejectedById ?? null,
    deleteRejectedByName: expense.deleteRejectedBy?.fullName ?? null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

function mapDayClose(row: DayClose & { closedBy?: { fullName: string } | null }) {
  return {
    id: row.id,
    closingDate: formatDate(row.closingDate),
    status: row.status,
    openingCash: Number(row.openingCash),
    cashSales: Number(row.cashSales),
    upiSales: Number(row.upiSales),
    cardSales: Number(row.cardSales),
    totalExpenses: Number(row.totalExpenses),
    cashExpenses: Number(row.cashExpenses),
    expectedCash: Number(row.expectedCash),
    physicalCash: Number(row.physicalCash),
    variance: Number(row.variance),
    varianceNote: row.varianceNote,
    upiSettled: Number(row.upiSettled),
    cardSettled: Number(row.cardSettled),
    bankDrop: Number(row.bankDrop),
    denomCounts: (row.denomCounts as Record<string, number> | null) ?? null,
    closedBy: row.closedBy?.fullName ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertDateNotClosed(salonId: string, date: Date): Promise<void> {
  const existing = await prisma.dayClose.findFirst({
    where: { salonId, closingDate: date, status: "completed" },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, "This date is locked after day close", {
      code: ACCOUNTING_ERROR_CODES.DAY_CLOSED,
    });
  }
}

async function sumExpensesForDay(salonIds: string[], day: Date) {
  const expenses = await prisma.expense.findMany({
    where: { ...salonIdFilter(salonIds), date: day },
    select: { amount: true, source: true, category: true },
  });
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const cash = expenses
    .filter((e) => e.source.toLowerCase() === "cash")
    .reduce((s, e) => s + Number(e.amount), 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
  }
  return { total, cash, byCategory };
}

async function sumSalesByMethodMulti(salonIds: string[], dayStart: Date, dayEnd: Date) {
  const payments = await prisma.payment.groupBy({
    by: ["paymentMethod"],
    where: {
      paidAt: { gte: dayStart, lt: dayEnd },
      invoice: { ...salonIdFilter(salonIds), voidedAt: null },
    },
    _sum: { amount: true },
  });

  const totals = { cash: 0, upi: 0, card: 0, other: 0 };
  for (const row of payments) {
    const amount = Number(row._sum.amount ?? 0);
    const method = row.paymentMethod.toLowerCase();
    if (method === "cash") totals.cash += amount;
    else if (method === "upi") totals.upi += amount;
    else if (method === "card") totals.card += amount;
    else totals.other += amount;
  }
  return totals;
}

async function getOpeningCash(salonId: string, day: Date): Promise<number> {
  const prior = await prisma.dayClose.findFirst({
    where: {
      salonId,
      status: "completed",
      closingDate: { lt: day },
    },
    orderBy: { closingDate: "desc" },
    select: { physicalCash: true },
  });
  return prior ? Number(prior.physicalCash) : 0;
}

async function buildDaySnapshot(salonIds: string[], day: Date) {
  const dateKey = formatDate(day);
  const { gte, lt } = istDayRangeForDateKey(dateKey);
  const primarySalonId = salonIds[0]!;
  const [sales, expenses, openingCash, dayClose] = await Promise.all([
    sumSalesByMethodMulti(salonIds, gte, lt),
    sumExpensesForDay(salonIds, day),
    // Opening cash / day-close lock only meaningful for a single shop
    salonIds.length === 1 ? getOpeningCash(primarySalonId, day) : Promise.resolve(0),
    salonIds.length === 1
      ? prisma.dayClose.findFirst({
          where: { salonId: primarySalonId, closingDate: day },
          include: { closedBy: { select: { fullName: true } } },
        })
      : Promise.resolve(null),
  ]);

  const expectedCash = openingCash + sales.cash - expenses.cash;
  const totalSales = sales.cash + sales.upi + sales.card + sales.other;

  return {
    date: formatDate(day),
    isClosed: Boolean(dayClose && dayClose.status === "completed"),
    openingCash,
    cashSales: sales.cash,
    upiSales: sales.upi,
    cardSales: sales.card,
    otherSales: sales.other,
    totalSales,
    totalExpenses: expenses.total,
    cashExpenses: expenses.cash,
    expensesByCategory: expenses.byCategory,
    expectedCash,
    netPosition: totalSales - expenses.total,
    dayClose: dayClose ? mapDayClose(dayClose) : null,
  };
}

function computeBudgetUsed(
  lines: BudgetLine[],
  expenses: Array<{ category: string; subCategory: string; amount: Prisma.Decimal }>,
) {
  return lines.map((line) => {
    const key = line.name.trim().toLowerCase();
    const used = expenses
      .filter(
        (e) =>
          e.category.trim().toLowerCase() === key ||
          e.subCategory.trim().toLowerCase() === key,
      )
      .reduce((s, e) => s + Number(e.amount), 0);
    return {
      id: line.id,
      name: line.name,
      type: line.type as "fixed" | "variable",
      allocated: Number(line.allocated),
      used,
    };
  });
}

export class AccountingRepository {
  private async resolveWriteSalonId(auth: AuthContext, inputSalonId?: string): Promise<string> {
    if (inputSalonId) {
      const ids = await resolveListSalonIds(auth, inputSalonId);
      return ids[0]!;
    }
    return auth.salonId;
  }

  private async findScopedExpense(auth: AuthContext, expenseId: string) {
    const salonIds = await resolveListSalonIds(auth);
    return prisma.expense.findFirst({
      where: { id: expenseId, ...salonIdFilter(salonIds) },
      include: expenseDeleteInclude,
    });
  }

  async listExpenses(
    auth: AuthContext,
    filters: { from?: string; to?: string; category?: string; salonId?: string },
  ) {
    const salonIds = await resolveListSalonIds(auth, filters.salonId);
    const where: Prisma.ExpenseWhereInput = { ...salonIdFilter(salonIds) };
    if (filters.category) where.category = filters.category;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = toDateOnly(filters.from);
      if (filters.to) where.date.lte = toDateOnly(filters.to);
    }

    const rows = await prisma.expense.findMany({
      where,
      include: expenseDeleteInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: MAX_PAGE_LIMIT,
    });
    return rows.map(mapExpense);
  }

  async createExpense(auth: AuthContext, input: CreateExpenseInput) {
    const salonId = await this.resolveWriteSalonId(auth, input.salonId);
    const date = toDateOnly(input.date ?? formatDate(new Date()));
    await assertDateNotClosed(salonId, date);

    const expense = await prisma.expense.create({
      data: {
        salonId,
        date,
        category: input.category,
        subCategory: input.subCategory,
        amount: input.amount,
        source: input.source,
        remarks: input.remarks ?? null,
        createdById: auth.userId,
      },
      include: expenseDeleteInclude,
    });
    return mapExpense(expense);
  }

  async updateExpense(auth: AuthContext, expenseId: string, input: UpdateExpenseInput) {
    const existing = await this.findScopedExpense(auth, expenseId);
    if (!existing) {
      throw new AppError(404, "Expense not found", {
        code: ACCOUNTING_ERROR_CODES.EXPENSE_NOT_FOUND,
      });
    }

    await assertDateNotClosed(existing.salonId, existing.date);
    const nextDate = input.date ? toDateOnly(input.date) : existing.date;
    if (formatDate(nextDate) !== formatDate(existing.date)) {
      await assertDateNotClosed(existing.salonId, nextDate);
    }

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        date: input.date ? nextDate : undefined,
        category: input.category,
        subCategory: input.subCategory,
        amount: input.amount,
        source: input.source,
        remarks: input.remarks === undefined ? undefined : input.remarks,
      },
      include: expenseDeleteInclude,
    });
    return mapExpense(expense);
  }

  async requestExpenseDelete(auth: AuthContext, expenseId: string) {
    const existing = await this.findScopedExpense(auth, expenseId);
    if (!existing) {
      throw new AppError(404, "Expense not found", {
        code: ACCOUNTING_ERROR_CODES.EXPENSE_NOT_FOUND,
      });
    }
    await assertDateNotClosed(existing.salonId, existing.date);
    if (existing.deleteRequestedAt) {
      throw new AppError(409, "Delete already requested for this expense", {
        code: ACCOUNTING_ERROR_CODES.EXPENSE_DELETE_ALREADY_REQUESTED,
      });
    }

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        deleteRequestedAt: new Date(),
        deleteRequestedById: auth.userId,
        deleteRejectedAt: null,
        deleteRejectedById: null,
      },
      include: expenseDeleteInclude,
    });
    return mapExpense(expense);
  }

  async cancelExpenseDeleteRequest(auth: AuthContext, expenseId: string) {
    const existing = await this.findScopedExpense(auth, expenseId);
    if (!existing) {
      throw new AppError(404, "Expense not found", {
        code: ACCOUNTING_ERROR_CODES.EXPENSE_NOT_FOUND,
      });
    }
    if (!existing.deleteRequestedAt) {
      throw new AppError(400, "No delete request pending for this expense", {
        code: ACCOUNTING_ERROR_CODES.EXPENSE_DELETE_NOT_REQUESTED,
      });
    }

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        deleteRequestedAt: null,
        deleteRequestedById: null,
        deleteRejectedAt: new Date(),
        deleteRejectedById: auth.userId,
      },
      include: expenseDeleteInclude,
    });
    return mapExpense(expense);
  }

  async deleteExpense(auth: AuthContext, expenseId: string) {
    const existing = await this.findScopedExpense(auth, expenseId);
    if (!existing) {
      throw new AppError(404, "Expense not found", {
        code: ACCOUNTING_ERROR_CODES.EXPENSE_NOT_FOUND,
      });
    }
    await assertDateNotClosed(existing.salonId, existing.date);
    await prisma.expense.delete({ where: { id: expenseId } });
  }

  async getBudget(salonId: string, year: number, month: number) {
    const period = await prisma.budgetPeriod.findUnique({
      where: { salonId_year_month: { salonId, year, month } },
      include: { lines: { orderBy: { createdAt: "asc" } } },
    });

    const monthStart = startOfMonth(year, month);
    const monthEnd = endOfMonthExclusive(year, month);
    const expenses = await prisma.expense.findMany({
      where: { salonId, date: { gte: monthStart, lt: monthEnd } },
      select: { category: true, subCategory: true, amount: true },
    });

    if (!period) {
      return { year, month, lines: [] as ReturnType<typeof computeBudgetUsed> };
    }

    return {
      id: period.id,
      year: period.year,
      month: period.month,
      lines: computeBudgetUsed(period.lines, expenses),
    };
  }

  async upsertBudget(auth: AuthContext, input: UpsertBudgetInput) {
    const period = await prisma.$transaction(async (tx) => {
      const existing = await tx.budgetPeriod.findUnique({
        where: {
          salonId_year_month: {
            salonId: auth.salonId,
            year: input.year,
            month: input.month,
          },
        },
      });

      const budget =
        existing ??
        (await tx.budgetPeriod.create({
          data: {
            salonId: auth.salonId,
            year: input.year,
            month: input.month,
          },
        }));

      await tx.budgetLine.deleteMany({ where: { budgetId: budget.id } });

      if (input.lines.length > 0) {
        await tx.budgetLine.createMany({
          data: input.lines.map((line) => ({
            ...(line.id ? { id: line.id } : {}),
            budgetId: budget.id,
            name: line.name,
            type: line.type,
            allocated: line.allocated,
          })),
        });
      }

      return tx.budgetPeriod.findUniqueOrThrow({
        where: { id: budget.id },
        include: { lines: { orderBy: { createdAt: "asc" } } },
      });
    });

    return this.getBudget(auth.salonId, period.year, period.month);
  }

  async listDayCloses(salonId: string) {
    const rows = await prisma.dayClose.findMany({
      where: { salonId },
      include: { closedBy: { select: { fullName: true } } },
      orderBy: { closingDate: "desc" },
      take: 90,
    });
    return rows.map(mapDayClose);
  }

  async getDayClose(salonId: string, dateStr: string) {
    const day = toDateOnly(dateStr);
    const snapshot = await buildDaySnapshot([salonId], day);
    return snapshot;
  }

  async createDayClose(auth: AuthContext, input: CreateDayCloseInput) {
    const day = toDateOnly(input.closingDate ?? formatDate(new Date()));
    const existing = await prisma.dayClose.findFirst({
      where: { salonId: auth.salonId, closingDate: day },
    });
    if (existing) {
      throw new AppError(409, "Day already closed for this date", {
        code: ACCOUNTING_ERROR_CODES.DAY_CLOSE_EXISTS,
      });
    }

    const snapshot = await buildDaySnapshot([auth.salonId], day);
    const physicalCash = input.physicalCash;
    const variance = physicalCash - snapshot.expectedCash;

    if (Math.abs(variance) > 0.009 && !input.varianceNote?.trim()) {
      throw new AppError(400, "Variance note is required when cash does not match", {
        code: ACCOUNTING_ERROR_CODES.VARIANCE_NOTE_REQUIRED,
      });
    }

    const row = await prisma.dayClose.create({
      data: {
        salonId: auth.salonId,
        closingDate: day,
        status: "completed",
        openingCash: snapshot.openingCash,
        cashSales: snapshot.cashSales,
        upiSales: snapshot.upiSales,
        cardSales: snapshot.cardSales,
        totalExpenses: snapshot.totalExpenses,
        cashExpenses: snapshot.cashExpenses,
        expectedCash: snapshot.expectedCash,
        physicalCash,
        variance,
        varianceNote: input.varianceNote?.trim() || null,
        upiSettled: input.upiSettled ?? 0,
        cardSettled: input.cardSettled ?? 0,
        bankDrop: input.bankDrop ?? 0,
        denomCounts: input.denomCounts ?? undefined,
        closedById: auth.userId,
        closedAt: new Date(),
      },
      include: { closedBy: { select: { fullName: true } } },
    });

    return mapDayClose(row);
  }

  async getOverview(auth: AuthContext, opts?: { date?: string; salonId?: string }) {
    const salonIds = await resolveListSalonIds(auth, opts?.salonId);
    const day = toDateOnly(opts?.date ?? formatDate(new Date()));
    const snapshot = await buildDaySnapshot(salonIds, day);

    // Last 7 days for reports chart
    const weekly: Array<{ day: string; date: string; revenue: number; expenses: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = addDays(day, -i);
      const dateKey = formatDate(d);
      const { gte, lt } = istDayRangeForDateKey(dateKey);
      const [sales, expenses] = await Promise.all([
        sumSalesByMethodMulti(salonIds, gte, lt),
        sumExpensesForDay(salonIds, d),
      ]);
      weekly.push({
        day: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        date: formatDate(d),
        revenue: sales.cash + sales.upi + sales.card + sales.other,
        expenses: expenses.total,
      });
    }

    const monthStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 1));
    const salonWhere = salonIdFilter(salonIds);
    const [monthSalesRows, monthExpenses] = await Promise.all([
      prisma.payment.groupBy({
        by: ["paymentMethod"],
        where: {
          paidAt: { gte: monthStart, lt: monthEnd },
          invoice: { ...salonWhere, voidedAt: null },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...salonWhere, date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
    ]);

    const monthRevenue = monthSalesRows.reduce((s, r) => s + Number(r._sum.amount ?? 0), 0);
    const monthExpenseTotal = Number(monthExpenses._sum.amount ?? 0);

    const gstRows = await prisma.invoice.aggregate({
      where: {
        ...salonWhere,
        voidedAt: null,
        invoiceDate: { gte: monthStart, lt: monthEnd },
      },
      _sum: { gstAmount: true, discountAmount: true, membershipDiscount: true, couponDiscount: true },
    });

    return {
      ...snapshot,
      weekly,
      period: {
        revenue: monthRevenue,
        expenses: monthExpenseTotal,
        netProfit: monthRevenue - monthExpenseTotal,
        gstCollected: Number(gstRows._sum.gstAmount ?? 0),
        discount:
          Number(gstRows._sum.discountAmount ?? 0) +
          Number(gstRows._sum.membershipDiscount ?? 0) +
          Number(gstRows._sum.couponDiscount ?? 0),
      },
    };
  }
}

export const accountingRepository = new AccountingRepository();
