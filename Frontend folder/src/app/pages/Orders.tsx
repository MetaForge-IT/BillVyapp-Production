import { ShoppingCart } from "lucide-react";

export function Orders() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF8F2] border border-[#D4AF37]/20">
          <ShoppingCart className="h-6 w-6 text-[#121212]" />
        </div>
        <div>
          <h1 className="text-2xl text-manrope-semibold text-[#121212]">Purchase Orders</h1>
          <p className="text-sm text-inter-regular text-[#3f3f46]">Manage purchase orders</p>
        </div>
      </div>
      <div className="rounded-2xl border border-[#D4AF37]/20 bg-white p-8">
        <p className="text-inter-regular text-[#3f3f46]">Purchase orders page coming soon.</p>
      </div>
    </div>
  );
}
