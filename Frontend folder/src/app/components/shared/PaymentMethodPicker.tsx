import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  QrCode,
  Wallet,
  Split,
} from "lucide-react";
import { cn } from "../ui/utils";
import { BRAND } from "../../config/brand";
import { formatInr } from "../../../lib/inventoryMappers";

/** Merchant UPI ID used in dynamic payment QR codes. */
export const UPI_VPA = "starrkuts1ms@fbl";  // this is the UPI ID of the merchant
export const UPI_PAYEE_NAME = "Marchent Name";

export type PayMethod = "cash" | "card" | "upi" | "wallet" | "split";
/** Methods allowed inside a split bill (cash + UPI for V1). */
export type SplitPayMethod = "cash" | "upi" | "card" | "wallet";

export interface SplitRow {
  method: SplitPayMethod;
  amount: string;
  ref: string;
}

export interface PaymentMethodValue {
  method: PayMethod;
  cashReceived: string;
  upiRefId: string;
  cardType: "debit" | "credit";
  cardRefId: string;
  walletProvider: string;
  walletRefId: string;
  splitRows: SplitRow[];
  /** Split bill: manager confirmed customer paid the UPI portion after scanning QR. */
  splitUpiConfirmed?: boolean;
}

export const DEFAULT_SPLIT_ROWS: SplitRow[] = [
  { method: "cash", amount: "", ref: "" },
  { method: "upi", amount: "", ref: "" },
];

export const DEFAULT_PAYMENT_METHOD_VALUE: PaymentMethodValue = {
  method: "cash",
  cashReceived: "",
  upiRefId: "",
  cardType: "debit",
  cardRefId: "",
  walletProvider: "Paytm",
  walletRefId: "",
  splitRows: DEFAULT_SPLIT_ROWS.map((r) => ({ ...r })),
  splitUpiConfirmed: false,
};

export function createPaymentMethodValue(
  patch?: Partial<PaymentMethodValue>,
): PaymentMethodValue {
  return {
    ...DEFAULT_PAYMENT_METHOD_VALUE,
    splitRows: DEFAULT_PAYMENT_METHOD_VALUE.splitRows.map((r) => ({ ...r })),
    ...patch,
  };
}

/** Checkout payment rows for the API — one row per method, or multiple for split. */
export function buildBillingPayments(
  value: PaymentMethodValue,
  amountDue: number,
): Array<{ paymentMethod: "cash" | "card" | "upi" | "wallet"; amount: number; reference?: string }> {
  if (amountDue <= 0) {
    return [{ paymentMethod: "cash", amount: 0 }];
  }
  if (value.method === "split") {
    return value.splitRows
      .filter((r) => parseFloat(r.amount) > 0)
      .map((r) => ({
        paymentMethod: r.method === "upi" ? ("upi" as const) : ("cash" as const),
        amount: parseFloat(r.amount),
        reference: r.ref || undefined,
      }));
  }
  return [
    {
      paymentMethod: primaryPayMethod(value),
      amount: amountDue,
      reference: paymentMethodReference(value),
    },
  ];
}

export function buildUpiUri(amount: number, note: string) {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const payeeName = UPI_PAYEE_NAME || BRAND.appName;
  const txnNote = (note || `${BRAND.appName} payment`).slice(0, 80);
  // Personal UPI collect intent — do NOT send `mc` (merchant code) or gateway
  // `tr` values; those cause "no payment account registered" on PhonePe/GPay.
  // Keep `pa` unencoded (`@` must stay literal). Encode only pn/tn.
  return [
    "upi://pay?pa=",
    UPI_VPA.trim(),
    "&pn=",
    encodeURIComponent(payeeName),
    "&am=",
    safeAmount.toFixed(2),
    "&cu=INR",
    "&tn=",
    encodeURIComponent(txnNote),
  ].join("");
}

function formatCashDue(amountDue: number): string {
  return Number.isInteger(amountDue) ? String(amountDue) : amountDue.toFixed(2);
}

