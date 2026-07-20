import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  Upload, Download, X, CheckCircle2, AlertTriangle, XCircle,
  FileSpreadsheet, ChevronRight, RefreshCw, Sparkles,
} from "lucide-react";
import { Pagination } from "./Pagination";
import { useTablePagination } from "../../hooks/useTablePagination";

export type BulkServiceRow = {
  service_name: string;
  category: string;
  price: number;
  member_price: number;
  duration_minutes: number;
  description?: string;
  sku_code?: string;
};

type RowStatus = "valid" | "warning" | "error";

type ParsedRow = {
  raw: Record<string, string>;
  data: Partial<BulkServiceRow>;
  status: RowStatus;
  issues: string[];
  index: number;
};

const REQUIRED_HEADERS = ["service_name", "category", "price", "member_price", "duration_minutes"];
const TEMPLATE_HEADERS = ["service_name", "category", "price", "member_price", "duration_minutes", "description", "sku_code"];

function downloadTemplate(categoryNames: string[]) {
  const sampleCategory = categoryNames[0] ?? "Hair";
  const sampleRows = [
    ["Men Hair Cut", sampleCategory, 499, 399, 30, "Classic cut with wash", "SVC-001"],
    ["Women Hair Style", categoryNames[1] ?? sampleCategory, 799, 649, 45, "Cut and blow dry", "SVC-002"],
  ];
  const wb = XLSX.utils.book_new();
  const wsData = [TEMPLATE_HEADERS, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 35 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws, "Services");
  XLSX.writeFile(wb, "service_upload_template.xlsx");
}

function parseRow(raw: Record<string, string>, index: number, validCategories: string[]): ParsedRow {
  const issues: string[] = [];
  const data: Partial<BulkServiceRow> = {};

  // Normalize keys (trim + lowercase)
  const norm: Record<string, string> = {};
  for (const k of Object.keys(raw)) norm[k.trim().toLowerCase().replace(/\s+/g, "_")] = String(raw[k] ?? "").trim();

  // service_name
  if (!norm.service_name) issues.push("service_name is required");
  else data.service_name = norm.service_name;

  // category — must match an existing service category name from the database
  const cat = norm.category ?? "";
  if (!cat) issues.push("category is required");
  else {
    const match = validCategories.find((c) => c.toLowerCase() === cat.toLowerCase());
    if (!match) {
      issues.push(`category must be one of: ${validCategories.join(", ") || "(create categories first)"}`);
    } else {
      data.category = match;
    }
  }

  // price
  const price = parseFloat(norm.price);
  if (!norm.price) issues.push("price is required");
  else if (isNaN(price) || price < 0) issues.push("price must be a positive number");
  else data.price = price;

  // member_price
  const mp = parseFloat(norm.member_price);
  if (!norm.member_price) {
    if (data.price != null) { data.member_price = Math.round(data.price * 0.9); issues.push("member_price missing — defaulted to 90% of price"); }
    else issues.push("member_price is required");
  } else if (isNaN(mp) || mp < 0) {
    issues.push("member_price must be a positive number");
  } else {
    if (data.price != null && mp > data.price) issues.push("member_price is higher than price");
    data.member_price = mp;
  }

  // duration
  const dur = parseInt(norm.duration_minutes);
  if (!norm.duration_minutes) issues.push("duration_minutes is required");
  else if (isNaN(dur) || dur <= 0) issues.push("duration_minutes must be a positive integer");
  else data.duration_minutes = dur;

  // optional
  if (norm.description) data.description = norm.description;
  if (norm.sku_code) data.sku_code = norm.sku_code;

  const hasError = REQUIRED_HEADERS.some(h => {
    if (h === "member_price") return false; // can be auto-filled
    return !data[h as keyof BulkServiceRow] && data[h as keyof BulkServiceRow] !== 0;
  }) || issues.some(i => !i.includes("defaulted") && !i.includes("higher"));

  const status: RowStatus = hasError ? "error" : issues.length > 0 ? "warning" : "valid";

  return { raw, data, status, issues, index };
}

