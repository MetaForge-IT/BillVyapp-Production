import { BRAND } from "../../config/brand";

/** Lightweight fallback while a lazy route chunk downloads. */
export function RouteFallback() {
  return (
    <div
      className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 px-6 py-16"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#D4AF37]/20" />
        <span className="absolute inset-1 animate-pulse rounded-full border-2 border-[#D4AF37]/40 border-t-[#D4AF37]" />
        <img
          src={BRAND.platformLogo}
          alt=""
          className="relative h-6 w-6 object-contain"
        />
      </div>
      <p className="text-[12px] font-semibold tracking-wide text-[#9a9a9a]">
        Loading…
      </p>
    </div>
  );
}
