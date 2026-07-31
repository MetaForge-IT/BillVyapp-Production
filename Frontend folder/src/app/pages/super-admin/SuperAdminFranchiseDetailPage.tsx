import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, MapPin, Plus, User } from "lucide-react";
import { toast } from "../../components/ui/hot-toast";
import { createShop, fetchFranchise, type FranchiseDetail } from "../../../api/franchises";
import { getApiErrorMessage } from "../../../lib/api";

export function SuperAdminFranchiseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<FranchiseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddShop, setShowAddShop] = useState(false);
  const [shopForm, setShopForm] = useState({
    name: "",
    displayName: "",
    city: "",
    email: "",
    phone: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    if (!id) return;
    setData(await fetchFranchise(id));
  };

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    reload()
      .catch((e) => toast.error(getApiErrorMessage(e, "Failed to load franchise")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAddShop = async () => {
    if (!id || !shopForm.name || !shopForm.email || !shopForm.phone) return;
    setSaving(true);
    try {
      await createShop(id, {
        name: shopForm.name,
        displayName: shopForm.displayName || undefined,
        city: shopForm.city || undefined,
        email: shopForm.email,
        phone: shopForm.phone,
        address: shopForm.address || undefined,
      });
      setShowAddShop(false);
      setShopForm({ name: "", displayName: "", city: "", email: "", phone: "", address: "" });
      await reload();
      toast.success("Shop created");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to create shop"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#9a9a9a]">Loading franchise…</p>;
  }
  if (!data) {
    return <p className="text-sm text-red-600">Franchise not found</p>;
  }

  const admins = data.staff.filter((s) => s.role === "admin");
  const managers = data.staff.filter((s) => s.role === "manager");

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/super-admin/franchises"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#6b6b6b] hover:text-[#111118]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to franchises
        </Link>
        <h1 className="text-2xl font-bold text-[#111118]">{data.name}</h1>
        <p className="text-sm text-[#6b6b6b]">
          {data.shops.length} shops · {admins.length} admins · {managers.length} managers
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#6b6b6b]">Shops</h2>
          <button
            type="button"
            onClick={() => setShowAddShop((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Add shop
          </button>
        </div>

        {showAddShop && (
          <div className="grid gap-2 rounded-2xl border border-black/[0.07] bg-white p-4 sm:grid-cols-2">
            {(
              [
                ["name", "Shop / brand name"],
                ["displayName", "Branch label (e.g. Main Branch)"],
                ["city", "City"],
                ["email", "Shop email (unique)"],
                ["phone", "Phone"],
                ["address", "Address"],
              ] as const
            ).map(([key, placeholder]) => (
              <input
                key={key}
                value={shopForm[key]}
                onChange={(e) => setShopForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="h-10 rounded-xl border border-black/[0.08] px-3 text-sm outline-none focus:border-[#D4AF37]/50"
              />
            ))}
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleAddShop()}
              className="h-10 rounded-xl bg-[#111118] text-sm font-semibold text-[#D4AF37] sm:col-span-2"
            >
              {saving ? "Saving…" : "Create shop"}
            </button>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {data.shops.map((s) => (
            <div key={s.id} className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-[#D4AF37]" />
                <div>
                  <p className="font-semibold text-[#111118]">
                    {s.displayName || s.name}
                    {s.code ? (
                      <span className="ml-2 text-[11px] font-medium text-[#9a9a9a]">{s.code}</span>
                    ) : null}
                  </p>
                  <p className="text-[12px] text-[#6b6b6b]">
                    {[s.city, s.state].filter(Boolean).join(", ") || "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-[#9a9a9a]">
                    {s.email} · {s.phone}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#6b6b6b]">Staff</h2>
        <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#FAF8F2] text-left text-[#6b6b6b]">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Shop</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((u) => (
                <tr key={u.id} className="border-b border-black/[0.04]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span className="font-semibold">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3">
                    {u.shopLabel}
                    {u.shopCity ? ` · ${u.shopCity}` : ""}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#6b6b6b]">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </td>
                </tr>
              ))}
              {data.staff.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#9a9a9a]">
                    No staff assigned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
