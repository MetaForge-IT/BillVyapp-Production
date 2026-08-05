import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IndianRupee, TrendingUp, TrendingDown, Banknote, CreditCard,
  Smartphone, ArrowLeftRight, AlertTriangle, Lock, BarChart3, PiggyBank, FileText,
  Plus, Trash2, Receipt, ShoppingCart, Users, Zap, ChevronRight, Check, X, Loader2,
} from "lucide-react";
import { toast } from "../components/ui/hot-toast";
import { SegmentedPillNav } from "../components/layout/SegmentedPillNav";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { getApiErrorMessage } from "../../lib/api";
import {
  cancelExpenseDeleteRequest,
  createDayClose,
  createExpense,
  deleteExpense,
  fetchAccountingOverview,
  fetchBudget,
  fetchDayCloses,
  fetchExpenses,
  requestExpenseDelete,
  upsertBudget,
  type AccountingExpense,
  type AccountingOverview,
  type BudgetLine,
  type DayCloseRecord,
  type ExpenseCategory,
} from "../../api/accounting";
import { isAdmin, useRole } from "../context/RoleContext";
import {
  FinanceStatCard,
  FinanceStatGrid,
  FinancePanel,
  financeIconWrap,
  financeGoldBtn,
  financePanel,
  financePanelHeader,
  financePanelTitle,
  financeProgressTrack,
  financeProgressFill,
} from "./finance/finance-ui";

const TODAY = new Date().toISOString().slice(0, 10);

