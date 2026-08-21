import { BRAND, RECEIPT_FOOTER } from "../../config/brand";
import { useSettings } from "../../context/SettingsContext";
import { useRole } from "../../context/RoleContext";
import { cn } from "../ui/utils";

/** Shop details shown on printed / downloaded bills. */
export interface ReceiptShopInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  gstin: string;
  logoUrl: string;
}

/** @deprecated Prefer live settings via `useReceiptShopInfo` / `resolveReceiptShopInfo`. */
export const RECEIPT_SHOP = {
  address: "MG Road, Hyderabad 500001",
  phone: "+91 98765 43210",
  gstin: "36ABCDE1234F1Z5",
} as const;

function joinAddressParts(parts: Array<string | null | undefined>): string {
  const cleaned = parts.map((p) => p?.trim()).filter(Boolean) as string[];
  const unique: string[] = [];
  for (const part of cleaned) {
    const alreadyCovered = unique.some(
      (existing) =>
        existing.toLowerCase().includes(part.toLowerCase()) ||
        part.toLowerCase().includes(existing.toLowerCase()),
    );
    if (!alreadyCovered) unique.push(part);
  }
  return unique.join(", ");
}

export function resolveReceiptShopInfo(input: {
  salon?: {
    name?: string;
    tagline?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    gstin?: string;
    logoUrl?: string;
  } | null;
  shopName?: string;
  shopAddress?: string;
}): ReceiptShopInfo {
  const salon = input.salon;
  const name =
    salon?.name?.trim() ||
    input.shopName?.trim() ||
    BRAND.clientName;
  const tagline = salon?.tagline?.trim() || RECEIPT_FOOTER.salonType;
  const address =
    joinAddressParts([
      salon?.address,
      salon?.city,
      salon?.state,
      salon?.pincode,
    ]) ||
    input.shopAddress?.trim() ||
    "";
  const phone = salon?.phone?.trim() || "";
  const gstin = salon?.gstin?.trim() || "";
  const logoPath = salon?.logoUrl?.trim() || BRAND.clientLogo;
  const logoUrl =
    logoPath.startsWith("http://") || logoPath.startsWith("https://") || logoPath.startsWith("data:")
      ? logoPath
      : typeof window !== "undefined"
        ? `${window.location.origin}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`
        : logoPath;

  return { name, tagline, address, phone, gstin, logoUrl };
}

/** Live shop branding for on-screen receipt headers. */
export function useReceiptShopInfo(): ReceiptShopInfo {
  const { settings } = useSettings();
  const { shopName, shopAddress } = useRole();
  return resolveReceiptShopInfo({
    salon: settings.salon,
    shopName,
    shopAddress,
  });
}

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
  const shop = useReceiptShopInfo();

  return (
    <div className={cn("border-b border-dashed border-[#D4AF37]/25 pb-3 mb-3 text-center", className)}>
      <div className="mb-1 flex items-center justify-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/28 bg-gradient-to-b from-[#D4AF37]/12 to-transparent shadow-[0_4px_14px_rgba(212,175,55,0.12)]">
          <img src={shop.logoUrl || BRAND.clientLogo} alt="" className="h-6 w-6 object-contain" />
        </div>
        <p className="text-[14px] font-black tracking-[0.1em] uppercase text-[#111118]">
          {shop.name}
        </p>
      </div>
      {shop.tagline && (
        <p className="text-[10px] mt-0.5 font-semibold uppercase tracking-[0.16em] text-[#9a7d20]">
          {shop.tagline}
        </p>
      )}
      {shop.address && <p className="text-[10px] text-[#9a9a9a]">{shop.address}</p>}
      {(shop.phone || shop.gstin) && (
        <p className="text-[10px] text-[#9a9a9a]">
          {shop.phone ? `Ph: ${shop.phone}` : null}
          {shop.phone && shop.gstin ? " | " : null}
          {shop.gstin ? `GSTIN: ${shop.gstin}` : null}
        </p>
      )}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function salonReceiptBrandHeaderHtml(shop: ReceiptShopInfo): string {
  const phoneGstLine = [
    shop.phone ? `Ph: ${escapeHtml(shop.phone)}` : "",
    shop.gstin ? `GSTIN: ${escapeHtml(shop.gstin)}` : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;|&nbsp; ");

  return `
        <div class="center" style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:4px">
            <div style="height:40px;width:40px;border-radius:9999px;border:1px solid rgba(212,175,55,0.28);background:linear-gradient(to bottom,rgba(212,175,55,0.12),transparent);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <img src="${escapeHtml(shop.logoUrl || BRAND.clientLogo)}" alt="" style="height:24px;width:24px;object-fit:contain" />
            </div>
            <div class="heavy" style="font-size:18px;letter-spacing:0.1em">${escapeHtml(shop.name.toUpperCase())}</div>
          </div>
          ${
            shop.tagline
              ? `<div class="muted" style="margin-top:3px;font-size:11px;font-weight:600;letter-spacing:0.14em;color:#9a7d20">${escapeHtml(shop.tagline.toUpperCase())}</div>`
              : ""
          }
          ${shop.address ? `<div class="muted" style="font-size:11px">${escapeHtml(shop.address)}</div>` : ""}
          ${phoneGstLine ? `<div class="muted" style="font-size:11px">${phoneGstLine}</div>` : ""}
        </div>`;
}