function parseFile(file: File, validCategories: string[]): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (json.length === 0) return reject(new Error("File is empty or has no data rows."));
        resolve(json.map((row, i) => parseRow(row, i + 2, validCategories))); // row 1 = header
      } catch {
        reject(new Error("Could not parse file. Make sure it's a valid .xlsx or .csv file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

type Step = "upload" | "preview" | "done";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (rows: BulkServiceRow[]) => void;
  existingNames: string[];
  categoryNames: string[];
}

export function BulkUploadServices({ open, onClose, onImport, existingNames, categoryNames }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "add">("skip");
  const [importResult, setImportResult] = useState({ added: 0, skipped: 0, warnings: 0 });

  const validRows   = rows.filter(r => r.status !== "error");
  const errorRows   = rows.filter(r => r.status === "error");
  const warningRows = rows.filter(r => r.status === "warning");
  const duplicates  = validRows.filter(r => r.data.service_name && existingNames.map(n => n.toLowerCase()).includes(r.data.service_name!.toLowerCase()));

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
      const parsed = await parseFile(file, categoryNames);
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
    const toImport = validRows.filter(r => {
      const isDup = existingNames.map(n => n.toLowerCase()).includes((r.data.service_name ?? "").toLowerCase());
      return !(isDup && duplicateAction === "skip");
    });
    const imported = toImport.map(r => r.data as BulkServiceRow);
    onImport(imported);
    setImportResult({ added: imported.length, skipped: rows.length - imported.length - errorRows.length, warnings: warningRows.length });
    setStep("done");
  }

  function reset() {
    setStep("upload");
    setRows([]);
    setFileName("");
    setParseError("");
    setDuplicateAction("skip");
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
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#111118] to-[#2a2a2a] px-7 py-5 shrink-0">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #d4af37 0%, transparent 55%)" }} />
          <div className="relative flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-[#d4af37]" />
            </div>
            <div className="flex-1">
              <h2 className="text-[17px] font-bold text-white">Bulk Upload Services</h2>
              <p className="text-[11px] text-white/45 mt-0.5">Import multiple services from Excel or CSV</p>
            </div>
            {/* Steps indicator */}
            <div className="flex items-center gap-1.5 mr-6">
              {(["upload", "preview", "done"] as Step[]).map((s, i) => (
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: UPLOAD ── */}
            {step === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-7 space-y-5">

                {/* Template download */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#d4af37]/06 border border-[#d4af37]/20">
                  <div>
                    <p className="text-[13px] font-bold text-[#1a1a1a]">Download Template First</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Pre-filled Excel with correct headers, dropdowns & sample data</p>
                  </div>
                  <button onClick={() => downloadTemplate(categoryNames)}
                    className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#1a1a1a] text-[#d4af37] text-[12px] font-bold hover:bg-[#2a2a2a] transition-all shrink-0">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </div>

                {/* Headers reference */}
                <div className="rounded-xl border border-gray-100 bg-[#fafaf8] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-white">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">Required Column Headers</p>
                  </div>
                  <div className="grid grid-cols-2 gap-0 divide-y divide-gray-100">
                    {[
                      { h: "service_name", req: true,  note: "Name of the service" },
                      { h: "category",     req: true,  note: categoryNames.length ? categoryNames.join(", ") : "Create categories first" },
                      { h: "price",        req: true,  note: "Selling price in ₹" },
                      { h: "member_price", req: true,  note: "Member price (auto: 90% if blank)" },
                      { h: "duration_minutes", req: true, note: "Duration in minutes" },
                      { h: "description",  req: false, note: "Optional service description" },
                      { h: "sku_code",     req: false, note: "Optional SKU / code" },
                    ].map(({ h, req, note }) => (
                      <div key={h} className="flex items-center gap-3 px-4 py-2.5">
                        <code className="text-[11px] font-mono font-bold text-[#1a1a1a] bg-gray-100 px-1.5 py-0.5 rounded">{h}</code>
                        {req ? <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 rounded-full">required</span>
                             : <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 rounded-full">optional</span>}
                        <span className="text-[11px] text-gray-400 ml-auto">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  ref={dropRef}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 h-40 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                    dragging ? "border-[#d4af37] bg-[#d4af37]/06 scale-[1.01]" : "border-gray-200 bg-[#fafaf8] hover:border-[#d4af37]/50 hover:bg-[#d4af37]/03"
                  }`}
                >
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  {parsing ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-8 w-8 text-[#d4af37] animate-spin" />
                      <p className="text-[13px] font-semibold text-gray-500">Parsing file…</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-[#d4af37]" />
                      </div>
                      <div className="text-center">
                        <p className="text-[13px] font-semibold text-[#1a1a1a]">Drop your file here or <span className="text-[#d4af37]">browse</span></p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Supports .xlsx, .xls, .csv</p>
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

            {/* ── STEP 2: PREVIEW ── */}
            {step === "preview" && (
              <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-7 space-y-4">

                {/* Summary bar */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-[12px] font-semibold text-gray-600">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> {fileName}
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-bold border border-green-100">
                      <CheckCircle2 className="h-3 w-3" /> {validRows.filter(r => r.status === "valid").length} valid
                    </span>
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
                  </div>
                </div>

                {/* Duplicate handling */}
                {duplicates.length > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-[12px] text-amber-800 font-medium flex-1">
                      {duplicates.length} service{duplicates.length > 1 ? "s" : ""} already exist with the same name
                    </p>
                    <div className="flex gap-1.5">
                      {(["skip", "add"] as const).map(a => (
                        <button key={a} onClick={() => setDuplicateAction(a)}
                          className={`h-7 px-3 rounded-lg text-[11px] font-bold transition-all ${duplicateAction === a ? "bg-amber-600 text-white" : "bg-white border border-amber-200 text-amber-700"}`}>
                          {a === "skip" ? "Skip duplicates" : "Add anyway"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full text-[12px]">
                      <thead className="sticky top-0 bg-[#1a1a1a] text-white z-10">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-semibold w-8">#</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Service Name</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Category</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Price</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Member ₹</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Duration</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((row, i) => {
                          const isDup = existingNames.map(n => n.toLowerCase()).includes((row.data.service_name ?? "").toLowerCase());
                          return (
                            <tr key={i} className={`border-b border-gray-100 ${
                              row.status === "error" ? "bg-red-50/60"
                              : row.status === "warning" ? "bg-amber-50/40"
                              : isDup ? "bg-blue-50/30"
                              : i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                            }`}>
                              <td className="px-3 py-2 text-gray-400 tabular-nums">{row.index}</td>
                              <td className="px-3 py-2 font-semibold text-[#111]">
                                {row.data.service_name || <span className="text-red-400 italic">missing</span>}
                                {isDup && <span className="ml-1.5 text-[9px] font-bold bg-blue-100 text-blue-600 px-1.5 rounded-full">duplicate</span>}
                              </td>
                              <td className="px-3 py-2">
                                {row.data.category
                                  ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{row.data.category}</span>
                                  : <span className="text-red-400 italic text-[10px]">invalid</span>
                                }
                              </td>
                              <td className="px-3 py-2 text-right font-mono">{row.data.price != null ? `₹${row.data.price}` : <span className="text-red-400">—</span>}</td>
                              <td className="px-3 py-2 text-right font-mono text-gray-500">{row.data.member_price != null ? `₹${row.data.member_price}` : <span className="text-red-400">—</span>}</td>
                              <td className="px-3 py-2 text-right text-gray-500">{row.data.duration_minutes ? `${row.data.duration_minutes}m` : <span className="text-red-400">—</span>}</td>
                              <td className="px-3 py-2">
                                {row.status === "valid" && <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold"><CheckCircle2 className="h-3 w-3" />Ready</span>}
                                {row.status === "warning" && (
                                  <span title={row.issues.join("\n")} className="flex items-center gap-1 text-amber-600 text-[10px] font-bold cursor-help">
                                    <AlertTriangle className="h-3 w-3" />Warning
                                  </span>
                                )}
                                {row.status === "error" && (
                                  <span title={row.issues.join("\n")} className="flex items-center gap-1 text-red-500 text-[10px] font-bold cursor-help">
                                    <XCircle className="h-3 w-3" />Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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

                {/* Error details */}
                {errorRows.length > 0 && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">Rows with errors (will be skipped)</p>
                    {errorRows.map(r => (
                      <div key={r.index} className="text-[11px] text-red-500">
                        <span className="font-bold">Row {r.index}:</span> {r.issues.join(" · ")}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 3: DONE ── */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="p-10 flex flex-col items-center text-center gap-5">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}>
                  <div className="h-20 w-20 rounded-full bg-[#d4af37]/10 border-2 border-[#d4af37]/30 flex items-center justify-center">
                    <Sparkles className="h-9 w-9 text-[#d4af37]" />
                  </div>
                </motion.div>
                <div>
                  <h3 className="text-[20px] font-bold text-[#1a1a1a]">Import Complete!</h3>
                  <p className="text-[13px] text-gray-500 mt-1">Services have been added to your catalog</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-green-50 border border-green-100">
                    <span className="text-2xl font-bold text-green-600">{importResult.added}</span>
                    <span className="text-[11px] text-green-600 font-semibold">Added</span>
                  </div>
                  {importResult.skipped > 0 && (
                    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-2xl font-bold text-gray-500">{importResult.skipped}</span>
                      <span className="text-[11px] text-gray-500 font-semibold">Skipped</span>
                    </div>
                  )}
                  {importResult.warnings > 0 && (
                    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-amber-50 border border-amber-100">
                      <span className="text-2xl font-bold text-amber-600">{importResult.warnings}</span>
                      <span className="text-[11px] text-amber-600 font-semibold">Warnings</span>
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

        {/* Footer */}
        {(step === "upload" || step === "preview") && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-7 py-4 bg-white border-t border-gray-100">
            {step === "upload" && (
              <>
                <p className="text-[11px] text-gray-400">Tip: hover over status icons in preview to see details</p>
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
                    Import {validRows.length - (duplicateAction === "skip" ? duplicates.length : 0)} Services
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
