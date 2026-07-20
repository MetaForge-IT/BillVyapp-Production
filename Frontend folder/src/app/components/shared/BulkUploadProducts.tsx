import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  Upload, Download, X, CheckCircle2, AlertTriangle, XCircle,
  FileSpreadsheet, ChevronRight, RefreshCw, Package,
  ArrowRight, RotateCcw, Sparkles,
} from "lucide-react";
import { Pagination } from "./Pagination";
import { useTablePagination } from "../../hooks/useTablePagination";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BulkProductRow = {
  action: "new" | "restock";
  product_name: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  cost_price: number;
  quantity: number;
  min_stock: number;
  supplier: string;
  description?: string;
  barcode?: string;
  expiry_date?: string;
  restock_note?: string;
};

export type ExistingProduct = {
  id: string;
  categoryId?: string;
  vendorId?: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  stock: number;
  minStock: number;
  price: string;
  costPrice: string;
  supplier: string;
  status: string;
  lastOrder: string;
};

type RowMode = "new" | "restock" | "ambiguous";
type RowStatus = "valid" | "warning" | "error";

type ParsedRow = {
  index: number;
  raw: Record<string, string>;
  data: Partial<BulkProductRow>;
  mode: RowMode;
  status: RowStatus;
  issues: string[];
  matchedProduct?: ExistingProduct;
  stockAfter?: number;
  resolvedAlert?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ["Hair Care", "Skin Care", "Nail Care", "Color", "Tools", "Accessories"];
const TEMPLATE_HEADERS = [
  "action", "product_name", "sku", "category", "brand",
  "price", "cost_price", "quantity", "min_stock", "supplier",
  "description", "barcode", "expiry_date", "restock_note",
];
const SAMPLE_ROWS = [
  ["new",     "L'Oréal Professional Shampoo", "LPS-001",   "Hair Care", "L'Oréal",      850, 620,  45, 20, "Beauty World",   "For all hair types", "8901030123456", "",           ""],
  ["restock", "",                              "WCC-042",   "",          "",              "",  "",   30, "", "",               "",                   "",              "",           "Supplier invoice INV-2045"],
  ["new",     "OPI Nail Polish Set",           "OPI-NP-13", "Nail Care", "OPI",          4800, 3600, 22, 10, "NailPro India",  "",                   "",              "2027-06-30", ""],
  ["restock", "",                              "SIR-099",   "",          "",              980,  "",  20, "", "ColorPro Dist.", "",                   "",              "",           "Restocking after sale"],
];

// ─── Template Download ─────────────────────────────────────────────────────────

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const wsData = [TEMPLATE_HEADERS, ...SAMPLE_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 10 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 18 },
    { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "product_upload_template.xlsx");
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function norm(raw: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const k of Object.keys(raw))
    out[k.trim().toLowerCase().replace(/\s+/g, "_")] = String(raw[k] ?? "").trim();
  return out;
}

