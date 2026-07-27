import { QRCodeSVG } from "qrcode.react";
import {
  Banknote,
  CreditCard,
  QrCode,
  Wallet,
  Phone,
  X,
} from "lucide-react";
import { cn } from "../ui/utils";
import { BRAND } from "../../config/brand";
import { formatInr } from "../../../lib/inventoryMappers";

/** Merchant UPI ID used in dynamic payment QR codes. */
export const UPI_VPA = "starrkuts1ms@fbl";  // this is the UPI ID of the merchant
export const UPI_PAYEE_NAME = "Marchent Name";

export type PayMethod = "cash" | "card" | "upi" | "wallet" | "split";
export type SplitPayMethod = Exclude<PayMethod, "split">;

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
}

export const DEFAULT_PAYMENT_METHOD_VALUE: PaymentMethodValue = {
  method: "cash",
  cashReceived: "",
  upiRefId: "",
  cardType: "debit",
  cardRefId: "",
  walletProvider: "Paytm",
  walletRefId: "",
  splitRows: [
    { method: "cash", amount: "", ref: "" },
    { method: "upi", amount: "", ref: "" },
  ],
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

export function paymentMethodLabel(value: PaymentMethodValue, amountDue: number): string {
  const { method, cashReceived, upiRefId, cardType, cardRefId, walletProvider, walletRefId, splitRows } = value;
  if (method === "cash") {
    const received = parseFloat(cashReceived) || 0;
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
    return value.cashReceived !== "" && (parseFloat(value.cashReceived) || 0) >= amountDue;
  }
  if (value.method === "split") {
    const total = value.splitRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    return Math.abs(total - amountDue) < 1;
  }
  return true;
}

const METHOD_OPTIONS: { id: PayMethod; label: string; Icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", Icon: Banknote },
  { id: "card", label: "Card", Icon: CreditCard },
  { id: "upi", label: "UPI", Icon: QrCode },
  { id: "wallet", label: "Wallet", Icon: Wallet },
  { id: "split", label: "Split", Icon: Phone },
];

const WALLET_PROVIDERS = ["Paytm", "Amazon Pay", "PhonePe", "Mobikwik"] as const;

interface PaymentMethodPickerProps {
  amountDue: number;
  value: PaymentMethodValue;
  onChange: (next: PaymentMethodValue) => void;
  /** Methods to show. Defaults to all five (Billing page). */
  methods?: PayMethod[];
  /** Label for the amount field in cash panel. */
  amountFieldLabel?: string;
  /** Note embedded in UPI QR. */
  upiNote?: string;
  /** Show the "Payment Method" header + due badge. */
  showHeader?: boolean;
  className?: string;
}

export function PaymentMethodPicker({
  amountDue,
  value,
  onChange,
  methods = ["cash", "card", "upi", "wallet", "split"],
  amountFieldLabel = "Bill Amount",
  upiNote,
  showHeader = true,
  className,
}: PaymentMethodPickerProps) {
  const options = METHOD_OPTIONS.filter((m) => methods.includes(m.id));
  const cols = options.length;

  const patch = (partial: Partial<PaymentMethodValue>) => {
    onChange({ ...value, ...partial });
  };

  const setSplitRows = (rows: SplitRow[]) => patch({ splitRows: rows });

  const cashReceived = parseFloat(value.cashReceived) || 0;
  const cashChange = cashReceived - amountDue;
  const splitTotal = value.splitRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const splitRemaining = amountDue - splitTotal;

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a9a9a]">Payment Method</h4>
          <span className="rounded-full border border-[#D4AF37]/30 bg-[#FFFBEB] px-2.5 py-0.5 text-[10px] font-bold text-[#9a7a1e]">
            Due {formatInr(amountDue)}
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
        <div
          className="gap-1.5 border-b border-black/[0.06] bg-[#faf9f7] p-3 grid"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {options.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => patch({ method: id })}
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

        <div className="p-4">
          {value.method === "cash" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Amount Received</p>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#9a9a9a]">₹</span>
                  <input
                    type="number"
                    value={value.cashReceived}
                    onChange={(e) => patch({ cashReceived: e.target.value })}
                    placeholder={amountDue.toLocaleString("en-IN")}
                    className="h-10 w-full rounded-lg border border-black/[0.08] bg-[#faf9f7] pl-7 pr-3 text-[13px] font-bold text-[#111118] outline-none focus:border-[#00C896]/50 focus:ring-1 focus:ring-[#00C896]/15"
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">Change to Return</p>
                <div
                  className={cn(
                    "flex h-10 items-center rounded-lg border px-3 text-[13px] font-black tabular-nums",
                    !value.cashReceived
                      ? "border-black/[0.08] bg-[#faf9f7] text-[#9a9a9a]"
                      : cashChange >= 0
                        ? "border-[#00C896]/35 bg-[#00C896]/5 text-[#00C896]"
                        : "border-red-200 bg-red-50 text-red-600",
                  )}
                >
                  {!value.cashReceived ? "—" : cashChange >= 0 ? formatInr(cashChange) : "Insufficient"}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#9a9a9a]">{amountFieldLabel}</p>
                <div className="flex h-10 items-center rounded-lg border border-[#D4AF37]/30 bg-[#FFFBEB] px-3 text-[14px] font-black tabular-nums text-[#9a7a1e]">
                  {formatInr(amountDue)}
                </div>
              </div>
            </div>
          )}

          {value.method === "upi" && (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white p-3 shadow-sm sm:h-48 sm:w-48">
                  <QRCodeSVG
                    value={buildUpiUri(
                      amountDue,
                      upiNote ?? `${BRAND.appName} payment`,
                    )}
                    size={176}
                    level="M"
                    includeMargin={false}
                    className="h-40 w-40 sm:h-44 sm:w-44"
                  />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-[11px] font-medium text-gray-500">
                    Scan &amp; Pay via GPay / PhonePe / Paytm
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-[#111118]">{UPI_VPA}</p>
                  <p className="text-[12px] text-[#6b6b6b]">{UPI_PAYEE_NAME}</p>
                  <p className="mt-2 text-[20px] font-black tabular-nums text-[#111]">
                    {formatInr(amountDue)}
                  </p>
                </div>
              </div>
              <input
                value={value.upiRefId}
                onChange={(e) => patch({ upiRefId: e.target.value })}
                placeholder="Transaction / Reference ID (optional)"
                className="h-9 w-full rounded-lg border border-blue-300 bg-white px-3 text-[12px] font-semibold text-[#111] outline-none focus:border-blue-500"
              />
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

          {value.method === "split" && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Split — {formatInr(amountDue)}
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
              {value.splitRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={row.method}
                    onChange={(e) =>
                      setSplitRows(
                        value.splitRows.map((r, j) =>
                          j === i ? { ...r, method: e.target.value as SplitPayMethod } : r,
                        ),
                      )
                    }
                    className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-[11px] font-bold text-[#111] outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="wallet">Wallet</option>
                  </select>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(e) =>
                      setSplitRows(
                        value.splitRows.map((r, j) =>
                          j === i ? { ...r, amount: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="Amount"
                    className="h-9 w-24 rounded-lg border border-gray-300 bg-white px-3 text-[12px] font-bold text-[#111] outline-none focus:border-[#d4af37]"
                  />
                  <input
                    value={row.ref}
                    onChange={(e) =>
                      setSplitRows(
                        value.splitRows.map((r, j) =>
                          j === i ? { ...r, ref: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder="Ref (optional)"
                    className="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-[11px] text-[#111] outline-none focus:border-[#d4af37]"
                  />
                  {value.splitRows.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setSplitRows(value.splitRows.filter((_, j) => j !== i))}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSplitRows([...value.splitRows, { method: "cash", amount: "", ref: "" }])
                }
                className="h-8 w-full rounded-lg border-2 border-dashed border-gray-300 text-[11px] font-bold text-gray-400 transition-all hover:border-[#d4af37] hover:text-[#9a7a1e]"
              >
                + Add payment row
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
