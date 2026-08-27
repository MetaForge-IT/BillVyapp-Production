import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Banknote,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  QrCode,
  Receipt,
  Store,
  Tags,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  cancelExpenseDeleteRequest,
  createExpense,
  deleteExpense,
  fetchAccountingOverview,
  fetchExpenses,
  requestExpenseDelete,
  updateExpense,
  type AccountingExpense,
  type ExpenseCategory,
  type ExpenseSource,
} from "../../api/accounting";
import { fetchMyFranchise } from "../../api/franchises";
import { getApiErrorMessage } from "../../lib/api";
import {
  EXPENSE_SOURCES,
  expenseToFormValues,
  parseExpenseRemarks,
  todayIsoDate,
  validateExpenseForm,
  type ExpenseFormValues,
} from "../../lib/expenseForm";
import { FilterSelect } from "../components/shared/FilterSelect";
import { FormSelect } from "../components/shared/FormSelect";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { toast } from "../components/ui/hot-toast";
import { cn } from "../components/ui/utils";
import { isAdmin, useRole } from "../context/RoleContext";

const SOURCE_ICON: Record<ExpenseSource, typeof Banknote> = {
  Cash: Banknote,
  UPI: QrCode,
  Card: CreditCard,
};

const CATEGORY_OPTIONS = [
  { value: "Operational", label: "Operational", description: "Rent, utilities, maintenance" },
  { value: "Inventory", label: "Inventory", description: "Products & supplies" },
  { value: "Payroll", label: "Payroll", description: "Salary, advance, incentives" },
  { value: "Transfer", label: "Transfer", description: "Cash to bank / internal moves" },
] as const satisfies ReadonlyArray<{ value: ExpenseCategory; label: string; description: string }>;

function emptyForm(): ExpenseFormValues {
  return {
    date: todayIsoDate(),
    category: "Operational",
    subCategory: "",
    employeeName: "",
    amount: "",
    source: "Cash",
    note: "",
  };
}