function useAccountingOverview(date = TODAY) {
  const [overview, setOverview] = useState<AccountingOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAccountingOverview(date);
      setOverview(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load accounting overview"));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { overview, loading, reload };
}

/* ─────────────────────────────────────────────────────────
   ACCOUNTING OVERVIEW
───────────────────────────────────────────────────────── */
function AccountingOverview() {
  const { overview, loading } = useAccountingOverview();

  const openingCash = overview?.openingCash ?? 0;
  const cashSales = overview?.cashSales ?? 0;
  const upiSales = overview?.upiSales ?? 0;
  const cardSales = overview?.cardSales ?? 0;
  const totalExpenses = overview?.totalExpenses ?? 0;
  const cashExpenses = overview?.cashExpenses ?? 0;
  const expectedCash = overview?.expectedCash ?? 0;
  const netPosition = overview?.netPosition ?? 0;

  const kpis = [
    { label: "Opening Cash", value: `₹${openingCash.toLocaleString()}`, sub: "Start of day", icon: Banknote },
    { label: "Cash Sales", value: `₹${cashSales.toLocaleString()}`, sub: "+revenue", icon: Banknote },
    { label: "UPI Sales", value: `₹${upiSales.toLocaleString()}`, sub: "+digital", icon: Smartphone },
    { label: "Card Sales", value: `₹${cardSales.toLocaleString()}`, sub: "+card", icon: CreditCard },
    { label: "Expenses Today", value: `₹${totalExpenses.toLocaleString()}`, sub: "−outflow", icon: TrendingDown },
    { label: "Expected Cash", value: `₹${expectedCash.toLocaleString()}`, sub: "in drawer", icon: IndianRupee },
    { label: "Net Position", value: `₹${netPosition.toLocaleString()}`, sub: "today", icon: TrendingUp },
    { label: "Pending Settlement", value: `₹${cardSales.toLocaleString()}`, sub: "card processing", icon: ArrowLeftRight },
  ];

  const payMethods = [
    { label: "Cash", val: cashSales, color: "#D4AF37" },
    { label: "UPI", val: upiSales, color: "#6b6b6b" },
    { label: "Card", val: cardSales, color: "#121212" },
  ].filter((x) => x.val > 0);
  const total = payMethods.reduce((s, m) => s + m.val, 0) || 1;

  const expCats = [
    { label: "Operational", val: overview?.expensesByCategory?.Operational ?? 0, color: "#D4AF37" },
    { label: "Inventory", val: overview?.expensesByCategory?.Inventory ?? 0, color: "#9a9a9a" },
    { label: "Payroll", val: overview?.expensesByCategory?.Payroll ?? 0, color: "#121212" },
  ].filter((x) => x.val > 0);
  const expTotal = expCats.reduce((s, e) => s + e.val, 0) || 1;

  if (loading && !overview) {
    return <div className="py-16 text-center text-[13px] text-[#9a9a9a]">Loading overview…</div>;
  }

  return (
    <div className="space-y-5">
      {overview?.isClosed && (
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#FAF8F2] px-4 py-3 flex items-center gap-2 text-[12px] text-[#6b6b6b]">
          <Lock className="h-4 w-4 text-[#D4AF37]" />
          Day is closed for {TODAY}. Expense edits are locked.
        </div>
      )}

      <FinanceStatGrid>
        {kpis.map((k, i) => (
          <FinanceStatCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} index={i} />
        ))}
      </FinanceStatGrid>

      <div className="rounded-2xl border border-black/[0.07] bg-white shadow-sm px-5 py-3.5 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="text-[#6b6b6b]">Expected Cash</span>
        <span className="text-[#111118] font-bold">=</span>
        <span className="text-[#111118]">Opening ₹{openingCash.toLocaleString()}</span>
        <span className="text-[#9a9a9a]">+</span>
        <span className="text-[#111118]">Cash Sales ₹{cashSales.toLocaleString()}</span>
        <span className="text-[#9a9a9a]">−</span>
        <span className="text-[#111118]">Cash Exp ₹{cashExpenses.toLocaleString()}</span>
        <span className="text-[#9a9a9a]">=</span>
        <span className="text-[#D4AF37] font-black">₹{expectedCash.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`${financePanel} p-4`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b6b] mb-4">Today&apos;s Revenue Split</p>
          {payMethods.length > 0 ? (
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  {(() => {
                    let offset = 0;
                    return payMethods.map((m) => {
                      const pct = (m.val / total) * 100;
                      const dash = `${pct} ${100 - pct}`;
                      const el = (
                        <circle key={m.label} cx="18" cy="18" r="15.915" fill="none" stroke={m.color}
                          strokeWidth="3.5" strokeDasharray={dash} strokeDashoffset={-offset} />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
              </div>
              <div className="space-y-1.5">
                {payMethods.map((m) => (
                  <div key={m.label} className="flex items-center gap-2 text-[12px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                    <span className="text-[#6b6b6b]">{m.label}</span>
                    <span className="font-bold text-[#111118]">₹{m.val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#9a9a9a] py-6 text-center">No sales yet today</p>
          )}
        </div>

        <div className={`${financePanel} p-4`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b6b] mb-4">Expense Categories</p>
          {expCats.length > 0 ? (
            <div className="space-y-3">
              {expCats.map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-[#6b6b6b]">{c.label}</span>
                    <span className="font-bold text-[#111118]">₹{c.val.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.06]">
                    <div className="h-2 rounded-full" style={{ width: `${(c.val / expTotal) * 100}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#9a9a9a] py-6 text-center">No expenses yet today</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   EXPENSES
───────────────────────────────────────────────────────── */
const EXP_CATS = ["Operational", "Inventory", "Payroll", "Transfer"] as const;
type ExpCat = typeof EXP_CATS[number];
const EXP_ICONS: Record<ExpCat, typeof Zap> = {
  Operational: Zap, Inventory: ShoppingCart, Payroll: Users, Transfer: ArrowLeftRight,
};

function ExpensesTab() {
  const { role } = useRole();
  const admin = isAdmin(role);
  const [activeCat, setActiveCat] = useState<ExpCat>("Operational");
  const [expenses, setExpenses] = useState<AccountingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [form, setForm] = useState({ sub: "", amount: "", source: "Cash", remarks: "" });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, overview] = await Promise.all([
        fetchExpenses(),
        fetchAccountingOverview(TODAY),
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

  const catExpenses = expenses.filter((e) => e.category === activeCat);
  const catTotal = catExpenses.reduce((s, e) => s + e.amount, 0);
  const Icon = EXP_ICONS[activeCat];

  const expensesPagination = useTablePagination(catExpenses.length, [activeCat]);
  const paginatedExpenses = useMemo(
    () => expensesPagination.paginate(catExpenses),
    [catExpenses, expensesPagination],
  );

  const addExpense = async () => {
    if (!form.sub || !form.amount || isClosed) return;
    const note = form.remarks.trim();
    if (!note) {
      toast.error("Note is required");
      return;
    }
    setSaving(true);
    try {
      const created = await createExpense({
        date: TODAY,
        category: activeCat as ExpenseCategory,
        subCategory: form.sub,
        amount: Number(form.amount),
        source: form.source as "Cash" | "UPI" | "Card",
        remarks: note,
      });
      setExpenses((prev) => [created, ...prev]);
      setForm({ sub: "", amount: "", source: "Cash", remarks: "" });
      setShowForm(false);
      toast.success("Expense saved");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save expense"));
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (expense: AccountingExpense) => {
    if (isClosed) return;
    setActionId(expense.id);
    try {
      if (admin) {
        await deleteExpense(expense.id);
        setExpenses((prev) => prev.filter((x) => x.id !== expense.id));
        toast.success(
          expense.deleteRequested ? "Delete approved — expense removed" : "Expense deleted",
        );
      } else {
        const updated = await requestExpenseDelete(expense.id);
        setExpenses((prev) => prev.map((x) => (x.id === expense.id ? updated : x)));
        toast.success("Requested to admin");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete expense"));
    } finally {
      setActionId(null);
    }
  };

  const cancelDelete = async (expense: AccountingExpense) => {
    if (isClosed || !admin) return;
    setActionId(expense.id);
    try {
      const updated = await cancelExpenseDeleteRequest(expense.id);
      setExpenses((prev) => prev.map((x) => (x.id === expense.id ? updated : x)));
      toast.success("Delete request rejected");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to reject delete request"));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {isClosed && (
        <div className="rounded-xl border border-[#D4AF37]/30 bg-[#FAF8F2] px-4 py-3 flex items-center gap-2 text-[12px] text-[#6b6b6b]">
          <Lock className="h-4 w-4 text-[#D4AF37]" />
          Today is closed — expenses are read-only.
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {EXP_CATS.map((cat) => {
          const CIcon = EXP_ICONS[cat];
          const total = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
          return (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className={`flex items-center gap-2 h-10 px-4 rounded-xl text-[12px] font-semibold border transition-all ${
                activeCat === cat ? "bg-[#121212] text-[#D4AF37] border-[#121212]" : "bg-white text-[#6b6b6b] border-black/[0.07] hover:border-[#D4AF37]/30"
              }`}>
              <CIcon className="h-3.5 w-3.5" />
              {cat}
              {total > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeCat === cat ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-[#FAF8F2] text-[#6b6b6b]"}`}>₹{total.toLocaleString()}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-black/[0.07] bg-white shadow-sm">
          <Icon className="h-4 w-4 text-[#D4AF37]" />
          <span className="text-[13px] font-bold text-[#111118]">{activeCat} — ₹{catTotal.toLocaleString()}</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={isClosed}
          className={`${financeGoldBtn} flex items-center gap-1.5 disabled:opacity-40`}
        >
          <Plus className="h-3.5 w-3.5" /> Add {activeCat}
        </button>
      </div>

      {showForm && !isClosed && (
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#faf8f2] p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e]">New {activeCat} Expense</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sub-category *</p>
              <input value={form.sub} onChange={(e) => setForm((f) => ({ ...f, sub: e.target.value }))}
                placeholder={activeCat === "Operational" ? "e.g. Electricity" : activeCat === "Inventory" ? "e.g. Shampoo" : activeCat === "Payroll" ? "e.g. Advance" : "e.g. Cash to Bank"}
                className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Amount ₹ *</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-400">₹</span>
                <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-white text-[13px] font-bold focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:font-normal placeholder:text-gray-300" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payment Source</p>
              <div className="flex gap-1.5 p-1 rounded-xl bg-gray-100 border border-gray-200">
                {["Cash", "UPI", "Card"].map((s) => (
                  <button key={s} onClick={() => setForm((f) => ({ ...f, source: s }))}
                    className={`flex-1 h-8 rounded-lg text-[11px] font-bold transition-all ${form.source === s ? "bg-[#121212] text-[#D4AF37] shadow-sm" : "text-[#6b6b6b] hover:text-[#111118]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Note *</p>
              <input value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Required note…"
                className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
            <button onClick={() => void addExpense()} disabled={!form.sub || !form.amount || !form.remarks.trim() || saving}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[12px] font-bold text-black disabled:opacity-40 transition-all">
              {saving ? "Saving…" : "Save Expense"}
            </button>
          </div>
        </div>
      )}

      <div className={financePanel}>
        {loading ? (
          <div className="py-12 text-center text-[13px] text-[#9a9a9a]">Loading expenses…</div>
        ) : catExpenses.length === 0 ? (
          <div className="py-12 text-center">
            <Icon className="h-8 w-8 text-[#D4AF37]/30 mx-auto mb-2" />
            <p className="text-[13px] text-[#9a9a9a]">No {activeCat.toLowerCase()} expenses yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedExpenses.map((e) => (
              <div key={e.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#FAF8F2]/60 transition-colors">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${financeIconWrap}`}>
                  <Icon className="h-3.5 w-3.5 text-[#D4AF37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#111]">{e.sub}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">{e.source}</span>
                    <span className="text-[10px] text-gray-400">· {e.date}</span>
                    {e.remarks && <span className="text-[10px] text-gray-400 italic">· {e.remarks}</span>}
                  </div>
                </div>
                <p className="text-[14px] font-black text-[#111]">₹{e.amount.toLocaleString()}</p>
                {admin && e.deleteRequested ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void removeExpense(e)}
                      disabled={isClosed || actionId === e.id}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-bold text-emerald-800 disabled:opacity-30"
                    >
                      {actionId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancelDelete(e)}
                      disabled={isClosed || actionId === e.id}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 text-[10px] font-bold text-red-700 disabled:opacity-30"
                    >
                      <X className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                ) : !admin && e.deleteRequested ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                    Pending
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {!admin && e.deleteRejected ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase text-red-700">
                        Rejected by admin
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void removeExpense(e)}
                      disabled={isClosed || actionId === e.id}
                      className="h-7 w-7 rounded-lg border border-black/[0.07] flex items-center justify-center text-[#9a9a9a] hover:text-[#111118] hover:border-[#D4AF37]/30 transition-all disabled:opacity-30"
                    >
                      {actionId === e.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {catExpenses.length > 0 && (
          <Pagination
            page={expensesPagination.page}
            pageSize={expensesPagination.pageSize}
            totalRecords={catExpenses.length}
            onPageChange={expensesPagination.setPage}
            onPageSizeChange={expensesPagination.setPageSize}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CASH FLOW (RECONCILIATION)
───────────────────────────────────────────────────────── */
function CashFlowTab() {
  const { overview, loading } = useAccountingOverview();
  const [history, setHistory] = useState<DayCloseRecord[]>([]);
  const [physical, setPhysical] = useState({ cash: "", upi: "", card: "" });
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchDayCloses()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  const openingCash = overview?.openingCash ?? 0;
  const cashSales = overview?.cashSales ?? 0;
  const upiSales = overview?.upiSales ?? 0;
  const cardSales = overview?.cardSales ?? 0;
  const cashExpenses = overview?.cashExpenses ?? 0;
  const expectedCash = overview?.expectedCash ?? 0;
  const isClosed = overview?.isClosed ?? false;

  const physicalCash = Number(physical.cash) || 0;
  const variance = physicalCash - expectedCash;
  const hasMismatch = physical.cash !== "" && variance !== 0;

  const saveReconciliation = async () => {
    if (isClosed || physical.cash === "") return;
    if (hasMismatch && !remarks.trim()) return;
    setSaving(true);
    try {
      const row = await createDayClose({
        closingDate: TODAY,
        physicalCash,
        varianceNote: remarks.trim() || null,
        upiSettled: Number(physical.upi) || 0,
        cardSettled: Number(physical.card) || 0,
      });
      setHistory((prev) => [row, ...prev.filter((h) => h.closingDate !== row.closingDate)]);
      toast.success("Reconciliation saved — day closed");
      window.location.reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save reconciliation"));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !overview) {
    return <div className="py-16 text-center text-[13px] text-[#9a9a9a]">Loading cash flow…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FinancePanel title="System Ledger" subtitle="Immutable · Auto-calculated">
          <div className="divide-y divide-gray-100">
            {[
              { label: "Opening Cash", val: openingCash, sign: "" },
              { label: "Cash Sales", val: cashSales, sign: "+" },
              { label: "UPI Sales", val: upiSales, sign: "+" },
              { label: "Card Sales", val: cardSales, sign: "+" },
              { label: "Cash Expenses", val: cashExpenses, sign: "−" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between px-5 py-3 text-[13px]">
                <span className="text-[#6b6b6b]">{row.label}</span>
                <span className="font-bold text-[#111118]">
                  {row.sign}₹{row.val.toLocaleString()}
                </span>
              </div>
            ))}
            <div className="flex justify-between px-5 py-3.5 bg-[#FAF8F2]">
              <span className="text-[13px] font-bold text-[#111118]">Expected Cash</span>
              <span className="text-[15px] font-black text-[#D4AF37]">₹{expectedCash.toLocaleString()}</span>
            </div>
          </div>
        </FinancePanel>

        <FinancePanel title="Physical Count" subtitle={isClosed ? "Day already closed" : "Enter actual amounts collected"}>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: "Physical Cash in Drawer (₹)", key: "cash" as const, icon: Banknote },
              { label: "UPI Statement Total (₹)", key: "upi" as const, icon: Smartphone },
              { label: "Card Settlement Total (₹)", key: "card" as const, icon: CreditCard },
            ].map(({ label, key, icon: FieldIcon }) => (
              <div key={key} className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                <div className="relative">
                  <FieldIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                  <input type="number" value={physical[key]} disabled={isClosed}
                    onChange={(e) => setPhysical((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder="0"
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-bold focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300 disabled:opacity-50" />
                </div>
              </div>
            ))}

            {physical.cash !== "" && (
              <div className={`rounded-xl p-3.5 border border-black/[0.07] ${hasMismatch ? "bg-[#FAF8F2]" : "bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] font-bold ${hasMismatch ? "text-[#111118]" : "text-[#D4AF37]"}`}>
                    {hasMismatch ? "Cash Mismatch" : "Cash Balanced"}
                  </span>
                  <span className="text-[15px] font-black text-[#111118]">
                    {variance >= 0 ? "+" : ""}₹{variance.toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-[#9a9a9a] mt-0.5">Expected ₹{expectedCash.toLocaleString()} vs Physical ₹{physicalCash.toLocaleString()}</p>
              </div>
            )}

            {hasMismatch && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">Mismatch Explanation *</p>
                <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={isClosed}
                  placeholder="Explain the cash variance reason..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.07] bg-white text-[13px] resize-none focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/12 transition-all placeholder:text-[#9a9a9a] disabled:opacity-50" />
              </div>
            )}

            <button
              disabled={isClosed || physical.cash === "" || (hasMismatch && !remarks.trim()) || saving}
              onClick={() => void saveReconciliation()}
              className={`w-full ${financeGoldBtn} disabled:opacity-40`}
            >
              {isClosed ? "Already Closed" : saving ? "Saving…" : "Save Reconciliation"}
            </button>
          </div>
        </FinancePanel>
      </div>

      <div className={financePanel}>
        <div className={`${financePanelHeader} border-b border-black/[0.07]`}>
          <p className={financePanelTitle}>Reconciliation History</p>
        </div>
        {history.length === 0 ? (
          <div className="py-10 text-center text-[#9a9a9a] text-[13px]">No past reconciliations found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((h) => (
              <div key={h.id} className="px-5 py-3.5 flex items-center justify-between text-[13px]">
                <div>
                  <p className="font-semibold text-[#111118]">{h.closingDate}</p>
                  <p className="text-[11px] text-[#9a9a9a]">{h.closedBy ?? "—"} · variance ₹{h.variance.toLocaleString()}</p>
                </div>
                <p className="font-black text-[#D4AF37]">₹{h.physicalCash.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DAY CLOSE — 5-STEP STEPPER
───────────────────────────────────────────────────────── */
const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

function ClosingTab() {
  const { overview, loading, reload } = useAccountingOverview();
  const [step, setStep] = useState(0);
  const [closedCash, setClosedCash] = useState<number | null>(null);
  const [upiSettled, setUpiSettled] = useState("");
  const [cardSettled, setCardSettled] = useState("");
  const [bankDrop, setBankDrop] = useState("");
  const [denoms, setDenoms] = useState<Record<number, string>>({});
  const [varianceNote, setVarianceNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (overview?.isClosed && overview.dayClose) {
      setClosedCash(overview.dayClose.physicalCash);
    }
  }, [overview]);

  const openingCash = overview?.openingCash ?? 0;
  const cashSales = overview?.cashSales ?? 0;
  const upiSales = overview?.upiSales ?? 0;
  const cardSales = overview?.cardSales ?? 0;
  const totalExpenses = overview?.totalExpenses ?? 0;
  const expectedCash = overview?.expectedCash ?? 0;

  const physicalCash = DENOMINATIONS.reduce((s, d) => s + (Number(denoms[d]) || 0) * d, 0);
  const variance = physicalCash - expectedCash;
  const canProceedStep3 = physicalCash > 0;
  const canProceedStep4 = variance === 0 || varianceNote.trim().length > 0;

  const STEPS = ["System Summary", "Settlement Entry", "Cash Count", "Variance Check", "Day Close"];

  const sealDay = async () => {
    setSaving(true);
    try {
      const denomCounts: Record<string, number> = {};
      for (const d of DENOMINATIONS) {
        const qty = Number(denoms[d]) || 0;
        if (qty > 0) denomCounts[String(d)] = qty;
      }
      const row = await createDayClose({
        closingDate: TODAY,
        physicalCash,
        varianceNote: varianceNote.trim() || null,
        upiSettled: Number(upiSettled) || 0,
        cardSettled: Number(cardSettled) || 0,
        bankDrop: Number(bankDrop) || 0,
        denomCounts,
      });
      setClosedCash(row.physicalCash);
      toast.success("Day closed successfully");
      await reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to close day"));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !overview) {
    return <div className="py-16 text-center text-[13px] text-[#9a9a9a]">Loading day close…</div>;
  }

  if (closedCash != null || overview?.isClosed) {
    const cash = closedCash ?? overview?.dayClose?.physicalCash ?? 0;
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className={`h-20 w-20 rounded-full flex items-center justify-center ${financeIconWrap} !h-20 !w-20`}>
          <Lock className="h-10 w-10 text-[#D4AF37]" />
        </div>
        <div className="text-center">
          <p className="text-[22px] font-black text-[#111118]">Day Closed Successfully</p>
          <p className="text-[13px] text-[#6b6b6b] mt-1">All records locked · Tomorrow opens with ₹{cash.toLocaleString()}</p>
        </div>
        <div className={`${financePanel} px-8 py-4 text-center`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b6b]">Closing Cash</p>
          <p className="text-[32px] font-black text-[#111118]">₹{cash.toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-0 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all shrink-0 ${
                i < step ? "bg-[#D4AF37] border-[#D4AF37] text-black"
                  : i === step ? "bg-[#121212] border-[#121212] text-[#D4AF37]"
                  : "bg-white border-black/[0.07] text-[#9a9a9a]"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <p className={`text-[10px] font-semibold text-center whitespace-nowrap ${i === step ? "text-[#111118]" : i < step ? "text-[#D4AF37]" : "text-[#9a9a9a]"}`}>{s}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-5 transition-all ${i < step ? "bg-[#D4AF37]" : "bg-black/[0.06]"}`} />
            )}
          </div>
        ))}
      </div>

      <div className={financePanel}>
        {step === 0 && (
          <div>
            <div className={`${financePanelHeader} border-b border-black/[0.07]`}>
              <div>
                <p className="text-[14px] font-bold text-[#111118]">Step 1 — System Summary</p>
                <p className="text-[11px] text-[#9a9a9a] mt-0.5">Read-only view of all balances for today</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { label: "Opening Cash", val: openingCash },
                { label: "Cash Sales", val: cashSales },
                { label: "UPI Sales", val: upiSales },
                { label: "Card Sales", val: cardSales },
                { label: "Total Expenses", val: totalExpenses },
                { label: "Expected Cash in Drawer", val: expectedCash },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-5 py-3.5 text-[13px]">
                  <span className="text-[#6b6b6b]">{row.label}</span>
                  <span className="font-black text-[#111118]">₹{row.val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className={`${financePanelHeader} border-b border-black/[0.07]`}>
              <div>
                <p className="text-[14px] font-bold text-[#111118]">Step 2 — Settlement Entry</p>
                <p className="text-[11px] text-[#9a9a9a] mt-0.5">Log confirmed digital payment settlements</p>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              {[
                { label: "UPI Settlement Confirmed (₹)", state: upiSettled, setter: setUpiSettled, icon: Smartphone },
                { label: "Card Settlement Confirmed (₹)", state: cardSettled, setter: setCardSettled, icon: CreditCard },
                { label: "Bank Drop Amount (₹)", state: bankDrop, setter: setBankDrop, icon: Banknote },
              ].map(({ label, state, setter, icon: FieldIcon }) => (
                <div key={label} className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                  <div className="relative">
                    <FieldIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                    <input type="number" value={state} onChange={(e) => setter(e.target.value)} placeholder="0"
                      className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-bold focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className={`${financePanelHeader} border-b border-black/[0.07]`}>
              <div>
                <p className="text-[14px] font-bold text-[#111118]">Step 3 — Physical Cash Count</p>
                <p className="text-[11px] text-[#9a9a9a] mt-0.5">Count notes and coins in the drawer</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {DENOMINATIONS.map((d) => (
                  <div key={d} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[11px] font-bold text-gray-500 mb-1.5">₹{d}</p>
                    <input type="number" min="0" value={denoms[d] ?? ""}
                      onChange={(e) => setDenoms((prev) => ({ ...prev, [d]: e.target.value }))}
                      placeholder="0"
                      className="w-full h-9 px-2.5 rounded-lg border border-gray-200 bg-white text-[13px] font-bold text-center focus:outline-none focus:border-[#d4af37] transition-all placeholder:font-normal placeholder:text-gray-300" />
                    <p className="text-[10px] text-[#b8962e] mt-1 text-center font-semibold">
                      = ₹{((Number(denoms[d]) || 0) * d).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-black/[0.07] bg-[#FAF8F2] px-5 py-3.5 flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#6b6b6b]">Total Physical Cash</span>
                <span className="text-[22px] font-black text-[#D4AF37]">₹{physicalCash.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className={`${financePanelHeader} border-b border-black/[0.07]`}>
              <div>
                <p className="text-[14px] font-bold text-[#111118]">Step 4 — Variance Validation</p>
                <p className="text-[11px] text-[#9a9a9a] mt-0.5">System vs Physical comparison</p>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#FAF8F2] border border-black/[0.07] p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-1">System Expected</p>
                  <p className="text-[22px] font-black text-[#111118]">₹{expectedCash.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-[#FAF8F2] border border-black/[0.07] p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-1">Physically Counted</p>
                  <p className="text-[22px] font-black text-[#111118]">₹{physicalCash.toLocaleString()}</p>
                </div>
              </div>

              <div className="rounded-xl p-4 border border-black/[0.07] bg-white text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1 text-[#6b6b6b]">
                  {variance === 0 ? "Perfect Match" : "Variance Detected"}
                </p>
                <p className="text-[26px] font-black text-[#111118]">
                  {variance >= 0 ? "+" : ""}₹{variance.toLocaleString()}
                </p>
              </div>

              {variance !== 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b6b]">Variance Explanation *</p>
                  <textarea rows={3} value={varianceNote} onChange={(e) => setVarianceNote(e.target.value)}
                    placeholder="Explain the reason for cash mismatch..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.07] bg-white text-[13px] resize-none focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/12 transition-all placeholder:text-[#9a9a9a]" />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className={`${financePanelHeader} border-b border-black/[0.07]`}>
              <div>
                <p className="text-[14px] font-bold text-[#111118]">Step 5 — Final Day Close</p>
                <p className="text-[11px] text-[#9a9a9a] mt-0.5">This will lock all records for today</p>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="rounded-2xl bg-[#faf8f2] border border-[#d4af37]/20 p-5 space-y-2">
                {[
                  { label: "Total Revenue", val: `₹${(cashSales + upiSales + cardSales).toLocaleString()}` },
                  { label: "Total Expenses", val: `₹${totalExpenses.toLocaleString()}` },
                  { label: "Net Profit", val: `₹${(cashSales + upiSales + cardSales - totalExpenses).toLocaleString()}` },
                  { label: "Closing Cash", val: `₹${physicalCash.toLocaleString()}` },
                  { label: "Tomorrow Opening", val: `₹${physicalCash.toLocaleString()}` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-[13px] py-1 border-b border-[#d4af37]/10 last:border-0">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-black text-[#111]">{row.val}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF8F2] border border-black/[0.07]">
                <AlertTriangle className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#6b6b6b]">This will lock expenses for {TODAY}. Sales continue to come from invoices.</p>
              </div>
              <button onClick={() => void sealDay()} disabled={saving}
                className={`w-full h-12 rounded-xl ${financeGoldBtn} flex items-center justify-center gap-2 !text-[14px] disabled:opacity-40`}>
                <Lock className="h-5 w-5" /> {saving ? "Sealing…" : "Seal Day Close"}
              </button>
            </div>
          </div>
        )}

        <div className="px-5 py-4 border-t border-black/[0.07] bg-[#FAF8F2] flex items-center justify-between">
          <button disabled={step === 0} onClick={() => setStep((s) => s - 1)}
            className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all">
            ← Back
          </button>
          {step < 4 && (
            <button
              disabled={(step === 2 && !canProceedStep3) || (step === 3 && !canProceedStep4)}
              onClick={() => setStep((s) => s + 1)}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[12px] font-bold text-black disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md shadow-[#d4af37]/20">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   REPORTS
───────────────────────────────────────────────────────── */
function ReportsTab() {
  const { overview, loading } = useAccountingOverview();

  const totalRevenue = overview?.period.revenue ?? 0;
  const totalGST = overview?.period.gstCollected ?? 0;
  const totalExpenses = overview?.period.expenses ?? 0;
  const netProfit = overview?.period.netProfit ?? 0;
  const weekly = overview?.weekly ?? [];
  const maxRev = Math.max(...weekly.map((w) => Math.max(w.revenue, w.expenses)), 1);

  if (loading && !overview) {
    return <div className="py-16 text-center text-[13px] text-[#9a9a9a]">Loading reports…</div>;
  }

  return (
    <div className="space-y-5">
      <FinanceStatGrid>
        <FinanceStatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={TrendingUp} index={0} />
        <FinanceStatCard label="Total Expenses" value={`₹${totalExpenses.toLocaleString()}`} icon={TrendingDown} index={1} />
        <FinanceStatCard label="Net Profit" value={`₹${netProfit.toLocaleString()}`} icon={IndianRupee} index={2} />
        <FinanceStatCard label="GST Collected" value={`₹${totalGST.toLocaleString()}`} icon={Receipt} index={3} />
      </FinanceStatGrid>

      <div className={`${financePanel} p-4`}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-[13px] font-bold text-[#111118]">Revenue vs Expenses — Last 7 Days</p>
          <div className="flex gap-3 text-[10px]">
            <div className="flex items-center gap-1"><div className="h-2 w-4 rounded-full bg-[#D4AF37]" /><span className="text-[#6b6b6b]">Revenue</span></div>
            <div className="flex items-center gap-1"><div className="h-2 w-4 rounded-full bg-[#121212]/30" /><span className="text-[#6b6b6b]">Expenses</span></div>
          </div>
        </div>
        <div className="flex items-end gap-2 h-32">
          {weekly.map((w) => (
            <div key={w.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end" style={{ height: "100px" }}>
                <div className="flex-1 rounded-t-md bg-[#D4AF37]/70 transition-all" style={{ height: `${(w.revenue / maxRev) * 100}%` }} />
                <div className="flex-1 rounded-t-md bg-[#121212]/25 transition-all" style={{ height: `${(w.expenses / maxRev) * 100}%` }} />
              </div>
              <p className="text-[10px] text-[#9a9a9a] font-semibold">{w.day}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`${financePanel} p-4`}>
        <p className="text-[13px] font-bold text-[#111118] mb-4">GST Summary (This Month)</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "GST Collected", val: totalGST },
            { label: "GST Paid (Expenses)", val: Math.round(totalExpenses * 0.18) },
            { label: "Net GST Liability", val: totalGST - Math.round(totalExpenses * 0.18) },
          ].map((g) => (
            <div key={g.label} className="rounded-xl bg-[#FAF8F2] border border-black/[0.07] p-3.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a] mb-1">{g.label}</p>
              <p className="text-[18px] font-black text-[#111118]">₹{g.val.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PLANNING / BUDGET
───────────────────────────────────────────────────────── */
function PlanningTab() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [budgets, setBudgets] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "fixed" as "fixed" | "variable", allocated: "" });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const period = await fetchBudget(year, month);
      setBudgets(period.lines);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load budget"));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const fixed = budgets.filter((b) => b.type === "fixed");
  const variable = budgets.filter((b) => b.type === "variable");
  const totalAllocated = budgets.reduce((s, b) => s + b.allocated, 0);
  const totalUsed = budgets.reduce((s, b) => s + b.used, 0);
  const burnPct = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

  const fixedPagination = useTablePagination(fixed.length);
  const variablePagination = useTablePagination(variable.length);
  const paginatedFixed = useMemo(() => fixedPagination.paginate(fixed), [fixed, fixedPagination]);
  const paginatedVariable = useMemo(() => variablePagination.paginate(variable), [variable, variablePagination]);

  const persistLines = async (lines: BudgetLine[]) => {
    setSaving(true);
    try {
      const period = await upsertBudget({
        year,
        month,
        lines: lines.map((l) => ({
          name: l.name,
          type: l.type,
          allocated: l.allocated,
        })),
      });
      setBudgets(period.lines);
      toast.success("Budget saved");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save budget"));
      await load();
    } finally {
      setSaving(false);
    }
  };

  const addBudget = async () => {
    if (!form.name || !form.allocated) return;
    const next: BudgetLine[] = [
      ...budgets,
      {
        id: `tmp-${Date.now()}`,
        name: form.name,
        type: form.type,
        allocated: Number(form.allocated),
        used: 0,
      },
    ];
    setForm({ name: "", type: "fixed", allocated: "" });
    setShowForm(false);
    await persistLines(next);
  };

  const BudgetRow = ({ b }: { b: BudgetLine }) => {
    const pct = b.allocated > 0 ? Math.round((b.used / b.allocated) * 100) : 0;
    return (
      <div className="px-5 py-4 hover:bg-[#FAF8F2]/60 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold text-[#111118]">{b.name}</p>
          <div className="text-right">
            <p className="text-[13px] font-black text-[#111118]">₹{b.used.toLocaleString()} <span className="text-[11px] font-normal text-[#9a9a9a]">/ ₹{b.allocated.toLocaleString()}</span></p>
            {pct >= 100 && <span className="text-[10px] font-bold text-[#6b6b6b]">Exceeded</span>}
            {pct >= 80 && pct < 100 && <span className="text-[10px] font-bold text-[#D4AF37]">{pct}% used</span>}
          </div>
        </div>
        <div className={financeProgressTrack}>
          <div className={financeProgressFill} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] text-gray-400">Remaining: ₹{Math.max(0, b.allocated - b.used).toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">{pct}%</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <FinanceStatGrid>
        <FinanceStatCard label="Allocated" value={`₹${totalAllocated.toLocaleString()}`} icon={PiggyBank} index={0} />
        <FinanceStatCard label="Used" value={`₹${totalUsed.toLocaleString()}`} icon={TrendingDown} index={1} />
        <FinanceStatCard label="Remaining" value={`₹${Math.max(0, totalAllocated - totalUsed).toLocaleString()}`} icon={IndianRupee} index={2} />
        <FinanceStatCard label="Burn" value={`${burnPct}%`} icon={BarChart3} index={3} />
      </FinanceStatGrid>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} disabled={saving} className={`${financeGoldBtn} flex items-center gap-1.5`}>
          <Plus className="h-3.5 w-3.5" /> Add Budget Line
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#faf8f2] p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name (e.g. Operational or Rent)"
              className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] focus:outline-none focus:border-[#d4af37]" />
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "fixed" | "variable" }))}
              className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px]">
              <option value="fixed">Fixed</option>
              <option value="variable">Variable</option>
            </select>
            <input type="number" value={form.allocated} onChange={(e) => setForm((f) => ({ ...f, allocated: e.target.value }))}
              placeholder="Allocated ₹"
              className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] font-bold focus:outline-none focus:border-[#d4af37]" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-xl border text-[12px] font-semibold">Cancel</button>
            <button onClick={() => void addBudget()} disabled={!form.name || !form.allocated || saving}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[12px] font-bold text-black disabled:opacity-40">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[13px] text-[#9a9a9a]">Loading budget…</div>
      ) : (
        [
          { label: "Fixed Costs", sub: "Recurring monthly", items: paginatedFixed, total: fixed.length, pagination: fixedPagination },
          { label: "Variable Costs", sub: "Usage-based", items: paginatedVariable, total: variable.length, pagination: variablePagination },
        ].map((section) => (
          <div key={section.label} className={financePanel}>
            <div className={`${financePanelHeader} border-b border-black/[0.07]`}>
              <div>
                <p className={financePanelTitle}>{section.label}</p>
                <p className="text-[10px] text-[#9a9a9a]">{section.sub}</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {section.items.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[#9a9a9a]">No lines yet</p>
              ) : (
                section.items.map((b) => <BudgetRow key={b.id} b={b} />)
              )}
            </div>
            {section.total > 0 && (
              <Pagination
                page={section.pagination.page}
                pageSize={section.pagination.pageSize}
                totalRecords={section.total}
                onPageChange={section.pagination.setPage}
                onPageSizeChange={section.pagination.setPageSize}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN ACCOUNTING MODULE
───────────────────────────────────────────────────────── */
const ACC_TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "expenses", label: "Expenses", icon: TrendingDown },
  { id: "cashflow", label: "Cash Flow", icon: ArrowLeftRight },
  { id: "closing", label: "Closing", icon: Lock },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "planning", label: "Planning", icon: PiggyBank },
] as const;

type AccTab = typeof ACC_TABS[number]["id"];

export function FinanceAccountingModule() {
  const [active, setActive] = useState<AccTab>("overview");

  return (
    <div className="space-y-4">
      <SegmentedPillNav
        items={ACC_TABS.map(({ id, label, icon }) => ({ id, label, icon }))}
        value={active}
        onChange={setActive}
      />

      {active === "overview" && <AccountingOverview />}
      {active === "expenses" && <ExpensesTab />}
      {active === "cashflow" && <CashFlowTab />}
      {active === "closing" && <ClosingTab />}
      {active === "reports" && <ReportsTab />}
      {active === "planning" && <PlanningTab />}
    </div>
  );
}
