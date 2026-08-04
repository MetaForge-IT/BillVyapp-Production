import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  Loader2,
  Plus,
  QrCode,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  createExpense,
  deleteExpense,
  fetchAccountingOverview,
  fetchExpenses,
  type AccountingExpense,
  type ExpenseCategory,
  type ExpenseSource,
} from "../../api/accounting";
import { getApiErrorMessage } from "../../lib/api";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_SOURCES,
  todayIsoDate,
  validateExpenseForm,
  type ExpenseFormValues,
} from "../../lib/expenseForm";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { toast } from "../components/ui/hot-toast";
import { cn } from "../components/ui/utils";

const SOURCE_ICON: Record<ExpenseSource, typeof Banknote> = {
  Cash: Banknote,
  UPI: QrCode,
  Card: CreditCard,
};

function emptyForm(): ExpenseFormValues {
  return {
    date: todayIsoDate(),
    category: "Operational",
    subCategory: "",
    amount: "",
    source: "Cash",
    note: "",
  };
}

export function Expenses() {
  const [expenses, setExpenses] = useState<AccountingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExpenseFormValues>(emptyForm);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<"all" | ExpenseCategory>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, overview] = await Promise.all([
        fetchExpenses(),
        fetchAccountingOverview(todayIsoDate()),
      ]);
      setExpenses(rows);
      setIsClosed(overview.isClosed);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load expenses"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      categoryFilter === "all"
        ? expenses
        : expenses.filter((e) => e.category === categoryFilter),
    [expenses, categoryFilter],
  );

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
  const pagination = useTablePagination(filtered.length, [categoryFilter]);
  const pageRows = useMemo(() => pagination.paginate(filtered), [filtered, pagination]);

  const patchForm = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    setFieldError(undefined);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    if (isClosed) {
      toast.error("Today is closed — expenses are read-only");
      return;
    }
    const result = validateExpenseForm(form);
    if (!result.ok) {
      setFieldError(result.field);
      toast.error(result.error);
      return;
    }
    setSaving(true);
    try {
      const created = await createExpense(result.value);
      setExpenses((prev) => [created, ...prev]);
      setForm(emptyForm());
      setShowForm(false);
      setFieldError(undefined);
      toast.success("Expense saved");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save expense"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (isClosed) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success("Expense deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete expense"));
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111118]">Expenses</h1>
          <p className="mt-1 text-[13px] text-[#6b6b6b]">
            Track salon expenses — every entry needs a note.
          </p>
        </div>
        <button
          type="button"
          disabled={isClosed}
          onClick={() => {
            setForm(emptyForm());
            setFieldError(undefined);
            setShowForm((v) => !v);
          }}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#111118] px-4 text-[13px] font-bold text-[#D4AF37] transition-opacity disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add expense
        </button>
      </div>

      {isClosed && (
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#FAF8F2] px-4 py-3 text-[12px] text-[#6b6b6b]">
          Today is closed — expenses are read-only until the next open day.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Entries</p>
          <p className="mt-1 text-2xl font-black text-[#111118]">{filtered.length}</p>
        </div>
        <div className="rounded-2xl border border-black/[0.07] bg-white p-4 sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Total</p>
          <p className="mt-1 text-2xl font-black text-[#111118]">
            ₹{totalAmount.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {showForm && !isClosed && (
        <div className="space-y-4 rounded-2xl border border-[#D4AF37]/30 bg-[#faf8f2] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[#D4AF37]" />
            <div>
              <p className="text-[13px] font-bold text-[#111118]">New expense</p>
              <p className="text-[11px] text-[#6b6b6b]">Note is compulsory</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">Date *</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => patchForm("date", e.target.value)}
                className={cn(
                  "h-10 w-full rounded-xl border bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15",
                  fieldError === "date" ? "border-red-400" : "border-black/[0.08]",
                )}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">Category *</span>
              <select
                value={form.category}
                onChange={(e) => patchForm("category", e.target.value as ExpenseCategory)}
                className={cn(
                  "h-10 w-full rounded-xl border bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15",
                  fieldError === "category" ? "border-red-400" : "border-black/[0.08]",
                )}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">
                Sub-category *
              </span>
              <input
                value={form.subCategory}
                onChange={(e) => patchForm("subCategory", e.target.value)}
                placeholder="e.g. Electricity, Shampoo, Staff advance"
                className={cn(
                  "h-10 w-full rounded-xl border bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15",
                  fieldError === "subCategory" ? "border-red-400" : "border-black/[0.08]",
                )}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">Amount *</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#9a9a9a]">
                  ₹
                </span>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => patchForm("amount", e.target.value)}
                  placeholder="0"
                  className={cn(
                    "h-10 w-full rounded-xl border bg-white pl-7 pr-3 text-[13px] font-bold outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15",
                    fieldError === "amount" ? "border-red-400" : "border-black/[0.08]",
                  )}
                />
              </div>
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">
              Paid via *
            </span>
            <div className="flex gap-1.5 rounded-xl border border-black/[0.08] bg-white p-1">
              {EXPENSE_SOURCES.map((s) => {
                const Icon = SOURCE_ICON[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patchForm("source", s)}
                    className={cn(
                      "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold transition-all",
                      form.source === s
                        ? "bg-[#111118] text-[#D4AF37]"
                        : "text-[#6b6b6b] hover:text-[#111118]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">
              Note * <span className="font-medium normal-case tracking-normal text-[#9a9a9a]">(required)</span>
            </span>
            <textarea
              value={form.note}
              onChange={(e) => patchForm("note", e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Why was this expense made?"
              className={cn(
                "w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15",
                fieldError === "note" ? "border-red-400" : "border-black/[0.08]",
              )}
            />
            <span className="text-[10px] text-[#9a9a9a]">{form.note.trim().length}/500</span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-10 rounded-xl border border-black/[0.08] px-4 text-[12px] font-semibold text-[#6b6b6b]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] px-5 text-[12px] font-bold text-[#111118] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {saving ? "Saving…" : "Save expense"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "h-9 rounded-xl border px-3 text-[12px] font-semibold transition-all",
            categoryFilter === "all"
              ? "border-[#111118] bg-[#111118] text-[#D4AF37]"
              : "border-black/[0.08] bg-white text-[#6b6b6b]",
          )}
        >
          All
        </button>
        {EXPENSE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)}
            className={cn(
              "h-9 rounded-xl border px-3 text-[12px] font-semibold transition-all",
              categoryFilter === c
                ? "border-[#111118] bg-[#111118] text-[#D4AF37]"
                : "border-black/[0.08] bg-white text-[#6b6b6b]",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#9a9a9a]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading expenses…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="mx-auto mb-2 h-8 w-8 text-[#D4AF37]/35" />
            <p className="text-[13px] text-[#9a9a9a]">No expenses yet</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.05]">
            {pageRows.map((e) => {
              const SourceIcon = SOURCE_ICON[(e.source as ExpenseSource) || "Cash"] ?? Banknote;
              return (
                <div
                  key={e.id}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[#FAF8F2]/70 sm:px-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB]">
                    <SourceIcon className="h-4 w-4 text-[#D4AF37]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-[#111118]">
                        {e.subCategory || e.sub}
                      </p>
                      <span className="rounded-full bg-[#f4f2ed] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6b6b6b]">
                        {e.category}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#9a9a9a]">
                      {e.source} · {e.date}
                    </p>
                    {e.remarks ? (
                      <p className="mt-1 text-[12px] leading-snug text-[#6b6b6b]">{e.remarks}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-[14px] font-black tabular-nums text-[#111118]">
                    ₹{e.amount.toLocaleString("en-IN")}
                  </p>
                  <button
                    type="button"
                    disabled={isClosed}
                    onClick={() => void remove(e.id)}
                    aria-label="Delete expense"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] text-[#9a9a9a] transition-colors hover:border-[#D4AF37]/35 hover:text-[#111118] disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {filtered.length > 0 && (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalRecords={filtered.length}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        )}
      </div>
    </div>
  );
}
