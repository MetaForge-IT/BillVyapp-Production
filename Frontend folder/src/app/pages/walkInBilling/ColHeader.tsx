export function ColHeader({
  num,
  icon: Icon,
  title,
  desc,
}: {
  num: string;
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="shrink-0 border-b border-black/[0.06] bg-white/70 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#111118] text-[11px] font-bold text-[#D4AF37]">
          {num}
        </div>
        <Icon className="h-4 w-4 shrink-0 text-[#9a9a9a]" />
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-tight text-[#111118]">{title}</p>
          <p className="mt-0.5 truncate text-[10.5px] text-[#9a9a9a]">{desc}</p>
        </div>
      </div>
    </div>
  );
}
