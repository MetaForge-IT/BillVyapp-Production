import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  Upload, Download, X, CheckCircle2, AlertTriangle, XCircle,
  FileSpreadsheet, ChevronRight, RefreshCw, Sparkles,
} from "lucide-react";
import { Pagination } from "./Pagination";
import { useTablePagination } from "../../hooks/useTablePagination";

export type BulkServiceGender = "MALE" | "FEMALE" | "UNISEX";

export type BulkServiceRow = {
  service_name: string;
  category: string;
  price: number;
  member_price: number;
  duration_minutes: number;
  description?: string;
  service_group?: string;
  gender?: BulkServiceGender;
  /** Match existing service to update; used as code on create when new. */
  service_code?: string;
  tax?: number;
  status?: "active" | "inactive";
};

export type ExistingBulkService = {
  id: string;
  serviceCode: string;
  displayName: string;
};

type RowStatus = "valid" | "warning" | "error";

type ParsedRow = {
  raw: Record<string, string>;
  data: Partial<BulkServiceRow>;
  status: RowStatus;
  issues: string[];
  index: number;
  /** Set when service_code matches an existing service. */
  matchId?: string;
};

const REQUIRED_HEADERS = ["service_name", "category", "price", "duration_minutes"] as const;

/** Columns written into the downloadable sample Excel. */
const TEMPLATE_HEADERS = [
  "service_name",
  "category",
  "service_group",
  "price",
  "member_price",
  "duration_minutes",
  "gender",
  "service_code",
  "description",
  "tax",
  "status",
] as const;

const GENDER_VALUES: BulkServiceGender[] = ["MALE", "FEMALE", "UNISEX"];