/** Split bill always has cash first, UPI second. */
function ensureSplitRows(rows: SplitRow[]): [SplitRow, SplitRow] {
  const cash = rows.find((r) => r.method === "cash") ?? { method: "cash", amount: "", ref: "" };
  const upi = rows.find((r) => r.method === "upi") ?? { method: "upi", amount: "", ref: "" };
  return [cash, upi];
}

/** Cash received amount — empty field means exact bill total (same as UPI: ready to pay). */
export function resolvedCashReceived(value: PaymentMethodValue, amountDue: number): number {
  if (value.cashReceived === "") return amountDue;
  return parseFloat(value.cashReceived) || 0;
}

export function paymentMethodLabel(value: PaymentMethodValue, amountDue: number): string {
  const { method, upiRefId, cardType, cardRefId, walletProvider, walletRefId, splitRows } = value;
  if (method === "cash") {
    const received = resolvedCashReceived(value, amountDue);
    return `Cash (Rcvd ₹${received}, Chg ₹${Math.max(0, received - amountDue)})`;
  }
  if (method === "upi") return `UPI${upiRefId ? ` · Ref: ${upiRefId}` : ""}`;
  if (method === "card") {
    return `${cardType === "credit" ? "Credit" : "Debit"} Card${cardRefId ? ` · Ref: ${cardRefId}` : ""}`;
  }
  if (method === "wallet") {
    return `${walletProvider} Wallet${walletRefId ? ` · Ref: ${walletRefId}` : ""}`;
  }
  return splitRows
    .filter((r) => parseFloat(r.amount) > 0)
    .map((r) => `${r.method.toUpperCase()} ₹${parseFloat(r.amount)}`)
    .join(" + ");
}

export function paymentMethodReference(value: PaymentMethodValue): string | undefined {
  if (value.method === "upi") return value.upiRefId || undefined;
  if (value.method === "card") return value.cardRefId || undefined;
  if (value.method === "wallet") return value.walletRefId || undefined;
  return undefined;
}

export function primaryPayMethod(value: PaymentMethodValue): SplitPayMethod {
  if (value.method === "split") {
    const first = value.splitRows.find((r) => parseFloat(r.amount) > 0);
    return first?.method ?? "cash";
  }
  return value.method;
}

export function isPaymentMethodValid(value: PaymentMethodValue, amountDue: number): boolean {
  if (amountDue < 0) return false;
  if (value.method === "cash") {
    if (amountDue === 0) return true;
    // Empty = exact due (Pay works like UPI without forcing a typed amount)
    return resolvedCashReceived(value, amountDue) >= amountDue;
  }
  if (value.method === "split") {
    const [cash, upi] = ensureSplitRows(value.splitRows);
    const cashAmt = parseFloat(cash.amount) || 0;
    const upiAmt = parseFloat(upi.amount) || 0;
    if (cashAmt <= 0 || upiAmt <= 0) return false;
    const total = cashAmt + upiAmt;
    if (Math.abs(total - amountDue) >= 1) return false;
    if (upiAmt > 0 && !value.splitUpiConfirmed) return false;
    return true;
  }
  return true;
}

const METHOD_OPTIONS: { id: PayMethod; label: string; Icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", Icon: Banknote },
  { id: "card", label: "Card", Icon: CreditCard },
  { id: "upi", label: "UPI", Icon: QrCode },
  { id: "wallet", label: "Wallet", Icon: Wallet },
  { id: "split", label: "Split", Icon: Split },
];

const WALLET_PROVIDERS = ["Paytm", "Amazon Pay", "PhonePe", "Mobikwik"] as const;

/** Checkout bill methods: cash, UPI, or split (cash + UPI). Card removed from V1 billing. */
export const BILL_PAY_METHODS: PayMethod[] = ["cash", "upi", "split"];

