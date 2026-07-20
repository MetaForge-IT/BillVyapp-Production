import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trash2, Package, AlertTriangle, ChevronDown,
  Beaker, Sliders, CheckCircle2, Search,
} from "lucide-react";
import { useServiceProducts, type ServiceProductLink } from "../../context/ServiceProductsContext";
import { useProducts } from "../../context/ProductsContext";

interface Props {
  serviceId: string;
  serviceName: string;
  open: boolean;
  onClose: () => void;
}

const UNITS: ServiceProductLink["unit"][] = ["ml", "g", "piece", "application"];

const UNIT_META: Record<ServiceProductLink["unit"], { label: string; color: string }> = {
  ml:          { label: "ml",          color: "bg-blue-50 text-blue-600 border-blue-100" },
  g:           { label: "g",           color: "bg-purple-50 text-purple-600 border-purple-100" },
  piece:       { label: "pcs",         color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  application: { label: "app",         color: "bg-[#d4af37]/10 text-[#b8962e] border-[#d4af37]/20" },
};

const STOCK_META = {
  ok:       { label: "In Stock",   dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50 border-green-100" },
  low:      { label: "Low",        dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50 border-orange-100" },
  critical: { label: "Critical",   dot: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50 border-red-100" },
  out:      { label: "Out",        dot: "bg-gray-400",   text: "text-gray-600",   bg: "bg-gray-50 border-gray-200" },
};

const emptyLink = (): Omit<ServiceProductLink, "sku" | "name"> & { sku: string; name: string } => ({
  sku: "", name: "", defaultQty: 1, unit: "application", wasteBuffer: 10, minQty: 1, maxQty: 5,
});

function StepInput({
  value, onChange, min = 0, step = 1,
}: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <div className="flex items-center h-9 rounded-xl border border-gray-200 overflow-hidden bg-white">
      <button type="button"
        onClick={() => onChange(Math.max(min, parseFloat((value - step).toFixed(2))))}
        className="h-full w-9 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-[#1a1a1a] text-[16px] font-light transition-colors border-r border-gray-100">
        −
      </button>
      <input
        type="number" value={value} step={step} min={min}
        onChange={e => onChange(parseFloat(e.target.value) || min)}
        className="flex-1 h-full text-center text-[13px] font-bold text-[#1a1a1a] bg-transparent focus:outline-none w-0"
      />
      <button type="button"
        onClick={() => onChange(parseFloat((value + step).toFixed(2)))}
        className="h-full w-9 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-[#1a1a1a] text-[16px] font-light transition-colors border-l border-gray-100">
        +
      </button>
    </div>
  );
}

export function ServiceProductLinksModal({ serviceId, serviceName, open, onClose }: Props) {
  const { getLinks, setLinks } = useServiceProducts();
  const { products } = useProducts();

  const [links, setLocal] = useState<ServiceProductLink[]>(() => getLinks(serviceId));
  const [addingNew, setAddingNew] = useState(false);
  const [newLink, setNewLink] = useState(emptyLink());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  if (!open) return null;

  function handleSave() { setLinks(serviceId, links); onClose(); }

  function addLink() {
    if (!newLink.sku) return;
    const product = products.find(p => p.sku.toUpperCase() === newLink.sku.toUpperCase());
    if (!product) return;
    setLocal(prev => [...prev.filter(l => l.sku !== newLink.sku), {
      sku: product.sku, name: product.name,
      defaultQty: newLink.defaultQty, unit: newLink.unit,
      wasteBuffer: newLink.wasteBuffer, minQty: newLink.minQty, maxQty: newLink.maxQty,
    }]);
    setNewLink(emptyLink()); setAddingNew(false); setProductSearch("");
  }

  function removeLink(sku: string) { setLocal(prev => prev.filter(l => l.sku !== sku)); }

  function updateLink<K extends keyof ServiceProductLink>(sku: string, field: K, value: ServiceProductLink[K]) {
    setLocal(prev => prev.map(l => l.sku === sku ? { ...l, [field]: value } : l));
  }

  const productOf  = (sku: string) => products.find(p => p.sku === sku);
  const stockOf    = (sku: string) => productOf(sku)?.stock ?? 0;
  const statusOf   = (sku: string) => (productOf(sku)?.status ?? "ok") as keyof typeof STOCK_META;

  const filteredProducts = products.filter(p => {
    if (links.some(l => l.sku === p.sku)) return false;
    const q = productSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const selectedProduct = products.find(p => p.sku === newLink.sku);
  const hasUnsaved = JSON.stringify(links) !== JSON.stringify(getLinks(serviceId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* ── Header ── */}
        <div className="relative bg-[#111118] px-6 pt-6 pb-5 shrink-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(ellipse at 90% 10%, #d4af37 0%, transparent 60%)" }} />
          <div className="relative flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/05 border border-[#d4af37]/25 flex items-center justify-center shrink-0 mt-0.5">
              <Package className="h-5 w-5 text-[#d4af37]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#d4af37]/60 mb-1">Product Links</p>
              <h2 className="text-[17px] font-bold text-white leading-tight truncate">{serviceName}</h2>
              <p className="text-[11px] text-white/35 mt-1.5 leading-relaxed">
                Set default product quantities consumed per appointment. Staff can adjust per client.
              </p>
            </div>
            <button onClick={onClose}
              className="h-8 w-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/40 hover:text-white flex items-center justify-center transition-all shrink-0 mt-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stats bar */}
          {links.length > 0 && (
            <div className="relative mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                <div className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
                <span className="text-[11px] font-semibold text-white/70">
                  {links.length} product{links.length !== 1 ? "s" : ""} linked
                </span>
              </div>
              {links.some(l => ["low","critical","out"].includes(statusOf(l.sku))) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <AlertTriangle className="h-3 w-3 text-orange-400" />
                  <span className="text-[11px] font-semibold text-orange-400">
                    {links.filter(l => ["low","critical","out"].includes(statusOf(l.sku))).length} low stock
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Empty state */}
          {links.length === 0 && !addingNew && (
            <div className="flex flex-col items-center gap-4 py-14 px-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Beaker className="h-7 w-7 text-gray-300" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-gray-700">No products linked yet</p>
                <p className="text-[12px] text-gray-400 mt-1 max-w-[260px]">
                  Link the products consumed during this service so stock deducts automatically when appointments complete.
                </p>
              </div>
              <button onClick={() => setAddingNew(true)}
                className="flex items-center gap-2 h-9 px-5 rounded-xl bg-[#1a1a1a] text-[#d4af37] text-[12px] font-bold hover:bg-[#2a2a2a] transition-all">
                <Plus className="h-3.5 w-3.5" /> Add First Product
              </button>
            </div>
          )}

          {/* Linked products list */}
          {links.length > 0 && (
            <div className="p-4 space-y-2.5">
              {links.map((link, idx) => {
                const stock   = stockOf(link.sku);
                const status  = statusOf(link.sku);
                const sm      = STOCK_META[status];
                const um      = UNIT_META[link.unit];
                const isOpen  = expanded === link.sku;
                const isAlert = status !== "ok";
                const actualConsumed = (link.defaultQty * (1 + link.wasteBuffer / 100)).toFixed(1);

                return (
                  <motion.div key={link.sku}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`rounded-2xl border overflow-hidden transition-all ${
                      isAlert ? "border-orange-200" : isOpen ? "border-[#d4af37]/30" : "border-gray-200"
                    } ${isAlert ? "bg-orange-50/20" : "bg-white"}`}>

                    {/* Card header */}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      {/* Color dot */}
                      <div className={`h-2 w-2 rounded-full shrink-0 ${sm.dot}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-bold text-[#1a1a1a] leading-tight">{link.name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${sm.bg} ${sm.text}`}>
                            {sm.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <code className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{link.sku}</code>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${um.color}`}>
                            {link.defaultQty} {um.label}
                          </span>
                          {link.wasteBuffer > 0 && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Beaker className="h-2.5 w-2.5" /> ~{actualConsumed} used
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold ${sm.text}`}>{stock} in stock</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setExpanded(isOpen ? null : link.sku)}
                          className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                            isOpen ? "bg-[#d4af37]/15 text-[#d4af37]" : "bg-gray-100 hover:bg-gray-200 text-gray-400"
                          }`}>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        <button onClick={() => removeLink(link.sku)}
                          className="h-8 w-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded edit panel */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden">
                          <div className="border-t border-gray-100 bg-[#fafaf8] px-4 py-4 space-y-4">

                            {/* Section: Quantity */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <Sliders className="h-3 w-3 text-[#d4af37]" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#d4af37]">Quantity Settings</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-semibold text-gray-500">Default Qty</label>
                                  <StepInput value={link.defaultQty} step={0.5}
                                    onChange={v => updateLink(link.sku, "defaultQty", v)} />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-semibold text-gray-500">Unit</label>
                                  <div className="grid grid-cols-2 gap-1">
                                    {UNITS.map(u => (
                                      <button key={u} type="button"
                                        onClick={() => updateLink(link.sku, "unit", u)}
                                        className={`h-9 rounded-xl text-[11px] font-bold border transition-all ${
                                          link.unit === u
                                            ? "bg-[#1a1a1a] border-[#1a1a1a] text-[#d4af37]"
                                            : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                                        }`}>
                                        {u}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section: Waste Buffer */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <Beaker className="h-3 w-3 text-[#d4af37]" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#d4af37]">Waste Buffer</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <StepInput value={link.wasteBuffer} step={5} min={0}
                                  onChange={v => updateLink(link.sku, "wasteBuffer", Math.min(50, v))} />
                                <span className="text-[13px] font-bold text-gray-500">%</span>
                                <div className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200">
                                  <p className="text-[10px] text-gray-400">Actual consumed</p>
                                  <p className="text-[13px] font-bold text-[#1a1a1a]">
                                    ~{actualConsumed} <span className="text-[11px] font-normal text-gray-400">{link.unit}</span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Section: Override Range */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#d4af37]">Staff Override Range</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-semibold text-gray-500">Min ({link.unit})</label>
                                  <StepInput value={link.minQty} step={0.5} min={0}
                                    onChange={v => updateLink(link.sku, "minQty", v)} />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-semibold text-gray-500">Max ({link.unit})</label>
                                  <StepInput value={link.maxQty} step={0.5} min={0}
                                    onChange={v => updateLink(link.sku, "maxQty", v)} />
                                </div>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1.5">
                                Staff can set between {link.minQty}–{link.maxQty} {link.unit} when booking
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* Add button inline */}
              {!addingNew && (
                <button onClick={() => setAddingNew(true)}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed border-gray-200 text-[12px] font-semibold text-gray-400 hover:border-[#d4af37]/50 hover:text-[#d4af37] hover:bg-[#d4af37]/02 transition-all">
                  <Plus className="h-4 w-4" /> Link another product
                </button>
              )}
            </div>
          )}

          {/* ── Add new product panel ── */}
          <AnimatePresence>
            {addingNew && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="p-4 border-t border-gray-100 bg-[#fafaf8] space-y-4">

                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-[#d4af37]" />
                  <p className="text-[12px] font-bold text-[#1a1a1a]">Link a Product</p>
                </div>

                {/* Search + select */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <input
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search products by name, SKU or category…"
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/20"
                    />
                  </div>

                  {/* Product picker list */}
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-50">
                    {filteredProducts.length === 0 && (
                      <p className="text-[12px] text-gray-400 text-center py-4">No products match</p>
                    )}
                    {filteredProducts.map(p => {
                      const st = (p.status ?? "ok") as keyof typeof STOCK_META;
                      const sm = STOCK_META[st];
                      const selected = newLink.sku === p.sku;
                      return (
                        <button key={p.sku} type="button"
                          onClick={() => setNewLink(prev => ({ ...prev, sku: p.sku, name: p.name }))}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                            selected ? "bg-[#d4af37]/08" : "hover:bg-gray-50"
                          }`}>
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${sm.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[#1a1a1a] truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400">{p.sku} · {p.category}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-[11px] font-bold ${sm.text}`}>{p.stock}</p>
                            <p className="text-[9px] text-gray-400">in stock</p>
                          </div>
                          {selected && <CheckCircle2 className="h-4 w-4 text-[#d4af37] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected product preview + qty */}
                {selectedProduct && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[#d4af37]/25 bg-white p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#d4af37] shrink-0" />
                      <p className="text-[12px] font-bold text-[#1a1a1a]">{selectedProduct.name}</p>
                      <code className="text-[10px] text-gray-400 ml-auto">{selectedProduct.sku}</code>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-gray-500">Default Qty</label>
                        <StepInput value={newLink.defaultQty} step={0.5} min={0.5}
                          onChange={v => setNewLink(prev => ({ ...prev, defaultQty: v }))} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-gray-500">Unit</label>
                        <div className="grid grid-cols-2 gap-1">
                          {UNITS.map(u => (
                            <button key={u} type="button"
                              onClick={() => setNewLink(prev => ({ ...prev, unit: u }))}
                              className={`h-9 rounded-xl text-[11px] font-bold border transition-all ${
                                newLink.unit === u
                                  ? "bg-[#1a1a1a] border-[#1a1a1a] text-[#d4af37]"
                                  : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                              }`}>
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-gray-500">Waste Buffer %</label>
                        <StepInput value={newLink.wasteBuffer} step={5} min={0}
                          onChange={v => setNewLink(prev => ({ ...prev, wasteBuffer: Math.min(50, v) }))} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-gray-500">Min – Max</label>
                        <div className="flex items-center gap-1.5">
                          <input type="number" value={newLink.minQty} min={0} step={0.5}
                            onChange={e => setNewLink(prev => ({ ...prev, minQty: parseFloat(e.target.value) || 0 }))}
                            className="w-0 flex-1 h-9 rounded-xl border border-gray-200 px-2 text-[12px] font-bold text-center focus:outline-none focus:border-[#d4af37]" />
                          <span className="text-[11px] text-gray-400">–</span>
                          <input type="number" value={newLink.maxQty} min={0} step={0.5}
                            onChange={e => setNewLink(prev => ({ ...prev, maxQty: parseFloat(e.target.value) || 0 }))}
                            className="w-0 flex-1 h-9 rounded-xl border border-gray-200 px-2 text-[12px] font-bold text-center focus:outline-none focus:border-[#d4af37]" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-2.5">
                  <button onClick={() => { setAddingNew(false); setNewLink(emptyLink()); setProductSearch(""); }}
                    className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-500 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                  <button onClick={addLink} disabled={!newLink.sku}
                    className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    <Plus className="h-3.5 w-3.5" /> Add Product
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2">
            {hasUnsaved && (
              <span className="flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </span>
            )}
            {!hasUnsaved && links.length > 0 && (
              <span className="text-[11px] text-gray-400">{links.length} product{links.length !== 1 ? "s" : ""} linked</span>
            )}
          </div>
          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="h-9 px-4 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button onClick={handleSave}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black hover:shadow-lg hover:shadow-[#d4af37]/25 transition-all flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Save Links
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
