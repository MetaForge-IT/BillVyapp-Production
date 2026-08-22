import { BRAND, RECEIPT_FOOTER } from "../config/brand";
import {
  salonReceiptBrandHeaderHtml,
  type ReceiptShopInfo,
} from "../components/shared/SalonReceiptBrand";
import { receiptLinesForDisplay, type ReceiptLineItem } from "./receiptLineItems";

export interface DownloadableReceipt {
  receiptNo: string;
  date: string;
  time?: string;
  customer: string;
  phone?: string;
  services: string[];
  lineItems?: ReceiptLineItem[];
  subtotal?: number;
  discount?: number;
  gst?: number;
  total: number;
  paymentMethod?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function paymentLabel(method?: string): string {
  if (!method || method === "none") return "Unpaid";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

/** Builds a print-ready HTML document for a salon receipt. */
export function buildReceiptDocumentHtml(
  receipt: DownloadableReceipt,
  shop: ReceiptShopInfo,
  options?: { autoPrint?: boolean },
): string {
  const autoPrint = options?.autoPrint ?? false;
  const subtotal = receipt.subtotal ?? receipt.total;
  const discount = receipt.discount ?? 0;
  const gst = receipt.gst ?? 0;
  const dateLine = [receipt.date, receipt.time].filter(Boolean).join("  ");
  const lines = receiptLinesForDisplay(
    receipt.lineItems,
    receipt.services,
    subtotal,
  );
  const serviceRows = lines.map(
    (line) => `
      <div class="row">
        <span class="item">${escapeHtml(line.name)}</span>
        <span class="amt">${formatInr(line.amount)}</span>
      </div>`,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(receipt.receiptNo)} — ${escapeHtml(shop.name || BRAND.clientName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #faf9f7;
      color: #111118;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .paper {
      max-width: 360px;
      margin: 0 auto;
      background: #fff;
      border: 2px solid rgba(212,175,55,0.22);
      border-radius: 12px;
      padding: 18px 16px;
      box-shadow: 0 10px 28px rgba(17,17,24,0.08);
    }
    .center { text-align: center; }
    .heavy { font-weight: 800; }
    .muted { color: #9a9a9a; }
    .gold { color: #9a7d20; }
    .dash { border-top: 1px dashed rgba(212,175,55,0.35); margin: 12px 0; }
    .row { display: flex; justify-content: space-between; gap: 12px; font-size: 11px; margin: 4px 0; }
    .item { flex: 1; text-align: left; font-weight: 600; text-transform: uppercase; }
    .amt { white-space: nowrap; font-weight: 700; }
    .total { font-size: 13px; font-weight: 900; border-top: 1px solid rgba(212,175,55,0.35); padding-top: 8px; margin-top: 6px; }
    @media print {
      body { background: #fff; padding: 0; }
      .paper { box-shadow: none; border-color: #ddd; }
    }
  </style>
</head>
<body>
  <div class="paper">
    ${salonReceiptBrandHeaderHtml(shop)}
    <div class="dash"></div>
    <div class="row"><span class="muted">Receipt No.</span><span class="heavy">${escapeHtml(receipt.receiptNo)}</span></div>
    <div class="row"><span class="muted">Date</span><span class="heavy">${escapeHtml(dateLine)}</span></div>
    <div class="row"><span class="muted">Customer</span><span class="heavy">${escapeHtml(receipt.customer)}</span></div>
    ${receipt.phone ? `<div class="row"><span class="muted">Phone</span><span>${escapeHtml(receipt.phone)}</span></div>` : ""}
    <div class="row"><span class="muted">Payment</span><span class="heavy">${escapeHtml(paymentLabel(receipt.paymentMethod).toUpperCase())}</span></div>
    <div class="dash"></div>
    <div class="row muted" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">
      <span>Description</span><span>Amount</span>
    </div>
    ${serviceRows.join("")}
    <div class="dash"></div>
    <div class="row"><span class="muted">Subtotal</span><span>${formatInr(subtotal)}</span></div>
    ${discount > 0 ? `<div class="row"><span class="muted">Discount</span><span>-${formatInr(discount)}</span></div>` : ""}
    ${gst > 0 ? `<div class="row"><span class="muted">GST</span><span>+${formatInr(gst)}</span></div>` : ""}
    <div class="row total"><span>GRAND TOTAL</span><span class="gold">${formatInr(receipt.total)}</span></div>
    <div class="row"><span class="muted">Paid (${escapeHtml(paymentLabel(receipt.paymentMethod))})</span><span>${formatInr(receipt.total)}</span></div>
    <div class="dash"></div>
    <div class="center">
      <div class="gold" style="font-size:10px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase">${escapeHtml(RECEIPT_FOOTER.thankYou)}</div>
      <div class="muted" style="font-size:9px;margin-top:4px">${escapeHtml(RECEIPT_FOOTER.revisit)}</div>
    </div>
  </div>
  ${
    autoPrint
      ? `<script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 250);
    });
  </script>`
      : ""
  }
</body>
</html>`;
}

function saveReceiptHtmlFile(receipt: DownloadableReceipt, html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${receipt.receiptNo || "receipt"}.html`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Downloads / prints a receipt without requiring a pop-up.
 * Uses a hidden iframe for the print dialog (Save as PDF), and also saves an HTML file.
 */
export function downloadReceiptBill(
  receipt: DownloadableReceipt,
  shop: ReceiptShopInfo,
): boolean {
  const html = buildReceiptDocumentHtml(receipt, shop, { autoPrint: false });

  // Always save a file so the user gets something even if print is blocked.
  saveReceiptHtmlFile(receipt, html);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;",
  );
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return true;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.remove();
    }, 1_500);
  };

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch {
      // File download already happened above.
    } finally {
      cleanup();
    }
  };

  // Wait briefly so logo/images can settle before print.
  window.setTimeout(triggerPrint, 350);
  return true;
}