function downloadTemplate(categoryNames: string[]) {
  const cat1 = categoryNames[0] ?? "Threading";
  const cat2 = categoryNames[1] ?? categoryNames[0] ?? "Hair";
  const sampleRows = [
    [
      "Upper Lip",
      cat1,
      "Face",
      30,
      20,
      10,
      "FEMALE",
      "F-THREAD-FACE-UPPERLIP",
      "Upper lip threading",
      "",
      "active",
    ],
    [
      "Hair Cut Basic",
      cat2,
      "Cut",
      499,
      399,
      30,
      "MALE",
      "M-HAIR-CUT-BASIC",
      "Classic men haircut",
      0,
      "active",
    ],
    [
      "Cut & File",
      categoryNames.find((c) => /nail/i.test(c)) ?? cat2,
      "",
      200,
      150,
      10,
      "UNISEX",
      "",
      "Optional description",
      "",
      "active",
    ],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS as unknown as string[], ...sampleRows]);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 28 },
    { wch: 28 },
    { wch: 8 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Services");

  const guide = XLSX.utils.aoa_to_sheet([
    ["Column", "Required", "Notes"],
    ["service_name", "Yes", "Display name shown in UI / billing"],
    ["category", "Yes", "Any category name is allowed. Existing names are matched; new names are created on import."],
    ["service_group", "No", "Group inside category (e.g. Face, Cut). Leave blank if none"],
    ["price", "Yes", "Selling price in ₹"],
    ["member_price", "No", "Member price; defaults to 90% of price if blank"],
    ["duration_minutes", "Yes", "Duration in minutes (integer)"],
    ["gender", "No", "MALE, FEMALE, or UNISEX (default UNISEX)"],
    ["service_code", "No", "Match existing code to UPDATE. Blank = match by service_name. No match = create new"],
    ["description", "No", "Optional notes"],
    ["tax", "No", "Tax % (0–100). Leave blank for none"],
    ["status", "No", "active or inactive (default active)"],
    ["NOTE", "", "Bulk upload NEVER deletes services. Rows missing from Excel stay in the database."],
  ]);
  guide["!cols"] = [{ wch: 18 }, { wch: 10 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, guide, "Instructions");

  XLSX.writeFile(wb, "service_bulk_upload_template.xlsx");
}

function parseGender(value: string): BulkServiceGender | undefined {
  const v = value.trim().toUpperCase();
  if (!v) return undefined;
  if (v === "MALE" || v === "M" || v === "MEN" || v === "MAN") return "MALE";
  if (v === "FEMALE" || v === "F" || v === "WOMEN" || v === "WOMAN") return "FEMALE";
  if (v === "UNISEX" || v === "U" || v === "BOTH" || v === "ALL") return "UNISEX";
  return undefined;
}

/** Normalize for fuzzy category match: "Detan Bleach" ≈ "Detan - Bleach". */
function normalizeCategoryKey(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, " ")
    .replace(/[\s\-–—_/]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Common Excel labels → canonical category name fragment to match. */
const CATEGORY_ALIASES: Record<string, string> = {
  intimatewomen: "intimatewomen",
  intimatewoman: "intimatewomen",
  intimate: "intimatewomen",
  womenintimate: "intimatewomen",
  intimatecare: "intimatewomen",
  intimatearea: "intimatewomen",
  intimateservices: "intimatewomen",
  detanbleach: "detanbleach",
  detan: "detanbleach",
  bleach: "detanbleach",
  detanandbleach: "detanbleach",
  bleachdetan: "detanbleach",
};

/** Prefer an existing category name when it matches; otherwise keep Excel label as-is (will be created on import). */
function resolveCategoryName(input: string, validCategories: string[]): string | undefined {
  const cleaned = input.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (!cleaned) return undefined;

  const exact = validCategories.find((c) => c.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;

  const key = normalizeCategoryKey(cleaned);
  if (!key) return cleaned;

  const aliasKey = CATEGORY_ALIASES[key] ?? key;

  const byNorm = validCategories.find((c) => {
    const ck = normalizeCategoryKey(c);
    return ck === key || ck === aliasKey || CATEGORY_ALIASES[ck] === aliasKey;
  });
  if (byNorm) return byNorm;

  // Unique substring match (e.g. Excel "Intimate" → "Intimate Women")
  const partial = validCategories.filter((c) => {
    const ck = normalizeCategoryKey(c);
    return ck.includes(aliasKey) || aliasKey.includes(ck);
  });
  if (partial.length === 1) return partial[0];

  // Open category: any new label is allowed
  return cleaned;
}

function parseRow(
  raw: Record<string, string>,
  index: number,
  validCategories: string[],
  existingByCode: Map<string, ExistingBulkService>,
  existingByName: Map<string, ExistingBulkService>,
): ParsedRow {
  const issues: string[] = [];
  const data: Partial<BulkServiceRow> = {};
  let matchId: string | undefined;

  const norm: Record<string, string> = {};
  for (const k of Object.keys(raw)) {
    norm[k.trim().toLowerCase().replace(/\s+/g, "_")] = String(raw[k] ?? "").trim();
  }

  // Back-compat aliases
  if (!norm.service_name && norm.name) norm.service_name = norm.name;
  if (!norm.service_code && norm.sku_code) norm.service_code = norm.sku_code;
  if (!norm.duration_minutes && norm.duration) norm.duration_minutes = norm.duration;
  if (!norm.category && norm.category_name) norm.category = norm.category_name;
  if (!norm.category && norm.service_category) norm.category = norm.service_category;

  if (!norm.service_name) issues.push("service_name is required");
  else data.service_name = norm.service_name;

  const cat = norm.category ?? "";
  if (!cat) issues.push("category is required");
  else {
    const match = resolveCategoryName(cat, validCategories);
    if (!match) {
      issues.push("category is required");
    } else {
      data.category = match;
      const known = validCategories.some(
        (c) => normalizeCategoryKey(c) === normalizeCategoryKey(match) || c.toLowerCase() === match.toLowerCase(),
      );
      if (!known) {
        issues.push(`category "${match}" is new — will be created on import`);
      }
    }
  }

  const price = parseFloat(norm.price);
  if (!norm.price) issues.push("price is required");
  else if (Number.isNaN(price) || price < 0) issues.push("price must be a non-negative number");
  else data.price = price;

  const mp = parseFloat(norm.member_price);
  if (!norm.member_price) {
    if (data.price != null) {
      data.member_price = Math.round(data.price * 0.9);
      issues.push("member_price missing — defaulted to 90% of price");
    }
  } else if (Number.isNaN(mp) || mp < 0) {
    issues.push("member_price must be a non-negative number");
  } else {
    if (data.price != null && mp > data.price) issues.push("member_price is higher than price");
    data.member_price = mp;
  }

  const dur = parseInt(norm.duration_minutes, 10);
  if (!norm.duration_minutes) issues.push("duration_minutes is required");
  else if (Number.isNaN(dur) || dur <= 0) issues.push("duration_minutes must be a positive integer");
  else data.duration_minutes = dur;

  if (norm.service_group) data.service_group = norm.service_group;
  if (norm.description) data.description = norm.description;

  if (norm.gender) {
    const g = parseGender(norm.gender);
    if (!g) issues.push(`gender must be one of: ${GENDER_VALUES.join(", ")}`);
    else data.gender = g;
  }

  if (norm.service_code) {
    data.service_code = norm.service_code.toUpperCase();
    const byCode = existingByCode.get(data.service_code);
    if (byCode) matchId = byCode.id;
  }

  // Fall back to name match so Excel can update existing services without a code
  if (!matchId && data.service_name) {
    const byName = existingByName.get(data.service_name.toLowerCase());
    if (byName) {
      matchId = byName.id;
      if (!data.service_code) data.service_code = byName.serviceCode;
    }
  }

  if (norm.tax) {
    const tax = parseFloat(norm.tax);
    if (Number.isNaN(tax) || tax < 0 || tax > 100) issues.push("tax must be 0–100");
    else data.tax = tax;
  }

  if (norm.status) {
    const s = norm.status.toLowerCase();
    if (s !== "active" && s !== "inactive") issues.push("status must be active or inactive");
    else data.status = s;
  }

  const missingRequired = REQUIRED_HEADERS.some((h) => {
    const val = data[h as keyof BulkServiceRow];
    return val === undefined || val === null || val === "";
  });

  const hasHardError =
    missingRequired ||
    issues.some(
      (i) =>
        !i.includes("defaulted") &&
        !i.includes("higher than price") &&
        !i.includes("will be created on import"),
    );

  const status: RowStatus = hasHardError ? "error" : issues.length > 0 ? "warning" : "valid";

  return { raw, data, status, issues, index, matchId };
}

function parseFile(
  file: File,
  validCategories: string[],
  existingByCode: Map<string, ExistingBulkService>,
  existingByName: Map<string, ExistingBulkService>,
): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName =
          wb.SheetNames.find((n) => n.toLowerCase() === "services") ?? wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (json.length === 0) return reject(new Error("File is empty or has no data rows."));
        resolve(
          json.map((row, i) =>
            parseRow(row, i + 2, validCategories, existingByCode, existingByName),
          ),
        );
      } catch {
        reject(new Error("Could not parse file. Make sure it's a valid .xlsx or .csv file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

export type BulkImportProgress = {
  current: number;
  total: number;
};

export type BulkImportResult = {
  created: number;
  updated: number;
  failed: number;
};

type Step = "upload" | "preview" | "importing" | "done";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (
    rows: BulkServiceRow[],
    onProgress: (progress: BulkImportProgress) => void,
  ) => Promise<BulkImportResult>;
  existingServices?: ExistingBulkService[];
  categoryNames: string[];
}

export function BulkUploadServices({
  open,
  onClose,
  onImport,
  existingServices = [],
  categoryNames,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState({ added: 0, updated: 0, skipped: 0, warnings: 0 });
  const [importProgress, setImportProgress] = useState<BulkImportProgress>({ current: 0, total: 0 });
  const importingRef = useRef(false);

  const existingByCode = useMemo(() => {
    const map = new Map<string, ExistingBulkService>();
    for (const s of existingServices) {
      if (s.serviceCode) map.set(s.serviceCode.toUpperCase(), s);
    }
    return map;
  }, [existingServices]);

  const existingByName = useMemo(() => {
    const map = new Map<string, ExistingBulkService>();
    for (const s of existingServices) {
      if (s.displayName) map.set(s.displayName.toLowerCase(), s);
    }
    return map;
  }, [existingServices]);

  const validRows = rows.filter((r) => r.status !== "error");
  const errorRows = rows.filter((r) => r.status === "error");
  const warningRows = rows.filter((r) => r.status === "warning");
  const updateRows = validRows.filter((r) => Boolean(r.matchId));
  const createRows = validRows.filter((r) => !r.matchId);

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
      const parsed = await parseFile(file, categoryNames, existingByCode, existingByName);
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
    if (file) void handleFile(file);
  }

  async function handleConfirm() {
    if (importingRef.current) return;
    importingRef.current = true;

    const toImport = validRows.map((r) => r.data as BulkServiceRow);
    setImportProgress({ current: 0, total: toImport.length });
    setStep("importing");

    try {
      const result = await onImport(toImport, (progress) => {
        setImportProgress({ ...progress });
      });
      setImportResult({
        added: result.created,
        updated: result.updated,
        skipped: errorRows.length + result.failed,
        warnings: warningRows.length,
      });
      setStep("done");
    } catch {
      setStep("preview");
    } finally {
      importingRef.current = false;
    }
  }

  function reset() {
    if (importingRef.current) return;
    setStep("upload");
    setRows([]);
    setFileName("");
    setParseError("");
    setImportProgress({ current: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!open) return null;

  const progressPct =
    importProgress.total > 0
      ? Math.min(100, Math.round((importProgress.current / importProgress.total) * 100))
      : 0;

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
              {(["upload", "preview", "done"] as const).map((s, i) => {
                const activeStep =
                  step === "importing" ? "preview" : step;
                return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                    activeStep === s ? "bg-[#d4af37] border-[#d4af37] text-[#111]"
                    : (["upload","preview","done"].indexOf(activeStep) > i) ? "bg-[#d4af37]/20 border-[#d4af37]/40 text-[#d4af37]"
                    : "bg-white/[0.06] border-white/[0.1] text-white/25"
                  }`}>{i + 1}</div>
                  {i < 2 && <ChevronRight className="h-3 w-3 text-white/20" />}
                </div>
              );})}
            </div>
            <button
              type="button"
              disabled={step === "importing"}
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-white flex items-center justify-center transition-all disabled:opacity-30"
            >
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
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Excel with Services + Instructions sheets aligned to the database
                    </p>
                  </div>
                  <button onClick={() => downloadTemplate(categoryNames)}
                    className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#1a1a1a] text-[#d4af37] text-[12px] font-bold hover:bg-[#2a2a2a] transition-all shrink-0">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </div>

                {/* Headers reference */}
                <div className="rounded-xl border border-gray-100 bg-[#fafaf8] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-white">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">Column Headers</p>
                  </div>
                  <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 sm:grid-cols-2">
                    {[
                      { h: "service_name", req: true, note: "Display name in UI / billing" },
                      { h: "category", req: true, note: "Any name OK — new categories are created automatically" },
                      { h: "service_group", req: false, note: "e.g. Face, Cut" },
                      { h: "price", req: true, note: "Selling price ₹" },
                      { h: "member_price", req: false, note: "Defaults to 90% of price" },
                      { h: "duration_minutes", req: true, note: "Duration in minutes" },
                      { h: "gender", req: false, note: "MALE | FEMALE | UNISEX" },
                      { h: "service_code", req: false, note: "Match to update; else create" },
                      { h: "description", req: false, note: "Optional notes" },
                      { h: "tax", req: false, note: "Tax % 0–100" },
                      { h: "status", req: false, note: "active | inactive" },
                    ].map(({ h, req, note }) => (
                      <div key={h} className="flex items-center gap-3 px-4 py-2.5">
                        <code className="text-[11px] font-mono font-bold text-[#1a1a1a] bg-gray-100 px-1.5 py-0.5 rounded">{h}</code>
                        {req ? <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 rounded-full">required</span>
                             : <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 rounded-full">optional</span>}
                        <span className="text-[11px] text-gray-400 ml-auto truncate max-w-[45%] text-right" title={note}>{note}</span>
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

                {/* Update / create summary — never deletes */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-[12px] text-blue-900">
                  <p className="font-semibold">Existing services are kept. Nothing is deleted.</p>
                  <p className="mt-1 text-blue-800/90">
                    {updateRows.length} will be <span className="font-bold">updated</span>
                    {" · "}
                    {createRows.length} will be <span className="font-bold">created</span>
                    {errorRows.length > 0 ? ` · ${errorRows.length} with errors skipped` : ""}
                  </p>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                    <table className="w-full text-[12px]">
                      <thead className="sticky top-0 bg-[#1a1a1a] text-white z-10">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-semibold w-8">#</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Service Name</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Category</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Code</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Price</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Member ₹</th>
                          <th className="text-right px-3 py-2.5 font-semibold">Mins</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((row, i) => {
                          return (
                            <tr
                              key={i}
                              className={`border-b border-gray-100 ${
                                row.status === "error"
                                  ? "bg-red-50/60"
                                  : row.status === "warning"
                                    ? "bg-amber-50/40"
                                    : row.matchId
                                      ? "bg-blue-50/40"
                                      : i % 2 === 0
                                        ? "bg-white"
                                        : "bg-gray-50/40"
                              }`}
                            >
                              <td className="px-3 py-2 text-gray-400 tabular-nums">{row.index}</td>
                              <td className="px-3 py-2 font-semibold text-[#111]">
                                {row.data.service_name || (
                                  <span className="text-red-400 italic">missing</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {row.data.category ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    {row.data.category}
                                  </span>
                                ) : (
                                  <span className="text-red-400 italic text-[10px]">invalid</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-[10px] text-gray-500">
                                {row.data.service_code || "—"}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {row.data.price != null ? `₹${row.data.price}` : <span className="text-red-400">—</span>}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-500">
                                {row.data.member_price != null ? `₹${row.data.member_price}` : "—"}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500">
                                {row.data.duration_minutes ? `${row.data.duration_minutes}m` : <span className="text-red-400">—</span>}
                              </td>
                              <td className="px-3 py-2">
                                {row.status === "error" && (
                                  <span title={row.issues.join("\n")} className="flex items-center gap-1 text-red-500 text-[10px] font-bold cursor-help">
                                    <XCircle className="h-3 w-3" />Error
                                  </span>
                                )}
                                {row.status !== "error" && row.matchId && (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                    Update
                                  </span>
                                )}
                                {row.status !== "error" && !row.matchId && (
                                  <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                    Create
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

            {/* ── STEP: IMPORTING ── */}
            {step === "importing" && (
              <motion.div
                key="importing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-10 flex flex-col items-center text-center gap-5"
              >
                <RefreshCw className="h-10 w-10 text-[#d4af37] animate-spin" />
                <div>
                  <h3 className="text-[18px] font-bold text-[#1a1a1a]">Importing services…</h3>
                  <p className="text-[13px] text-gray-500 mt-1">
                    Please wait — do not close or click Import again
                  </p>
                </div>
                <div className="w-full max-w-md space-y-2">
                  <div className="flex items-center justify-between text-[12px] font-semibold text-gray-600">
                    <span>
                      {importProgress.current} / {importProgress.total}
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#b8962e] transition-[width] duration-200 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
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
                  <p className="text-[13px] text-gray-500 mt-1">
                    Existing services were updated — nothing was deleted
                  </p>
                </div>
                <div className="flex gap-4 flex-wrap justify-center">
                  {importResult.updated > 0 && (
                    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="text-2xl font-bold text-blue-600">{importResult.updated}</span>
                      <span className="text-[11px] text-blue-600 font-semibold">Updated</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-green-50 border border-green-100">
                    <span className="text-2xl font-bold text-green-600">{importResult.added}</span>
                    <span className="text-[11px] text-green-600 font-semibold">Created</span>
                  </div>
                  {importResult.skipped > 0 && (
                    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-2xl font-bold text-gray-500">{importResult.skipped}</span>
                      <span className="text-[11px] text-gray-500 font-semibold">Errors skipped</span>
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
                <button type="button" onClick={onClose} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
              </>
            )}
            {step === "preview" && (
              <>
                <button type="button" onClick={reset} className="h-10 px-4 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Upload different file
                </button>
                <div className="flex gap-2.5">
                  <button type="button" onClick={onClose} className="h-10 px-5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                  <button
                    type="button"
                    onClick={() => void handleConfirm()}
                    disabled={validRows.length === 0 || importingRef.current}
                    className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[13px] font-bold text-black disabled:opacity-40 hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Import {validRows.length} row{validRows.length === 1 ? "" : "s"}
                    {updateRows.length > 0 ? ` · ${updateRows.length} update` : ""}
                    {createRows.length > 0 ? ` · ${createRows.length} create` : ""}
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