function formatDisplayDate(iso: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function Expenses() {
  const { role } = useRole();
  const admin = isAdmin(role);
  const [expenses, setExpenses] = useState<AccountingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormValues>(emptyForm);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [shopFilter, setShopFilter] = useState("all");
  const [formSalonId, setFormSalonId] = useState("");

  const franchiseQuery = useQuery({
    queryKey: ["my-franchise"],
    queryFn: fetchMyFranchise,
    enabled: admin,
  });
  const franchiseShops = franchiseQuery.data?.shops ?? [];
  const showShopColumn = admin && shopFilter === "all" && franchiseShops.length > 1;
  const shopSelectOptions = useMemo(
    () =>
      franchiseShops.map((shop) => ({
        value: shop.id,
        label: shop.displayName?.trim() || shop.name,
      })),
    [franchiseShops],
  );

  const resetForm = () => {
    setForm(emptyForm());
    setFieldError(undefined);
    setEditingId(null);
    setShowForm(false);
    setFormSalonId(shopFilter !== "all" ? shopFilter : "");
  };

  const openCreateForm = () => {
    setForm(emptyForm());
    setFieldError(undefined);
    setEditingId(null);
    setFormSalonId(shopFilter !== "all" ? shopFilter : "");
    setShowForm(true);
  };

  const openEditForm = (expense: AccountingExpense) => {
    if (!admin) return;
    setForm(expenseToFormValues(expense));
    setFieldError(undefined);
    setEditingId(expense.id);
    setFormSalonId(expense.salonId ?? "");
    setShowForm(true);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const salonId = admin && shopFilter !== "all" ? shopFilter : undefined;
    try {
      const [rows, overview] = await Promise.all([
        fetchExpenses({ salonId }),
        fetchAccountingOverview(todayIsoDate(), { salonId }),
      ]);
      setExpenses(rows);
      setIsClosed(overview.isClosed);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load expenses"));
    } finally {
      setLoading(false);
    }
  }, [admin, shopFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const pagination = useTablePagination(expenses.length, [shopFilter]);
  const pageRows = useMemo(() => pagination.paginate(expenses), [expenses, pagination]);

  const patchForm = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    setFieldError(undefined);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "category" && value !== "Payroll") next.employeeName = "";
      return next;
    });
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
    if (admin && franchiseShops.length > 1 && !editingId && !formSalonId) {
      setFieldError("salonId");
      toast.error("Select a shop for this expense");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...result.value,
        ...(admin && formSalonId ? { salonId: formSalonId } : {}),
      };
      if (editingId) {
        const updated = await updateExpense(editingId, result.value);
        setExpenses((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
        resetForm();
        toast.success("Expense updated");
      } else {
        const created = await createExpense(payload);
        setExpenses((prev) => [created, ...prev]);
        resetForm();
        toast.success("Expense saved");
        void load();
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, editingId ? "Failed to update expense" : "Failed to save expense"),
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense: AccountingExpense) => {
    if (isClosed) return;
    setActionId(expense.id);
    try {
      if (admin) {
        await deleteExpense(expense.id);
        setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
        toast.success(
          expense.deleteRequested ? "Delete approved — expense removed" : "Expense deleted",
        );
      } else {
        const updated = await requestExpenseDelete(expense.id);
        setExpenses((prev) => prev.map((e) => (e.id === expense.id ? updated : e)));
        toast.success("Requested to admin");
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          admin ? "Failed to delete expense" : "Failed to request delete",
        ),
      );
    } finally {
      setActionId(null);
    }
  };

  const cancelDelete = async (expense: AccountingExpense) => {
    if (isClosed || !admin) return;
    setActionId(expense.id);
    try {
      const updated = await cancelExpenseDeleteRequest(expense.id);
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? updated : e)));
      toast.success("Delete request rejected");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to reject delete request"));
    } finally {
      setActionId(null);
    }
  };

  const renderActions = (e: AccountingExpense, compact = false) => {
    const busy = actionId === e.id;
    if (admin && e.deleteRequested) {
      return (
        <div className={cn("flex flex-wrap items-center gap-1.5", compact ? "" : "justify-end")}>
          <button
            type="button"
            disabled={isClosed || busy}
            onClick={() => void remove(e)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-800 disabled:opacity-30"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve
          </button>
          <button
            type="button"
            disabled={isClosed || busy}
            onClick={() => void cancelDelete(e)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-bold text-red-700 disabled:opacity-30"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      );
    }

    if (!admin && e.deleteRequested) {
      return (
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          Pending admin
        </span>
      );
    }

    return (
      <div className={cn("flex flex-col gap-1.5", compact ? "items-start" : "items-end")}>
        {!admin && e.deleteRejected ? (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
            Rejected by admin
          </span>
        ) : null}
        <div className={cn("flex flex-wrap items-center gap-1.5", compact ? "" : "justify-end")}>
          {admin && !e.deleteRequested ? (
            <button
              type="button"
              disabled={isClosed || busy}
              onClick={() => openEditForm(e)}
              aria-label="Edit expense"
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] text-[#3f3f46] transition-colors hover:border-[#D4AF37]/35 hover:text-[#9a7d20] disabled:opacity-30",
                compact ? "h-8 w-8" : "h-9 px-3 text-[12px] font-semibold",
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
              {!compact ? "Edit" : null}
            </button>
          ) : null}
          <button
            type="button"
            disabled={isClosed || busy}
            onClick={() => void remove(e)}
            aria-label={admin ? "Delete expense" : "Request delete"}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] text-[#52525b] transition-colors hover:border-[#D4AF37]/35 hover:text-[#111118] disabled:opacity-30",
              compact ? "h-8 w-8" : "h-9 px-3 text-[12px] font-semibold text-[#3f3f46]",
            )}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {!compact ? "Delete" : null}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
            Finance
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#111118] sm:text-3xl">Expenses</h1>
          <p className="mt-1 text-[12px] text-[#3f3f46] sm:text-[13px]">
            Track salon expenses — every entry needs a note.
          </p>
        </div>
        <button
          type="button"
          disabled={isClosed}
          onClick={() => (showForm && !editingId ? resetForm() : openCreateForm())}
          className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#111118] px-3.5 text-[12px] font-bold text-[#D4AF37] transition-opacity disabled:opacity-40 sm:h-11 sm:w-auto sm:px-4 sm:text-[13px]"
        >
          <Plus className="h-4 w-4" />
          {showForm && !editingId ? "Close Form" : "Add Expense"}
        </button>
      </div>

      {isClosed && (
        <div className="shrink-0 rounded-xl border border-[#D4AF37]/30 bg-[#FAF8F2] px-3 py-2.5 text-[12px] text-[#3f3f46] sm:px-4 sm:py-3">
          Today is closed — expenses are read-only until the next open day.
        </div>
      )}

      {admin && franchiseShops.length > 0 && (
        <div className="shrink-0">
          <FilterSelect
            value={shopFilter}
            onValueChange={setShopFilter}
            icon={Store}
            active={shopFilter !== "all"}
            className="sm:max-w-xs"
            options={[
              { value: "all", label: `All Shops (${franchiseShops.length})` },
              ...franchiseShops.map((shop) => ({
                value: shop.id,
                label: shop.displayName?.trim() || shop.name,
              })),
            ]}
          />
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-2xl border border-black/[0.07] bg-white p-3 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">Entries</p>
          <p className="mt-1 text-xl font-black text-[#111118] sm:text-2xl">{expenses.length}</p>
          <p className="mt-0.5 text-[10px] text-[#52525b]">
            {shopFilter === "all" ? "All shops" : "Selected shop"}
          </p>
        </div>
        <div className="rounded-2xl border border-black/[0.07] bg-white p-3 sm:col-span-2 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#52525b]">Total</p>
          <p className="mt-1 truncate text-xl font-black tabular-nums text-[#111118] sm:text-2xl">
            ₹{totalAmount.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {showForm && !isClosed && (
        <div className="max-h-[min(48dvh,28rem)] shrink-0 space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-[#D4AF37]/30 bg-[#faf8f2] p-3 sm:max-h-[min(42dvh,26rem)] sm:space-y-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 shrink-0 text-[#D4AF37]" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#111118]">
                {editingId ? "Edit Expense" : "New Expense"}
              </p>
              <p className="text-[11px] text-[#3f3f46]">
                {editingId ? "Admin only — update this entry" : "Note is compulsory"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
            {admin && franchiseShops.length > 1 && !editingId ? (
              <label className="space-y-1.5 min-[480px]:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">Shop *</span>
                <FormSelect
                  value={formSalonId}
                  onValueChange={setFormSalonId}
                  options={shopSelectOptions}
                  placeholder="Select shop / branch"
                  icon={Store}
                  highlightWhenSet={false}
                  aria-label="Expense shop"
                  triggerClassName={cn(
                    "bg-white",
                    fieldError === "salonId"
                      ? "border-red-400 focus-visible:border-red-400 focus-visible:ring-red-400/20"
                      : undefined,
                  )}
                />
              </label>
            ) : null}
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">Date *</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => patchForm("date", e.target.value)}
                className={cn(
                  "h-10 w-full min-w-0 rounded-xl border bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15",
                  fieldError === "date" ? "border-red-400" : "border-black/[0.08]",
                )}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">Category *</span>
              <FormSelect
                value={form.category}
                onValueChange={(value) => patchForm("category", value as ExpenseCategory)}
                options={CATEGORY_OPTIONS}
                placeholder="Select category"
                icon={Tags}
                highlightWhenSet={false}
                aria-label="Expense category"
                triggerClassName={cn(
                  "bg-white",
                  fieldError === "category"
                    ? "border-red-400 focus-visible:border-red-400 focus-visible:ring-red-400/20"
                    : undefined,
                )}
              />
            </label>
            <label className="space-y-1.5 min-[480px]:col-span-2 lg:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">
                Sub Category *
              </span>
              <input
                value={form.subCategory}
                onChange={(e) => patchForm("subCategory", e.target.value)}
                placeholder="e.g. Electricity, Shampoo, Staff advance"
                className={cn(
                  "h-10 w-full min-w-0 rounded-xl border bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15",
                  fieldError === "subCategory" ? "border-red-400" : "border-black/[0.08]",
                )}
              />
            </label>
            {form.category === "Payroll" && (
              <label className="space-y-1.5 min-[480px]:col-span-2 lg:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">
                  Employee Name{" "}
                  <span className="font-medium normal-case tracking-normal text-[#52525b]">(optional)</span>
                </span>
                <input
                  value={form.employeeName}
                  onChange={(e) => patchForm("employeeName", e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className={cn(
                    "h-10 w-full min-w-0 rounded-xl border bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15",
                    fieldError === "employeeName" ? "border-red-400" : "border-black/[0.08]",
                  )}
                />
              </label>
            )}
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">Amount *</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#52525b]">
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
                    "h-10 w-full min-w-0 rounded-xl border bg-white pl-7 pr-3 text-[13px] font-bold outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15",
                    fieldError === "amount" ? "border-red-400" : "border-black/[0.08]",
                  )}
                />
              </div>
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">
              Paid via *
            </span>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-black/[0.08] bg-white p-1">
              {EXPENSE_SOURCES.map((s) => {
                const Icon = SOURCE_ICON[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patchForm("source", s)}
                    className={cn(
                      "flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-bold transition-all sm:gap-1.5",
                      form.source === s
                        ? "bg-[#111118] text-[#D4AF37]"
                        : "text-[#3f3f46] hover:text-[#111118]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">
              Note * <span className="font-medium normal-case tracking-normal text-[#52525b]">(required)</span>
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
            <span className="text-[10px] text-[#52525b]">{form.note.trim().length}/500</span>
          </label>

          <div className="flex flex-col-reverse gap-2 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="h-10 rounded-xl border border-black/[0.08] px-4 text-[12px] font-semibold text-[#3f3f46]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] px-5 text-[12px] font-bold text-[#111118] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {saving ? "Saving…" : editingId ? "Update Expense" : "Save Expense"}
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#52525b]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading expenses…
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="mx-auto mb-2 h-8 w-8 text-[#D4AF37]/35" />
            <p className="text-[13px] text-[#52525b]">No expenses yet</p>
          </div>
        ) : (
          <>
            {/* Phone + tablet: card list (no horizontal scroll) */}
            <div className="min-h-0 flex-1 divide-y divide-black/[0.05] overflow-y-auto overscroll-contain lg:hidden">
              {pageRows.map((e) => {
                const parsed = parseExpenseRemarks(e.remarks);
                const SourceIcon = SOURCE_ICON[(e.source as ExpenseSource) || "Cash"] ?? Banknote;
                return (
                  <article key={e.id} className="space-y-2.5 p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB]">
                        <SourceIcon className="h-4 w-4 text-[#D4AF37]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-[#111118]">
                          {e.subCategory || e.sub}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#52525b]">
                          {formatDisplayDate(e.date)} · {e.source}
                          {showShopColumn && e.salonName ? ` · ${e.salonName}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-[14px] font-black tabular-nums text-[#111118]">
                        ₹{e.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-0 sm:pl-12">
                      {showShopColumn && e.salonName ? (
                        <span className="rounded-full border border-[#D4AF37]/25 bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-semibold text-[#9a7d20]">
                          {e.salonName}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-[#f4f2ed] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3f3f46]">
                        {e.category}
                      </span>
                      {parsed.employeeName && (
                        <span className="rounded-full border border-[#D4AF37]/25 bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-semibold text-[#9a7d20]">
                          {parsed.employeeName}
                        </span>
                      )}
                    </div>
                    {parsed.note ? (
                      <p className="text-[12px] leading-snug text-[#3f3f46] sm:pl-12">{parsed.note}</p>
                    ) : null}
                    {e.deleteRequested ? (
                      <p className="text-[11px] font-semibold text-amber-700 sm:pl-12">
                        Delete requested
                        {e.deleteRequestedByName ? ` by ${e.deleteRequestedByName}` : ""} — awaiting admin
                      </p>
                    ) : e.deleteRejected && !admin ? (
                      <p className="text-[11px] font-semibold text-red-700 sm:pl-12">
                        Delete rejected by admin
                        {e.deleteRejectedByName ? ` (${e.deleteRejectedByName})` : ""}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap justify-end gap-2 sm:pl-12">{renderActions(e)}</div>
                  </article>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden min-h-0 flex-1 overflow-auto overscroll-contain lg:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-black/[0.06] bg-[#FAF8F2]">
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-[#3f3f46] xl:px-4">Date</th>
                    {showShopColumn ? (
                      <th className="px-3 py-3 text-left text-[11px] font-semibold text-[#3f3f46] xl:px-4">Shop</th>
                    ) : null}
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-[#3f3f46] xl:px-4">Category</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-[#3f3f46] xl:px-4">Sub Category</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-[#3f3f46] xl:px-4">Employee</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-[#3f3f46] xl:px-4">Source</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-[#3f3f46] xl:px-4">Note</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#3f3f46] xl:px-4">Amount</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-[#3f3f46] xl:px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((e, index) => {
                    const parsed = parseExpenseRemarks(e.remarks);
                    return (
                      <tr
                        key={e.id}
                        className={cn(
                          "border-b border-black/[0.05] transition-colors hover:bg-[#FAF8F2]/80",
                          index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                        )}
                      >
                        <td className="whitespace-nowrap px-3 py-3 text-[12px] tabular-nums text-[#111118] xl:px-4">
                          {formatDisplayDate(e.date)}
                        </td>
                        {showShopColumn ? (
                          <td className="max-w-[9rem] truncate px-3 py-3 text-[12px] font-semibold text-[#9a7d20] xl:px-4">
                            {e.salonName || "—"}
                          </td>
                        ) : null}
                        <td className="px-3 py-3 xl:px-4">
                          <span className="rounded-full bg-[#f4f2ed] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3f3f46]">
                            {e.category}
                          </span>
                        </td>
                        <td className="max-w-[10rem] truncate px-3 py-3 text-[13px] font-semibold text-[#111118] xl:max-w-[14rem] xl:px-4">
                          {e.subCategory || e.sub}
                        </td>
                        <td className="max-w-[8rem] truncate px-3 py-3 text-[12px] text-[#3f3f46] xl:px-4">
                          {parsed.employeeName || "—"}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-[#3f3f46] xl:px-4">{e.source}</td>
                        <td className="max-w-[12rem] truncate px-3 py-3 text-[12px] text-[#3f3f46] xl:max-w-[16rem] xl:px-4" title={parsed.note}>
                          {parsed.note || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-bold tabular-nums text-[#111118] xl:px-4">
                          ₹{e.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-3 xl:px-4">
                          <div className="flex flex-col items-start gap-1">
                            {renderActions(e, true)}
                            {e.deleteRequested && admin ? (
                              <span className="text-[10px] text-amber-700">
                                Requested{e.deleteRequestedByName ? ` by ${e.deleteRequestedByName}` : ""}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {expenses.length > 0 && (
          <div className="shrink-0 border-t border-black/[0.06]">
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalRecords={expenses.length}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
