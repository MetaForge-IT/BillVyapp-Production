/** Premium segmented pill navigation — white shell, black active pill, gold accent */

export const SEGMENTED_PILL_LIST =
  "flex h-auto w-full max-w-full items-center gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border border-[rgba(18,18,18,0.08)] bg-white p-1.5 shadow-[0_2px_14px_rgba(18,18,18,0.06)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:inline-flex sm:w-fit";

export const SEGMENTED_PILL_TRIGGER =
  "flex-none inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-transparent px-4 text-[12px] font-semibold whitespace-nowrap text-[#121212] transition-all duration-200 hover:bg-[rgba(18,18,18,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/25 data-[state=active]:bg-[#121212] data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-[0_2px_10px_rgba(18,18,18,0.2)] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0 [&_svg]:text-[#121212] data-[state=active]:[&_svg]:text-[#D4AF37]";

export const SEGMENTED_PILL_BADGE =
  "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums";

export const SEGMENTED_PILL_BADGE_ACTIVE = "bg-[#D4AF37]/20 text-[#D4AF37]";
export const SEGMENTED_PILL_BADGE_INACTIVE = "bg-[rgba(18,18,18,0.06)] text-[#6B6B6B]";
