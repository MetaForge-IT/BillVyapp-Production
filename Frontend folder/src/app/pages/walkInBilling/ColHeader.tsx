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
    <div className="shrink-0 px-6 py-4 border-b border-black/[0.06] bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-[#111118] text-[#D4AF37] font-bold text-[11px] flex items-center justify-center shrink-0">
          {num}
        </div>
        <Icon className="h-4 w-4 text-[#9a9a9a]" />
        <div>
          <p className="text-[13px] font-bold text-[#111118] leading-tight">{title}</p>
          <p className="text-[10.5px] text-[#9a9a9a] mt-0.5">{desc}</p>
        </div>
      </div>
    </div>
  );
}
