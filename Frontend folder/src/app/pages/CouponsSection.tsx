import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../components/ui/utils";
import {
  Dialog, DialogContent,
} from "../components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "../components/ui/table";
import {
  Tag, Plus, Pencil, Trash2, Search, Send, Copy, Percent, IndianRupee, Users, Ticket,
} from "lucide-react";
import { useCoupons, type Coupon, type CouponType, type CouponStatus } from "../context/CouponsContext";
import { sendCouponWhatsApp } from "../../api/messaging";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "../components/ui/hot-toast";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { istDateKey } from "../../lib/istDate";

const todayISO = istDateKey();

const emptyForm = {
  code: "",
  title: "",
  description: "",
  type: "percentage" as CouponType,
  value: "",
  minSpend: "",
  maxDiscount: "",
  validFrom: todayISO,
  validTill: "",
  usageLimit: "",
  applicableTo: "all",
  status: "active" as CouponStatus,
};

function statusBadge(status: CouponStatus, validTill: string) {
  const expired = new Date(validTill) < new Date();
  if (status === "disabled") {
    return <Badge className="border border-black/[0.08] bg-[#f4f2ed] text-[10px] font-semibold text-[#9a9a9a]">Disabled</Badge>;
  }
  if (expired) {
    return <Badge className="border border-red-200 bg-red-50 text-[10px] font-semibold text-red-500">Expired</Badge>;
  }
  return <Badge className="border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[10px] font-semibold text-[#9a7d20]">Active</Badge>;
}