function parseRow(
  raw: Record<string, string>,
  index: number,
  existing: ExistingProduct[],
): ParsedRow {
  const n = norm(raw);
  const issues: string[] = [];
  const data: Partial<BulkProductRow> = {};

  // ── Detect mode ──────────────────────────────────────────────────────────
  const rawAction = (n.action || "").toLowerCase();
  let explicitMode: "new" | "restock" | null =
    rawAction === "restock" ? "restock" : rawAction === "new" ? "new" : null;

  const skuVal = n.sku?.toUpperCase();
  const matchedProduct = skuVal ? existing.find(p => p.sku.toUpperCase() === skuVal) : undefined;

  let mode: RowMode;
  if (explicitMode) {
    mode = explicitMode;
  } else if (matchedProduct) {
    mode = "restock";
    issues.push("action blank — auto-detected as Restock (SKU matched existing product)");
  } else if (skuVal) {
    mode = "new";
    issues.push("action blank — auto-detected as New Product (SKU not found)");
  } else {
    mode = "ambiguous";
    issues.push("action and SKU both missing — cannot determine intent");
  }

  data.action = mode === "ambiguous" ? "new" : mode;

  // ── SKU ──────────────────────────────────────────────────────────────────
  if (!skuVal) {
    if (mode === "new") issues.push("sku is required for new products");
    else if (mode === "restock") issues.push("sku is required for restock");
  } else {
    data.sku = skuVal;
    // SKU conflict: marking as new but SKU already exists
    if (mode === "new" && matchedProduct)
      issues.push(`SKU "${skuVal}" already exists — will update stock instead of creating duplicate`);
    // SKU not found for restock
    if (mode === "restock" && !matchedProduct)
      issues.push(`SKU "${skuVal}" not found in inventory — treating as new product`);
  }

  // ── quantity (required for both modes) ───────────────────────────────────
  const qty = parseInt(n.quantity);
  if (!n.quantity) issues.push("quantity is required");
  else if (isNaN(qty) || qty <= 0) issues.push("quantity must be a positive integer");
  else data.quantity = qty;

  // ── Fields required only for NEW ─────────────────────────────────────────
  if (mode === "new" || (mode === "restock" && !matchedProduct)) {
    // product_name
    if (!n.product_name) issues.push("product_name is required for new products");
    else data.product_name = n.product_name;

    // category
    const cat = n.category ? n.category.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") : "";
    if (!cat) issues.push("category is required for new products");
    else if (!VALID_CATEGORIES.includes(cat)) issues.push(`category "${n.category}" is invalid — must be one of: ${VALID_CATEGORIES.join(", ")}`);
    else data.category = cat;

    // brand
    if (!n.brand) issues.push("brand is required for new products");
    else data.brand = n.brand;

    // price
    const price = parseFloat(n.price);
    if (!n.price) issues.push("price is required for new products");
    else if (isNaN(price) || price < 0) issues.push("price must be a positive number");
    else data.price = price;

    // cost_price
    const cp = parseFloat(n.cost_price);
    if (!n.cost_price) {
      if (data.price != null) { data.cost_price = Math.round(data.price * 0.7); issues.push("cost_price missing — defaulted to 70% of price"); }
      else issues.push("cost_price is required");
    } else if (isNaN(cp) || cp < 0) {
      issues.push("cost_price must be a positive number");
    } else {
      if (data.price != null && cp > data.price) issues.push("cost_price is higher than price");
      data.cost_price = cp;
    }

    // min_stock
    const ms = parseInt(n.min_stock);
    if (!n.min_stock) { data.min_stock = 10; issues.push("min_stock missing — defaulted to 10"); }
    else if (isNaN(ms) || ms < 0) issues.push("min_stock must be a non-negative integer");
    else data.min_stock = ms;

    // supplier
    if (!n.supplier) issues.push("supplier is required for new products");
    else data.supplier = n.supplier;
  } else {
    // RESTOCK — carry optional price/cost_price updates
    const price = parseFloat(n.price);
    if (n.price && !isNaN(price)) { data.price = price; issues.push("price will be updated"); }
    const cp = parseFloat(n.cost_price);
    if (n.cost_price && !isNaN(cp)) { data.cost_price = cp; issues.push("cost_price will be updated"); }
    if (n.supplier) { data.supplier = n.supplier; issues.push("supplier will be updated"); }
    if (n.product_name) data.product_name = n.product_name;
  }

  // ── Optional fields ───────────────────────────────────────────────────────
  if (n.description) data.description = n.description;
  if (n.barcode) data.barcode = n.barcode;
  if (n.restock_note) data.restock_note = n.restock_note;

  // expiry_date validation
  if (n.expiry_date) {
    const exp = new Date(n.expiry_date);
    if (isNaN(exp.getTime())) issues.push("expiry_date is not a valid date (use YYYY-MM-DD)");
    else if (exp < new Date()) issues.push(`expiry_date ${n.expiry_date} is in the past — product may be expired`);
    else data.expiry_date = n.expiry_date;
  }

  // ── Determine status ──────────────────────────────────────────────────────
  const fatalIssues = issues.filter(i =>
    !i.includes("auto-detected") &&
    !i.includes("defaulted") &&
    !i.includes("will be updated") &&
    !i.includes("treating as new")
  );
  const hasError = mode === "ambiguous" || fatalIssues.some(i =>
    i.includes("required") || i.includes("invalid") || i.includes("must be") || i.includes("already exists")
  );
  const status: RowStatus = hasError ? "error" : issues.length > 0 ? "warning" : "valid";

  // ── Post-restock stock projection ─────────────────────────────────────────
  let stockAfter: number | undefined;
  let resolvedAlert = false;
  if (matchedProduct && data.quantity) {
    stockAfter = matchedProduct.stock + data.quantity;
    const wasAlert = matchedProduct.status === "low" || matchedProduct.status === "critical" || matchedProduct.status === "out";
    resolvedAlert = wasAlert && stockAfter >= matchedProduct.minStock;
  }

  return { index, raw, data, mode, status, issues, matchedProduct, stockAfter, resolvedAlert };
}