interface PaymentMethodPickerProps {
  amountDue: number;
  value: PaymentMethodValue;
  onChange: (next: PaymentMethodValue) => void;
  /** Methods to show. Defaults to all five (Billing page). */
  methods?: PayMethod[];
  /** Label for the amount field in cash panel. */
  amountFieldLabel?: string;
  /**
   * Collect-pending layout: stack cash fields vertically and hide the redundant
   * third “bill amount” column (amount is already chosen above the picker).
   */
  collectMode?: boolean;
  /** Note embedded in UPI QR. */
  upiNote?: string;
  /** Show the "Payment Method" header + due badge. */
  showHeader?: boolean;
  /** Hide Cash/Card/UPI choices, used by the customer-facing QR-only view. */
  hideMethodTabs?: boolean;
  /** Remove manager-only controls such as the UPI reference field. */
  qrOnly?: boolean;
  /** Opens the dedicated customer-facing QR screen instead of showing QR inline. */
  onOpenQr?: () => void;
  /**
   * Fill the parent's remaining height instead of sizing to content. The UPI QR
   * then grows to whatever space is left, so a scroll-free checkout can still
   * show a large, easy-to-scan code. Applies from tablet width up; phones scroll.
   */
  fluid?: boolean;
  className?: string;
}

export function PaymentMethodPicker({
  amountDue,
  value,
  onChange,
  methods = ["cash", "card", "upi", "wallet", "split"],
  amountFieldLabel = "Bill Amount",
  collectMode = false,
  upiNote,
  showHeader = true,
  hideMethodTabs = false,
  qrOnly = false,
  onOpenQr,
  fluid = false,
  className,
}: PaymentMethodPickerProps) {
  const options = METHOD_OPTIONS.filter((m) => methods.includes(m.id));
  const cols = options.length;

  const patch = (partial: Partial<PaymentMethodValue>) => {
    onChange({ ...value, ...partial });
  };

  const updateSplitRow = (kind: "cash" | "upi", partial: Partial<SplitRow>) => {
    const [cash, upi] = ensureSplitRows(value.splitRows);
    const resetUpiConfirmed = partial.amount !== undefined ? { splitUpiConfirmed: false } : {};

    if (kind === "cash") {
      const nextCash = { ...cash, ...partial };
      let nextUpi = upi;
      if (partial.amount !== undefined) {
        const typed = parseFloat(partial.amount);
        if (Number.isFinite(typed) && typed >= 0 && typed <= amountDue) {
          const remaining = Math.max(0, Math.round((amountDue - typed) * 100) / 100);
          nextUpi = { ...upi, amount: remaining > 0 ? String(remaining) : "" };
        }
      }
      onChange({ ...value, ...resetUpiConfirmed, splitRows: [nextCash, nextUpi] });
      return;
    }
    const nextUpi = { ...upi, ...partial };
    let nextCash = cash;
    if (partial.amount !== undefined) {
      const typed = parseFloat(partial.amount);
      if (Number.isFinite(typed) && typed >= 0 && typed <= amountDue) {
        const remaining = Math.max(0, Math.round((amountDue - typed) * 100) / 100);
        nextCash = { ...cash, amount: remaining > 0 ? String(remaining) : "" };
      }
    }
    onChange({ ...value, ...resetUpiConfirmed, splitRows: [nextCash, nextUpi] });
  };

  const [splitUpiQrOpen, setSplitUpiQrOpen] = useState(false);

  const prevDueRef = useRef(amountDue);
  const cashFocusedRef = useRef(false);

  // Autofill bill total for cash, but never fight the manager while they edit tender
  useEffect(() => {
    const prevDue = prevDueRef.current;
    prevDueRef.current = amountDue;

    if (value.method !== "cash" || amountDue <= 0) return;
    if (cashFocusedRef.current) return;

    const dueStr = formatCashDue(amountDue);
    const raw = value.cashReceived.trim();
    const received = raw === "" ? null : parseFloat(raw);
    const matchesPrevDue =
      received !== null && Number.isFinite(received) && Math.abs(received - prevDue) < 0.005;

    // Prefill empty, or bump when bill total changed and tender was still the old autofill total
    if (raw === "" || matchesPrevDue) {
      if (value.cashReceived !== dueStr) onChange({ ...value, cashReceived: dueStr });
      return;
    }

    // Bill went up and custom tender is now short — lift to new due
    if (received !== null && Number.isFinite(received) && received < amountDue) {
      onChange({ ...value, cashReceived: dueStr });
    }
  }, [value.method, amountDue]); // eslint-disable-line react-hooks/exhaustive-deps

  const cashReceived = resolvedCashReceived(value, amountDue);
  const cashChange = cashReceived - amountDue;
  const splitTotal = value.splitRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const splitRemaining = amountDue - splitTotal;

  // Close split UPI QR when leaving split mode or UPI amount cleared
  useEffect(() => {
    if (value.method !== "split") setSplitUpiQrOpen(false);
  }, [value.method]);

  // Height-filling kicks in from tablet up; phones still scroll.
  const fillsHeight = fluid && value.method === "upi";

  return (
    <div className={cn(fluid && "md:flex md:min-h-0 md:flex-col", className)}>
      {showHeader && (
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">Payment Method</h4>
          <span className="rounded-full border border-[#D4AF37]/30 bg-[#FFFBEB] px-2.5 py-0.5 text-[10px] font-bold text-[#9a7a1e]">
            Due {formatInr(amountDue)}
          </span>
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm",
          fillsHeight && "md:flex md:min-h-0 md:flex-1 md:flex-col",
        )}
      >
        {!hideMethodTabs && (
          <div
            className="gap-1.5 border-b border-black/[0.06] bg-[#faf9f7] p-3 grid shrink-0"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {options.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === "cash") {
                    // Fresh cash selection starts at bill total; manager can edit after
                    patch({ method: id, cashReceived: formatCashDue(amountDue) });
                    return;
                  }
                  if (id === "split") {
                    patch({
                      method: id,
                      splitRows: DEFAULT_SPLIT_ROWS.map((r) => ({ ...r })),
                      splitUpiConfirmed: false,
                    });
                    setSplitUpiQrOpen(false);
                    return;
                  }
                  patch({ method: id });
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border py-2 transition-all",
                  value.method === id
                    ? "border-[#111118] bg-[#111118] text-[#D4AF37] shadow-sm"
                    : "border-black/[0.08] bg-white text-[#9a9a9a] hover:border-[#D4AF37]/30 hover:text-[#111118]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[8px] font-bold leading-none sm:text-[9px]">{label}</span>
              </button>
            ))}
          </div>
        )}

        <div className={cn("p-4", fillsHeight && "md:flex md:min-h-0 md:flex-1 md:flex-col")}>
          {value.method === "cash" && (
            <div className={cn("grid gap-3", collectMode ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3")}>
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">
                  Amount Received
                </p>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#9a9a9a]">
                    ₹
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={value.cashReceived}
                    onFocus={() => {
                      cashFocusedRef.current = true;
                    }}
                    onBlur={() => {
                      cashFocusedRef.current = false;
                      // If cleared, restore bill total so Pay stays ready
                      if (value.cashReceived.trim() === "" && amountDue > 0) {
                        patch({ cashReceived: formatCashDue(amountDue) });
                      }
                    }}
                    onChange={(e) => patch({ cashReceived: e.target.value })}
                    placeholder={amountDue.toLocaleString("en-IN")}
                    className="h-10 w-full rounded-lg border border-black/[0.08] bg-[#faf9f7] pl-7 pr-3 text-[13px] font-bold text-[#111118] outline-none focus:border-[#00C896]/50 focus:ring-1 focus:ring-[#00C896]/15"
                  />
                </div>
              </div>
              {collectMode ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">
                      Change to Return
                    </p>
                    <div
                      className={cn(
                        "flex h-10 items-center rounded-lg border px-3 text-[13px] font-black tabular-nums",
                        cashChange >= 0
                          ? "border-[#00C896]/35 bg-[#00C896]/5 text-[#00C896]"
                          : "border-red-200 bg-red-50 text-red-600",
                      )}
                    >
                      {cashChange >= 0 ? formatInr(cashChange) : "Insufficient"}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">
                      {amountFieldLabel}
                    </p>
                    <div className="flex h-10 items-center rounded-lg border border-[#D4AF37]/30 bg-[#FFFBEB] px-3 text-[14px] font-black tabular-nums text-[#9a7a1e]">
                      {formatInr(amountDue)}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">
                      Change to Return
                    </p>
                    <div
                      className={cn(
                        "flex h-10 items-center rounded-lg border px-3 text-[13px] font-black tabular-nums",
                        cashChange >= 0
                          ? "border-[#00C896]/35 bg-[#00C896]/5 text-[#00C896]"
                          : "border-red-200 bg-red-50 text-red-600",
                      )}
                    >
                      {cashChange >= 0 ? formatInr(cashChange) : "Insufficient"}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">
                      {amountFieldLabel}
                    </p>
                    <div className="flex h-10 items-center rounded-lg border border-[#D4AF37]/30 bg-[#FFFBEB] px-3 text-[14px] font-black tabular-nums text-[#9a7a1e]">
                      {formatInr(amountDue)}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {value.method === "upi" && !qrOnly && onOpenQr && (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-600 shadow-sm">
                <QrCode className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-bold text-[#111118]">UPI selected</p>
                <p className="mt-0.5 text-[11px] text-gray-500">Open a clean customer screen to scan and pay</p>
              </div>
              <button
                type="button"
                onClick={onOpenQr}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#111118] px-5 text-[12px] font-bold text-[#D4AF37] shadow-sm transition-colors hover:bg-[#24242c]"
              >
                <QrCode className="h-4 w-4" />
                Full-screen QR for the customer
              </button>
            </div>
          )}

          {value.method === "upi" && (qrOnly || !onOpenQr) && (
            <div
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4",
                fillsHeight && "md:min-h-0 md:flex-1",
                qrOnly && "min-h-0 flex-1 justify-center",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center",
                  fillsHeight && "md:min-h-0 md:flex-1",
                  qrOnly && "min-h-0 w-full flex-1",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-2xl border border-blue-200 bg-white p-4 shadow-sm",
                    qrOnly
                      ? "h-[min(72vw,420px)] w-[min(72vw,420px)] sm:h-[min(70vh,480px)] sm:w-[min(70vh,480px)]"
                      : "h-72 w-72 sm:h-80 sm:w-80",
                    fillsHeight &&
                      "md:aspect-square md:h-full md:max-h-[520px] md:min-h-[320px] md:w-auto md:max-w-full",
                  )}
                >
                  <QRCodeSVG
                    value={buildUpiUri(
                      amountDue,
                      upiNote ?? `${BRAND.appName} payment`,
                    )}
                    size={480}
                    level="M"
                    includeMargin={false}
                    className="h-full w-full"
                  />
                </div>
              </div>
              <div className="shrink-0 text-center">
                <p className="text-[22px] font-black leading-none tabular-nums text-[#111]">
                  {formatInr(amountDue)}
                </p>
                <p className="mt-1.5 text-[13px] font-bold text-[#111118]">{UPI_VPA}</p>
                <p className="text-[11px] font-medium text-gray-500">
                  Scan &amp; Pay via GPay / PhonePe / Paytm
                </p>
              </div>
              {!qrOnly && (
                <input
                  value={value.upiRefId}
                  onChange={(e) => patch({ upiRefId: e.target.value })}
                  placeholder="Transaction / Reference ID (optional)"
                  className="h-9 w-full shrink-0 rounded-lg border border-blue-300 bg-white px-3 text-[12px] font-semibold text-[#111] outline-none focus:border-blue-500"
                />
              )}
            </div>
          )}

          {value.method === "card" && (
            <div className="space-y-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
              <div className="flex gap-2">
                {(["debit", "credit"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patch({ cardType: t })}
                    className={cn(
                      "flex-1 rounded-lg border-2 py-2 text-[11px] font-bold capitalize transition-all",
                      value.cardType === t
                        ? "border-[#111] bg-[#111] text-[#d4af37]"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                    )}
                  >
                    {t === "debit" ? "Debit Card" : "Credit Card"}
                  </button>
                ))}
              </div>
              <input
                value={value.cardRefId}
                onChange={(e) => patch({ cardRefId: e.target.value })}
                placeholder="Transaction reference (optional)"
                className="h-9 w-full rounded-lg border border-purple-300 bg-white px-3 text-[12px] font-semibold text-[#111] outline-none focus:border-purple-500"
              />
            </div>
          )}

          {value.method === "wallet" && (
            <div className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {WALLET_PROVIDERS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => patch({ walletProvider: w })}
                    className={cn(
                      "rounded-lg border-2 px-3 py-1.5 text-[11px] font-bold transition-all",
                      value.walletProvider === w
                        ? "border-[#111] bg-[#111] text-[#d4af37]"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <input
                value={value.walletRefId}
                onChange={(e) => patch({ walletRefId: e.target.value })}
                placeholder="Transaction reference (optional)"
                className="h-9 w-full rounded-lg border border-orange-300 bg-white px-3 text-[12px] font-semibold text-[#111] outline-none focus:border-orange-500"
              />
            </div>
          )}

          {value.method === "split" && (() => {
            const [cashRow, upiRow] = ensureSplitRows(value.splitRows);
            const upiAmount = parseFloat(upiRow.amount) || 0;
            const splitUpiDone = value.splitUpiConfirmed && upiAmount > 0;

            if (splitUpiQrOpen && upiAmount > 0) {
              return (
                <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-[#111118]">Scan UPI — {formatInr(upiAmount)}</p>
                    <span className="text-[10px] font-semibold text-gray-500">{UPI_VPA}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:h-64 sm:w-64">
                      <QRCodeSVG
                        value={buildUpiUri(upiAmount, upiNote ?? `${BRAND.appName} payment`)}
                        size={480}
                        level="M"
                        includeMargin={false}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                  <p className="text-center text-[11px] font-medium text-gray-500">
                    Scan &amp; Pay via GPay / PhonePe / Paytm
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitUpiQrOpen(false);
                      patch({ splitUpiConfirmed: true });
                    }}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111118] text-[12px] font-bold text-[#D4AF37] shadow-sm transition-colors hover:bg-[#24242c]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Done — UPI payment received
                  </button>
                </div>
              );
            }

            return (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Split (Cash + UPI) — {formatInr(amountDue)}
                </p>
                <span
                  className={cn(
                    "text-[10px] font-black tabular-nums",
                    Math.abs(splitRemaining) < 1
                      ? "text-green-600"
                      : splitRemaining > 0
                        ? "text-red-500"
                        : "text-orange-500",
                  )}
                >
                  {Math.abs(splitRemaining) < 1
                    ? "Balanced"
                    : splitRemaining > 0
                      ? `${formatInr(splitRemaining)} left`
                      : `${formatInr(Math.abs(splitRemaining))} over`}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-[11px] font-bold text-[#111]">
                    Cash
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={cashRow.amount}
                    onChange={(e) => updateSplitRow("cash", { amount: e.target.value })}
                    placeholder="Amount"
                    className="h-9 w-24 rounded-lg border border-gray-300 bg-white px-3 text-[12px] font-bold text-[#111] outline-none focus:border-[#d4af37]"
                  />
                  <input
                    value={cashRow.ref}
                    onChange={(e) => updateSplitRow("cash", { ref: e.target.value })}
                    placeholder="Ref (optional)"
                    className="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-[11px] text-[#111] outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 text-[11px] font-bold text-blue-700">
                    UPI
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={upiRow.amount}
                    onChange={(e) => updateSplitRow("upi", { amount: e.target.value })}
                    placeholder="Amount"
                    className="h-9 w-24 rounded-lg border border-gray-300 bg-white px-3 text-[12px] font-bold text-[#111] outline-none focus:border-[#d4af37]"
                  />
                  {splitUpiDone ? (
                    <span className="flex h-9 flex-1 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 text-[11px] font-bold text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      UPI payment done
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={upiAmount <= 0}
                      onClick={() => setSplitUpiQrOpen(true)}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 text-[11px] font-bold text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <QrCode className="h-3.5 w-3.5 shrink-0" />
                      Show QR code
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