export function CouponsSection() {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useCoupons();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [sendTarget, setSendTarget] = useState<Coupon | null>(null);
  const [sendPhone, setSendPhone] = useState("");
  const [sendName, setSendName] = useState("");

  const filtered = useMemo(
    () =>
      coupons.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.title.toLowerCase().includes(search.toLowerCase())
      ),
    [coupons, search]
  );

  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(
    filtered.length,
    [search],
  );
  const paginatedCoupons = useMemo(() => paginate(filtered), [filtered, paginate]);

  const activeCount = useMemo(
    () => coupons.filter((c) => c.status === "active" && new Date(c.validTill) >= new Date()).length,
    [coupons]
  );
  const totalRedemptions = useMemo(() => coupons.reduce((s, c) => s + c.usedCount, 0), [coupons]);
  const totalSent = useMemo(() => coupons.reduce((s, c) => s + c.sentTo.length, 0), [coupons]);

  function resetForm() {
    setForm(emptyForm);
    setShowAdd(false);
  }

  function generateCode() {
    setForm((f) => ({ ...f, code: `LUXE${Math.random().toString(36).substring(2, 7).toUpperCase()}` }));
  }

  function handleCreate() {
    if (!form.code.trim() || !form.title.trim() || !form.value || !form.validTill) return;
    addCoupon({
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      value: Number(form.value),
      minSpend: form.minSpend ? Number(form.minSpend) : 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      validFrom: form.validFrom,
      validTill: form.validTill,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : 0,
      status: form.status,
      applicableTo: form.applicableTo,
    });
    resetForm();
  }

  function saveEdit() {
    if (!editing) return;
    updateCoupon(editing.id, editing);
    setEditing(null);
  }

  function openSend(c: Coupon) {
    setSendTarget(c);
    setSendName("");
    setSendPhone("");
  }

  async function sendCoupon(channel: "whatsapp" | "sms") {
    if (!sendTarget || !sendPhone.trim()) return;

    if (channel !== "whatsapp") {
      toast.error("SMS sending is disabled — use WhatsApp");
      return;
    }

    const valueLabel =
      sendTarget.type === "percentage"
        ? `${sendTarget.value} percent OFF`
        : `Rs.${sendTarget.value} OFF`;

    try {
      await sendCouponWhatsApp({
        phone: sendPhone.trim(),
        code: sendTarget.code,
        valueLabel,
        validUntil: sendTarget.validTill,
        customerName: sendName.trim() || undefined,
      });
      toast.success(`Coupon ${sendTarget.code} sent on WhatsApp`);
      setSendTarget(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send coupon on WhatsApp"));
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">Promotions & Discounts</p>
          <p className="text-[13px] text-[#9a9a9a]">Create, manage, and send discount coupons to customers</p>
        </div>
        <Button
          className="h-9 rounded-xl bg-[#111118] text-[#D4AF37] hover:bg-[#1a1a1a] shadow-sm"
          onClick={() => {
            generateCode();
            setShowAdd(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total Coupons", value: String(coupons.length), sub: `${activeCount} currently active`, Icon: Ticket },
          { label: "Active Coupons", value: String(activeCount), sub: "valid & enabled", Icon: Tag },
          { label: "Total Redemptions", value: String(totalRedemptions), sub: "times used", Icon: Percent },
          { label: "Sent to Customers", value: String(totalSent), sub: "via SMS & WhatsApp", Icon: Users },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-xl border border-black/[0.07] bg-white shadow-sm transition-all duration-300 hover:shadow-[0_12px_32px_rgba(17,17,24,0.08)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.06),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-start justify-between p-3.5">
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b6b6b]">{kpi.label}</p>
                <p className="mt-1 text-xl font-bold leading-tight text-[#111118] tabular-nums">{kpi.value}</p>
                <p className="mt-1 text-[11px] text-[#9a9a9a]">{kpi.sub}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                <kpi.Icon className="h-4 w-4 text-[#D4AF37]" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-black/[0.07] bg-white p-3 shadow-sm">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37]" />
          <input
            placeholder="Search coupons by code or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-black/[0.08] bg-[#fafaf8] pl-9 pr-3 text-[13px] text-[#111118] outline-none transition-all placeholder:text-[#9a9a9a] focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
          />
        </div>
        <span className="ml-auto text-[11px] font-medium text-[#9a9a9a]">
          {filtered.length} coupon{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-white shadow-sm">
        <div className="flex items-center gap-3 bg-[#111118] px-5 py-3.5">
          <Tag className="h-4 w-4 text-[#D4AF37]" />
          <p className="text-[13px] font-bold text-white">All Coupons</p>
          <Badge className="ml-auto border border-white/20 bg-white/10 text-[10px] font-semibold text-white">
            {filtered.length} of {coupons.length}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-black/[0.06] bg-[#faf9f7] hover:bg-[#faf9f7]">
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Code</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Title</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Discount</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Validity</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Usage</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Status</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCoupons.map((c) => (
                <TableRow key={c.id} className="border-black/[0.04] hover:bg-[#faf9f7]/80">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-[#D4AF37]/20 bg-[#D4AF37]/8 px-2 py-0.5 font-mono text-[12px] font-bold text-[#111118]">
                        {c.code}
                      </span>
                      <button
                        type="button"
                        title="Copy code"
                        onClick={() => navigator.clipboard?.writeText(c.code)}
                        className="text-[#9a9a9a] transition-colors hover:text-[#D4AF37]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-[13px] font-semibold text-[#111118]">{c.title}</p>
                    {c.description && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[#9a9a9a]">{c.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-[13px] font-semibold text-[#111118]">
                      {c.type === "percentage" ? (
                        <>
                          <Percent className="h-3.5 w-3.5 text-[#D4AF37]" />
                          {c.value}% off{c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ""}
                        </>
                      ) : (
                        <>
                          <IndianRupee className="h-3.5 w-3.5 text-[#D4AF37]" />
                          ₹{c.value} off
                        </>
                      )}
                    </span>
                    {c.minSpend > 0 && (
                      <p className="mt-0.5 text-[11px] text-[#9a9a9a]">Min spend ₹{c.minSpend}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-[11px] text-[#6b6b6b]">
                    {c.validFrom} → {c.validTill}
                  </TableCell>
                  <TableCell className="text-[11px] text-[#6b6b6b]">
                    <span className="font-semibold text-[#111118]">{c.usedCount}</span>
                    {c.usageLimit > 0 ? ` / ${c.usageLimit}` : " / ∞"}
                    <p className="text-[#9a9a9a]">{c.sentTo.length} sent</p>
                  </TableCell>
                  <TableCell>{statusBadge(c.status, c.validTill)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-[#D4AF37]/30 text-[#9a7d20] hover:bg-[#D4AF37]/8"
                        onClick={() => openSend(c)}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-black/[0.08] hover:border-[#D4AF37]/40 hover:bg-[#faf9f7]"
                        onClick={() => setEditing({ ...c })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-red-200 text-red-500 hover:bg-red-50"
                        onClick={() => deleteCoupon(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-black/[0.1] bg-[#faf9f7]">
                      <Tag className="h-5 w-5 text-[#D4AF37]/35" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#111118]">No coupons found</p>
                    <p className="mt-1 text-[11px] text-[#9a9a9a]">Try adjusting your search or create a new coupon.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-black/[0.06] px-4 py-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Create Coupon Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => (open ? setShowAdd(true) : resetForm())}>
        <DialogContent className="w-[min(95vw,36rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <Tag className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Create Coupon</p>
                <p className="text-gray-500 text-[11px] mt-0.5">Set up a new discount coupon to send to customers</p>
              </div>
            </div>
            <button onClick={resetForm} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto bg-[#faf9f7] px-6 py-5">

            {/* Coupon code + title */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Coupon Code <span className="text-[#d4af37]">*</span></p>
                <div className="flex gap-2">
                  <input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SUMMER25"
                    className="flex-1 min-w-0 h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-mono font-bold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300"
                  />
                  <button type="button" onClick={generateCode}
                    className="h-10 px-3 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/08 text-[11px] font-bold text-[#9a7d20] hover:bg-[#d4af37]/15 transition-all whitespace-nowrap">
                    Generate
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Title <span className="text-[#d4af37]">*</span></p>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Summer Special"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description</p>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Shown to customers when sent..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] resize-none focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
              />
            </div>

            {/* Discount type + value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Discount Type</p>
                <div className="flex gap-1.5 rounded-xl border border-black/[0.08] bg-[#f4f2ed] p-1">
                  {([{ v: "percentage", label: "% Percent" }, { v: "flat", label: "₹ Flat" }] as const).map(({ v, label }) => (
                    <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, type: v as CouponType }))}
                      className={cn("flex-1 h-8 rounded-lg text-[11px] font-bold transition-all", form.type === v ? "bg-[#111118] text-[#D4AF37] shadow-sm" : "text-[#9a9a9a] hover:text-[#111118]")}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {form.type === "percentage" ? "Percentage (%)" : "Amount (₹)"} <span className="text-[#d4af37]">*</span>
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-400">
                    {form.type === "percentage" ? "%" : "₹"}
                  </span>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    placeholder={form.type === "percentage" ? "20" : "500"}
                    className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] font-bold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:font-normal placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Min spend + max cap */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Min. Spend (₹)</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                  <input type="number" value={form.minSpend}
                    onChange={(e) => setForm((f) => ({ ...f, minSpend: e.target.value }))}
                    placeholder="0"
                    className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
              {form.type === "percentage" && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Max Discount Cap (₹)</p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                    <input type="number" value={form.maxDiscount}
                      onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                      placeholder="Optional"
                      className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Valid dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Valid From</p>
                <input type="date" value={form.validFrom}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Valid Till <span className="text-[#d4af37]">*</span></p>
                <input type="date" value={form.validTill}
                  onChange={(e) => setForm((f) => ({ ...f, validTill: e.target.value }))}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Usage limit + status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Usage Limit <span className="text-gray-400 normal-case font-normal">(0 = unlimited)</span></p>
                <input type="number" value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="0"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 focus:bg-white transition-all placeholder:text-gray-300"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</p>
                <div className="flex gap-1.5 rounded-xl border border-black/[0.08] bg-[#f4f2ed] p-1">
                  {([{ v: "active", label: "Active" }, { v: "disabled", label: "Disabled" }] as const).map(({ v, label }) => (
                    <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, status: v as CouponStatus }))}
                      className={cn("flex-1 h-8 rounded-lg text-[11px] font-bold transition-all", form.status === v ? "bg-[#111118] text-[#D4AF37] shadow-sm" : "text-[#9a9a9a] hover:text-[#111118]")}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] bg-white px-6 py-4">
            <button onClick={resetForm}
              className="h-10 rounded-xl border border-black/[0.08] bg-white px-5 text-[13px] font-semibold text-[#6b6b6b] transition-all hover:bg-[#faf9f7]">
              Cancel
            </button>
            <button onClick={handleCreate}
              disabled={!form.code.trim() || !form.title.trim() || !form.value || !form.validTill}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#111118] px-6 text-[13px] font-bold text-[#D4AF37] transition-all disabled:opacity-40">
              <Plus className="h-4 w-4" /> Create Coupon
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="w-[min(95vw,36rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <Pencil className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Edit Coupon</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{editing?.code} — update details, validity or status</p>
              </div>
            </div>
            <button onClick={() => setEditing(null)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          {editing && (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto bg-[#faf9f7] px-6 py-5">

              {/* Code + Title */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Coupon Identity</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Coupon Code <span className="text-[#d4af37]">*</span></p>
                    <input
                      value={editing.code}
                      onChange={(e) => setEditing((cur) => cur && { ...cur, code: e.target.value.toUpperCase() })}
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] font-mono font-bold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Title <span className="text-[#d4af37]">*</span></p>
                    <input
                      value={editing.title}
                      onChange={(e) => setEditing((cur) => cur && { ...cur, title: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description</p>
                <textarea
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing((cur) => cur && { ...cur, description: e.target.value })}
                  placeholder="Shown to customers when sent..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] resize-none focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Discount */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Discount</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Discount Type</p>
                    <div className="flex gap-1.5 rounded-xl border border-black/[0.08] bg-[#f4f2ed] p-1">
                      {([{ v: "percentage", label: "% Percent" }, { v: "flat", label: "₹ Flat" }] as const).map(({ v, label }) => (
                        <button key={v} type="button"
                          onClick={() => setEditing((cur) => cur && { ...cur, type: v as CouponType })}
                          className={cn("flex-1 h-8 rounded-lg text-[11px] font-bold transition-all", editing.type === v ? "bg-[#111118] text-[#D4AF37] shadow-sm" : "text-[#9a9a9a] hover:text-[#111118]")}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      {editing.type === "percentage" ? "Percentage (%)" : "Amount (₹)"} <span className="text-[#d4af37]">*</span>
                    </p>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-400">
                        {editing.type === "percentage" ? "%" : "₹"}
                      </span>
                      <input type="number" value={editing.value}
                        onChange={(e) => setEditing((cur) => cur && { ...cur, value: Number(e.target.value) })}
                        className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-white text-[13px] font-bold text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Min. Spend (₹)</p>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                      <input type="number" value={editing.minSpend}
                        onChange={(e) => setEditing((cur) => cur && { ...cur, minSpend: Number(e.target.value) })}
                        placeholder="0"
                        className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                  {editing.type === "percentage" && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Max Discount Cap (₹)</p>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₹</span>
                        <input type="number" value={editing.maxDiscount ?? ""}
                          onChange={(e) => setEditing((cur) => cur && { ...cur, maxDiscount: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="Optional"
                          className="w-full h-10 pl-8 pr-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Validity */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Validity</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Valid From</p>
                    <input type="date" value={editing.validFrom}
                      onChange={(e) => setEditing((cur) => cur && { ...cur, validFrom: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Valid Till <span className="text-[#d4af37]">*</span></p>
                    <input type="date" value={editing.validTill}
                      onChange={(e) => setEditing((cur) => cur && { ...cur, validTill: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Usage & Status */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Usage & Status</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Usage Limit <span className="text-gray-400 normal-case font-normal">(0 = ∞)</span></p>
                    <input type="number" value={editing.usageLimit}
                      onChange={(e) => setEditing((cur) => cur && { ...cur, usageLimit: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</p>
                    <div className="flex gap-1.5 rounded-xl border border-black/[0.08] bg-[#f4f2ed] p-1">
                      {([{ v: "active", label: "Active" }, { v: "disabled", label: "Disabled" }] as const).map(({ v, label }) => (
                        <button key={v} type="button"
                          onClick={() => setEditing((cur) => cur && { ...cur, status: v as CouponStatus })}
                          className={cn("flex-1 h-8 rounded-lg text-[11px] font-bold transition-all", editing.status === v ? "bg-[#111118] text-[#D4AF37] shadow-sm" : "text-[#9a9a9a] hover:text-[#111118]")}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Usage stats read-only */}
                <div className="mt-3 flex gap-3">
                  <div className="flex-1 rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-center">
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Used</p>
                    <p className="text-lg font-bold text-[#111118]">{editing.usedCount}</p>
                  </div>
                  <div className="flex-1 rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-center">
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9a9a9a]">Sent To</p>
                    <p className="text-lg font-bold text-[#111118]">{editing.sentTo.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] bg-white px-6 py-4">
            <button onClick={() => setEditing(null)}
              className="h-10 rounded-xl border border-black/[0.08] bg-white px-5 text-[13px] font-semibold text-[#6b6b6b] transition-all hover:bg-[#faf9f7]">
              Cancel
            </button>
            <button onClick={saveEdit}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#111118] px-6 text-[13px] font-bold text-[#D4AF37] transition-all">
              <Pencil className="h-3.5 w-3.5" /> Save Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Coupon Dialog */}
      <Dialog open={!!sendTarget} onOpenChange={(open) => !open && setSendTarget(null)}>
        <DialogContent className="w-[min(95vw,34rem)] max-w-none p-0 gap-0 overflow-hidden rounded-2xl [&>button:last-of-type]:hidden">
          {/* Header */}
          <div className="bg-[#111118] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/20 flex items-center justify-center">
                <Send className="h-5 w-5 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-white font-bold text-[14px] leading-tight">Send Coupon</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{sendTarget?.title}</p>
              </div>
            </div>
            <button onClick={() => setSendTarget(null)} className="h-8 w-8 rounded-lg bg-white/06 hover:bg-white/12 flex items-center justify-center text-gray-400 hover:text-white transition-all text-lg leading-none">×</button>
          </div>

          {sendTarget && (
            <div className="space-y-4 bg-[#faf9f7] px-6 py-5">

              {/* Coupon card preview */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#111118] via-[#1a1a1a] to-[#2a2010] border border-[#d4af37]/20 p-5">
                {/* decorative circles */}
                <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[#d4af37]/08" />
                <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-[#d4af37]/05" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37]/60">BillVyapp · Exclusive Offer</p>
                    <span className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      sendTarget.status === "active"
                        ? "border-[#D4AF37]/25 bg-[#D4AF37]/15 text-[#D4AF37]"
                        : "border-white/10 bg-white/5 text-white/50",
                    )}>
                      {sendTarget.status === "active" ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-3xl font-black text-white tracking-widest font-mono mb-1">{sendTarget.code}</p>
                  <p className="text-[#d4af37] text-xl font-bold mb-3">
                    {sendTarget.type === "percentage" ? `${sendTarget.value}% OFF` : `₹${sendTarget.value} OFF`}
                    {sendTarget.maxDiscount ? <span className="text-[11px] font-normal text-[#d4af37]/60 ml-2">up to ₹{sendTarget.maxDiscount}</span> : null}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-gray-400">
                    {sendTarget.minSpend > 0 && <span>Min spend ₹{sendTarget.minSpend}</span>}
                    <span>Valid till {sendTarget.validTill}</span>
                    {sendTarget.usageLimit > 0 && <span>{sendTarget.usedCount}/{sendTarget.usageLimit} used</span>}
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b8962e] mb-3">Recipient</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Customer Name</p>
                    <input
                      value={sendName}
                      onChange={(e) => setSendName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[13px] text-[#111118] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/12 transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Phone Number <span className="text-[#d4af37]">*</span></p>
                    <div className="flex gap-0 rounded-xl overflow-hidden border border-gray-200 bg-white focus-within:border-[#d4af37] focus-within:ring-2 focus-within:ring-[#d4af37]/12 transition-all">
                      <span className="h-10 px-3.5 flex items-center text-[13px] font-bold text-[#d4af37] bg-[#111118] shrink-0">+91</span>
                      <input
                        value={sendPhone.replace(/^\+91\s?/, "")}
                        onChange={(e) => setSendPhone("+91 " + e.target.value)}
                        placeholder="98765 43210"
                        className="flex-1 h-10 px-3.5 text-[13px] text-[#111118] bg-white focus:outline-none placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Send buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  disabled={!sendPhone.trim()}
                  onClick={() => sendCoupon("whatsapp")}
                  className="flex-1 h-11 rounded-xl bg-[#25D366] hover:bg-[#20b858] disabled:opacity-40 text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-green-500/20"
                >
                  <Send className="h-4 w-4" /> WhatsApp
                </button>
                <button
                  disabled={!sendPhone.trim()}
                  onClick={() => sendCoupon("sms")}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#111118] text-[13px] font-bold text-[#D4AF37] transition-all disabled:opacity-40 hover:bg-[#1a1a1a]"
                >
                  <Send className="h-4 w-4" /> Send SMS
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