async function parseFile(file: File, existing: ExistingProduct[]): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (json.length === 0) return reject(new Error("File is empty or has no data rows."));
        resolve(json.map((row, i) => parseRow(row, i + 2, existing)));
      } catch {
        reject(new Error("Could not parse file. Make sure it's a valid .xlsx or .csv file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "upload" | "preview" | "done";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ParsedRow[]) => void;
  existingProducts: ExistingProduct[];
}

export function BulkUploadProducts({ open, onClose, onImport, existingProducts }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState({ added: 0, restocked: 0, skipped: 0, alertsResolved: 0 });

  const validRows    = rows.filter(r => r.status !== "error");
  const errorRows    = rows.filter(r => r.status === "error");
  const warningRows  = rows.filter(r => r.status === "warning");
  const newRows      = validRows.filter(r => r.mode === "new");
  const restockRows  = validRows.filter(r => r.mode === "restock");
  const ambiguous    = rows.filter(r => r.mode === "ambiguous");
  const alertsToResolve = restockRows.filter(r => r.resolvedAlert).length;

  const previewPagination = useTablePagination(rows.length);
  const paginatedRows = useMemo(() => previewPagination.paginate(rows), [rows, previewPagination]);

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setParseError("Only .xlsx, .xls, or .csv files are supported.");
      return;
    }
    setParseError("");
    setParsing(true);
    setFileName(file.name);
    try {
      const parsed = await parseFile(file, existingProducts);
      setRows(parsed);
      setStep("preview");
    } catch (err: unknown) {
      setParseError((err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleConfirm() {
    onImport(validRows);
    const added = newRows.length;
    const restocked = restockRows.length;
    const skipped = errorRows.length + ambiguous.length;
    setImportResult({ added, restocked, skipped, alertsResolved: alertsToResolve });
    setStep("done");
  }

  function reset() {
    setStep("upload");
    setRows([]);
    setFileName("");
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-[#111118] to-[#2a2a2a] px-7 py-5 shrink-0">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #d4af37 0%, transparent 55%)" }} />
          <div className="relative flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-[#d4af37]" />
            </div>
            <div className="flex-1">
              <h2 className="text-[17px] font-bold text-white">Bulk Import Products</h2>
              <p className="text-[11px] text-white/45 mt-0.5">Add new products or restock existing ones from Excel / CSV</p>
            </div>
            {/* Step indicators */}
            <div className="flex items-center gap-1.5 mr-6">
              {(["upload","preview","done"] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                    step === s ? "bg-[#d4af37] border-[#d4af37] text-[#111]"
                    : (["upload","preview","done"].indexOf(step) > i) ? "bg-[#d4af37]/20 border-[#d4af37]/40 text-[#d4af37]"
                    : "bg-white/[0.06] border-white/[0.1] text-white/25"
                  }`}>{i + 1}</div>
                  {i < 2 && <ChevronRight className="h-3 w-3 text-white/20" />}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-white flex items-center justify-center transition-all">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ══ STEP 1: UPLOAD ══ */}
            {step === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-7 space-y-5">

                {/* Template download */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#d4af37]/06 border border-[#d4af37]/20">
                  <div>
                    <p className="text-[13px] font-bold text-[#1a1a1a]">Download Template First</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Pre-filled Excel with sample new product & restock rows, correct headers</p>
                  </div>
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#1a1a1a] text-[#d4af37] text-[12px] font-bold hover:bg-[#2a2a2a] transition-all shrink-0">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </div>

                {/* Mode explainer */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      icon: <Package className="h-5 w-5 text-[#1a1a1a]" />,
                      mode: "New Product",
                      bg: "bg-gray-50 border-gray-200",
                      desc: "All required fields needed",
                      required: ["action = new", "product_name", "sku", "category", "brand", "price", "cost_price", "quantity", "min_stock", "supplier"],
                    },
                    {
                      icon: <RotateCcw className="h-5 w-5 text-blue-600" />,
                      mode: "Restock",
                      bg: "bg-blue-50 border-blue-200",
                      desc: "Only SKU + quantity required",
                      required: ["action = restock", "sku", "quantity"],
                      optional: ["price (to update)", "cost_price (to update)", "supplier (to update)", "restock_note"],
                    },
                  ].map(({ icon, mode, bg, desc, required, optional }) => (
                    <div key={mode} className={`rounded-xl border p-4 ${bg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {icon}
                        <p className="text-[13px] font-bold text-[#1a1a1a]">{mode}</p>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2">{desc}</p>
                      <div className="space-y-0.5">
                        {required.map(r => (
                          <div key={r} className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                            <code className="text-[10px] text-gray-600">{r}</code>
                          </div>
                        ))}
                        {optional?.map(r => (
                          <div key={r} className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                            <code className="text-[10px] text-gray-400">{r}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Column reference */}
                <div className="rounded-xl border border-gray-100 bg-[#fafaf8] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-white">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">All Column Headers</p>
                  </div>
                  <div className="grid grid-cols-2 divide-y divide-gray-100">
                    {[
                      { h: "action",       req: true,  note: "new / restock (or leave blank for auto-detect)" },
                      { h: "product_name", req: "*",   note: "Required for new products" },
                      { h: "sku",          req: true,  note: "Unique product code — used for restock matching" },
                      { h: "category",     req: "*",   note: "Hair Care / Skin Care / Nail Care / Color / Tools / Accessories" },
                      { h: "brand",        req: "*",   note: "Required for new products" },
                      { h: "price",        req: "*",   note: "Selling price ₹ — optional update on restock" },
                      { h: "cost_price",   req: "*",   note: "Cost price ₹ — optional update on restock" },
                      { h: "quantity",     req: true,  note: "New stock qty / qty to add on restock" },
                      { h: "min_stock",    req: "*",   note: "Reorder alert threshold (default: 10)" },
                      { h: "supplier",     req: "*",   note: "Required for new, optional update on restock" },
                      { h: "description",  req: false, note: "Optional product description" },
                      { h: "barcode",      req: false, note: "Optional barcode / EAN" },
                      { h: "expiry_date",  req: false, note: "YYYY-MM-DD format" },
                      { h: "restock_note", req: false, note: "Audit note e.g. invoice number" },
                    ].map(({ h, req, note }) => (
                      <div key={h} className="flex items-center gap-3 px-4 py-2">
                        <code className="text-[10.5px] font-mono font-bold text-[#1a1a1a] bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{h}</code>
                        <span className={`text-[9px] font-bold px-1.5 rounded-full shrink-0 ${
                          req === true ? "bg-red-50 text-red-500"
                          : req === "*" ? "bg-orange-50 text-orange-500"
                          : "bg-gray-100 text-gray-400"
                        }`}>{req === true ? "always" : req === "*" ? "new only" : "optional"}</span>
                        <span className="text-[10.5px] text-gray-400 truncate">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 h-36 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                    dragging ? "border-[#d4af37] bg-[#d4af37]/06 scale-[1.01]"
                    : "border-gray-200 bg-[#fafaf8] hover:border-[#d4af37]/50 hover:bg-[#d4af37]/03"
                  }`}
                >
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  {parsing ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-7 w-7 text-[#d4af37] animate-spin" />
                      <p className="text-[13px] font-semibold text-gray-500">Parsing file…</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-11 w-11 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-[#d4af37]" />
                      </div>
                      <div className="text-center">
                        <p className="text-[13px] font-semibold text-[#1a1a1a]">Drop file here or <span className="text-[#d4af37]">browse</span></p>
                        <p className="text-[11px] text-gray-400 mt-0.5">.xlsx · .xls · .csv</p>
                      </div>
                    </>
                  )}
                </div>

                {parseError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-[12px] text-red-600 font-medium">{parseError}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ══ STEP 2: PREVIEW ══ */}
            {step === "preview" && (
              <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-7 space-y-4">

                {/* Summary chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-[12px] font-semibold text-gray-600">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> {fileName}
                  </div>
                  <div className="flex gap-2 ml-auto flex-wrap">
                    {newRows.length > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1a1a1a] text-white text-[11px] font-bold">
                        <Package className="h-3 w-3" /> {newRows.length} new
                      </span>
                    )}
                    {restockRows.length > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                        <RotateCcw className="h-3 w-3" /> {restockRows.length} restock
                      </span>
                    )}
                    {warningRows.length > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100">
                        <AlertTriangle className="h-3 w-3" /> {warningRows.length} warnings
                      </span>
                    )}
                    {errorRows.length > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-bold border border-red-100">
                        <XCircle className="h-3 w-3" /> {errorRows.length} errors
                      </span>
                    )}
                    {alertsToResolve > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-bold border border-green-100">
                        <CheckCircle2 className="h-3 w-3" /> {alertsToResolve} alerts resolved
                      </span>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-[12px]">
                      <thead className="sticky top-0 bg-[#1a1a1a] text-white z-10">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-semibold w-8">#</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Mode</th>
                          <th className="text-left px-3 py-2.5 font-semibold">SKU</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Product</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Category</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Price</th>
                          <th className="text-center px-3 py-2.5 font-semibold">Stock</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((row, i) => (
                          <tr key={i} className={`border-b border-gray-100 ${
                            row.status === "error"   ? "bg-red-50/70"
                            : row.mode === "restock" ? "bg-blue-50/40"
                            : row.mode === "new"     ? "bg-white"
                            : "bg-amber-50/40"
                          } ${i % 2 === 0 ? "" : "brightness-[0.98]"}`}>
                            <td className="px-3 py-2.5 text-gray-400 tabular-nums">{row.index}</td>

                            {/* Mode badge */}
                            <td className="px-3 py-2.5">
                              {row.mode === "new" && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-[#1a1a1a] bg-gray-100 px-2 py-0.5 rounded-full w-fit">
                                  <Package className="h-2.5 w-2.5" /> New
                                </span>
                              )}
                              {row.mode === "restock" && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full w-fit">
                                  <RotateCcw className="h-2.5 w-2.5" /> Restock
                                </span>
                              )}
                              {row.mode === "ambiguous" && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full w-fit">
                                  <AlertTriangle className="h-2.5 w-2.5" /> ?
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600">
                              {row.data.sku || <span className="text-red-400 italic">missing</span>}
                            </td>

                            <td className="px-3 py-2.5 font-semibold text-[#111] max-w-[160px]">
                              {row.mode === "restock" && row.matchedProduct
                                ? <span title={row.matchedProduct.name} className="truncate block">{row.matchedProduct.name}</span>
                                : row.data.product_name
                                  ? <span className="truncate block">{row.data.product_name}</span>
                                  : <span className="text-red-400 italic text-[10px]">missing</span>
                              }
                            </td>

                            <td className="px-3 py-2.5">
                              {(row.data.category || row.matchedProduct?.category)
                                ? <span className="text-[10px] font-semibold text-[#d4af37]">{row.data.category || row.matchedProduct?.category}</span>
                                : <span className="text-red-400 text-[10px] italic">—</span>
                              }
                            </td>

                            <td className="px-3 py-2.5 text-right font-mono text-[11px]">
                              {row.data.price != null ? `₹${row.data.price}` : row.matchedProduct?.price || "—"}
                            </td>

                            {/* Stock column — shows current→new for restocks */}
                            <td className="px-3 py-2.5 text-center">
                              {row.mode === "restock" && row.matchedProduct && row.data.quantity ? (
                                <span className="flex items-center justify-center gap-1 text-[11px] font-bold">
                                  <span className={row.matchedProduct.status === "out" ? "text-gray-400 line-through" : "text-gray-500"}>{row.matchedProduct.stock}</span>
                                  <ArrowRight className="h-2.5 w-2.5 text-blue-400" />
                                  <span className={`font-bold ${row.resolvedAlert ? "text-green-600" : "text-blue-600"}`}>{row.stockAfter}</span>
                                  {row.resolvedAlert && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                </span>
                              ) : row.data.quantity != null ? (
                                <span className="font-bold text-[#1a1a1a]">{row.data.quantity}</span>
                              ) : (
                                <span className="text-red-400">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2.5">
                              {row.status === "valid" && (
                                <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
                                  <CheckCircle2 className="h-3 w-3" />Ready
                                </span>
                              )}
                              {row.status === "warning" && (
                                <span title={row.issues.join("\n")} className="flex items-center gap-1 text-amber-600 text-[10px] font-bold cursor-help">
                                  <AlertTriangle className="h-3 w-3" />Warn
                                </span>
                              )}
                              {row.status === "error" && (
                                <span title={row.issues.join("\n")} className="flex items-center gap-1 text-red-500 text-[10px] font-bold cursor-help">
                                  <XCircle className="h-3 w-3" />Error
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 0 && (
                    <Pagination
                      page={previewPagination.page}
                      pageSize={previewPagination.pageSize}
                      totalRecords={rows.length}
                      onPageChange={previewPagination.setPage}
                      onPageSizeChange={previewPagination.setPageSize}
                    />
                  )}
                </div>

                {/* Alert resolution banner */}
                {alertsToResolve > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-[12px] text-green-800 font-medium">
                      This import will resolve <strong>{alertsToResolve}</strong> low-stock / out-of-stock alert{alertsToResolve > 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                {/* Warning notes */}
                {warningRows.length > 0 && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 space-y-1">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Notes (imported with defaults)</p>
                    {warningRows.slice(0, 5).map(r => (
                      <div key={r.index} className="text-[11px] text-amber-600">
                        <span className="font-bold">Row {r.index}:</span> {r.issues.filter(i => i.includes("defaulted") || i.includes("auto-detected") || i.includes("will be updated")).join(" · ")}
                      </div>
                    ))}
                  </div>
                )}

                {/* Error list */}
                {errorRows.length > 0 && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 space-y-1">
                    <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">Errors — these rows will be skipped</p>
                    {errorRows.map(r => (
                      <div key={r.index} className="text-[11px] text-red-500">
                        <span className="font-bold">Row {r.index}:</span> {r.issues.filter(i => !i.includes("defaulted") && !i.includes("will be updated")).join(" · ")}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ══ STEP 3: DONE ══ */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className="p-10 flex flex-col items-center text-center gap-5">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}>
                  <div className="h-20 w-20 rounded-full bg-[#d4af37]/10 border-2 border-[#d4af37]/30 flex items-center justify-center">
                    <Sparkles className="h-9 w-9 text-[#d4af37]" />
                  </div>
                </motion.div>
                <div>
                  <h3 className="text-[20px] font-bold text-[#1a1a1a]">Import Complete!</h3>
                  <p className="text-[13px] text-gray-500 mt-1">Inventory has been updated successfully</p>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  {importResult.added > 0 && (
                    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-[#1a1a1a] border border-[#1a1a1a]">
                      <span className="text-2xl font-bold text-[#d4af37]">{importResult.added}</span>
                      <span className="text-[11px] text-white font-semibold">Products Added</span>
                    </div>
                  )}
                  {importResult.restocked > 0 && (
                    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="text-2xl font-bold text-blue-600">{importResult.restocked}</span>
                      <span className="text-[11px] text-blue-600 font-semibold">Restocked</span>
                    </div>
                  )}
                  {importResult.alertsResolved > 0 && (
                    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-green-50 border border-green-100">
                      <span className="text-2xl font-bold text-green-600">{importResult.alertsResolved}</span>
                      <span className="text-[11px] text-green-600 font-semibold">Alerts Cleared</span>
                    </div>
                  )}
                  {importResult.skipped > 0 && (
                    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-2xl font-bold text-gray-400">{importResult.skipped}</span>
                      <span className="text-[11px] text-gray-400 font-semibold">Skipped</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2.5 mt-2">
                  <button onClick={reset}
                    className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                    Upload Another
                  </button>
                  <button onClick={onClose}
                    className="h-10 px-6 rounded-xl bg-[#1a1a1a] text-[#d4af37] text-[13px] font-bold hover:bg-[#2a2a2a] transition-all">
                    Done
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        {(step === "upload" || step === "preview") && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-7 py-4 bg-white border-t border-gray-100">
            {step === "upload" && (
              <>
                <p className="text-[11px] text-gray-400">Tip: leave <code className="bg-gray-100 px-1 rounded text-[10px]">action</code> blank — system auto-detects new vs restock by SKU</p>
                <button onClick={onClose} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              </>
            )}
            {step === "preview" && (
              <>
                <button onClick={reset} className="h-10 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Upload different file
                </button>
                <div className="flex gap-2.5">
                  <button onClick={onClose} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                  <button
                    onClick={handleConfirm}
                    disabled={validRows.length === 0}
                    className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm ({newRows.length} new · {restockRows.length} restock)
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
