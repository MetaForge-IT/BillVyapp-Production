import { BRAND, RECEIPT_FOOTER } from "../../config/brand";
import { cn } from "../ui/utils";

export const RECEIPT_SHOP = {
  address: "MG Road, Hyderabad 500001",
  phone: "+91 98765 43210",
  gstin: "36ABCDE1234F1Z5",
} as const;

export function SalonReceiptPaper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-[#D4AF37]/18 bg-white px-4 py-4 font-mono text-[#111118] shadow-[0_10px_28px_rgba(17,17,24,0.08)] ring-1 ring-[#D4AF37]/8",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/45 to-transparent" />
      {children}
    </div>
  );
}

export function SalonReceiptBrandHeader({ className }: { className?: string }) {
  return (
    <div className={cn("border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3 text-center", className)}>
      <div className="mb-1 flex items-center justify-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/28 bg-gradient-to-b from-[#D4AF37]/12 to-transparent shadow-[0_4px_14px_rgba(212,175,55,0.12)]">
          <img src={BRAND.clientLogo} alt="" className="h-6 w-6 object-contain" />
        </div>
        <p className="text-[14px] font-black tracking-[0.1em] uppercase text-[#111118]">
          {BRAND.clientName}
        </p>
      </div>
      <p className="text-[10px] mt-0.5 font-semibold uppercase tracking-[0.16em] text-[#9a7d20]">
        {RECEIPT_FOOTER.salonType}
      </p>
      <p className="text-[10px] text-[#9a9a9a]">{RECEIPT_SHOP.address}</p>
      <p className="text-[10px] text-[#9a9a9a]">
        Ph: {RECEIPT_SHOP.phone} | GSTIN: {RECEIPT_SHOP.gstin}
      </p>
    </div>
  );
}

export function salonReceiptBrandHeaderHtml(): string {
  return `
        <div class="center" style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:4px">
            <div style="height:40px;width:40px;border-radius:9999px;border:1px solid rgba(212,175,55,0.28);background:linear-gradient(to bottom,rgba(212,175,55,0.12),transparent);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <img src="${BRAND.clientLogo}" alt="" style="height:24px;width:24px;object-fit:contain" />
            </div>
            <div class="heavy" style="font-size:18px;letter-spacing:0.1em">${BRAND.clientName.toUpperCase()}</div>
          </div>
          <div class="muted" style="margin-top:3px;font-size:11px;font-weight:600;letter-spacing:0.14em;color:#9a7d20">${RECEIPT_FOOTER.salonType.toUpperCase()}</div>
          <div class="muted" style="font-size:11px">${RECEIPT_SHOP.address}</div>
          <div class="muted" style="font-size:11px">Ph: ${RECEIPT_SHOP.phone} &nbsp;|&nbsp; GSTIN: ${RECEIPT_SHOP.gstin}</div>
        </div>`;
}
