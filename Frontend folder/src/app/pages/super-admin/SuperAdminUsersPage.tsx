import { useEffect, useMemo, useState } from "react";
import { toast } from "../../components/ui/hot-toast";
import {
  createPlatformStaff,
  fetchFranchises,
  fetchFranchise,
  fetchPlatformStaff,
  type FranchiseSummary,
  type StaffRow,
} from "../../../api/franchises";
import { getApiErrorMessage } from "../../../lib/api";

export function SuperAdminUsersPage() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [franchises, setFranchises] = useState<FranchiseSummary[]>([]);
  const [shops, setShops] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "manager" as "admin" | "manager",
    franchiseId: "",
    salonId: "",
  });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const [staff, brands] = await Promise.all([fetchPlatformStaff(), fetchFranchises()]);
    setRows(staff);
    setFranchises(brands);
  };

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch((e) => toast.error(getApiErrorMessage(e, "Failed to load users")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form.franchiseId) {
      setShops([]);
      setForm((f) => ({ ...f, salonId: "" }));
      return;
    }
    let cancelled = false;
    void fetchFranchise(form.franchiseId).then((detail) => {
      if (cancelled) return;
      setShops(
        detail.shops.map((s) => ({
          id: s.id,
          label: `${s.displayName || s.name}${s.city ? ` · ${s.city}` : ""}`,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [form.franchiseId]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.role === b.role) return a.fullName.localeCompare(b.fullName);
        return a.role.localeCompare(b.role);
      }),
    [rows],
  );

  const handleCreate = async () => {
    if (!form.fullName || !form.email || !form.password || !form.franchiseId || !form.salonId) {
      toast.error("Fill all required fields");
      return;
    }
    setSaving(true);
    try {
      await createPlatformStaff({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
        franchiseId: form.franchiseId,
        salonId: form.salonId,
      });
      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "manager",
        franchiseId: form.franchiseId,
        salonId: "",
      });
      await reload();
      toast.success("User created");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to create user"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Platform</p>
        <h1 className="text-2xl font-bold text-[#111118]">Users</h1>
        <p className="text-sm text-[#6b6b6b]">
          Admins (franchise) and managers (shop) across all brands
        </p>
      </div>

      <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-[#6b6b6b]">
          Create admin / manager
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="h-10 rounded-xl border border-black/[0.08] px-3 text-sm"
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="h-10 rounded-xl border border-black/[0.08] px-3 text-sm"
          />
          <input
            placeholder="Mobile"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="h-10 rounded-xl border border-black/[0.08] px-3 text-sm"
          />
          <input
            type="password"
            placeholder="Temp password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="h-10 rounded-xl border border-black/[0.08] px-3 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "admin" | "manager" }))}
            className="h-10 rounded-xl border border-black/[0.08] px-3 text-sm"
          >
            <option value="manager">Manager (one shop)</option>
            <option value="admin">Admin (franchise)</option>
          </select>
          <select
            value={form.franchiseId}
            onChange={(e) => setForm((f) => ({ ...f, franchiseId: e.target.value, salonId: "" }))}
            className="h-10 rounded-xl border border-black/[0.08] px-3 text-sm"
          >
            <option value="">Select franchise</option>
            {franchises.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            value={form.salonId}
            onChange={(e) => setForm((f) => ({ ...f, salonId: e.target.value }))}
            className="h-10 rounded-xl border border-black/[0.08] px-3 text-sm"
          >
            <option value="">Select shop</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleCreate()}
            className="h-10 rounded-xl bg-[#111118] text-sm font-semibold text-[#D4AF37] disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create user"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] bg-[#FAF8F2] text-left text-[#6b6b6b]">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Franchise</th>
              <th className="px-4 py-3 font-semibold">Shop</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#9a9a9a]">
                  Loading…
                </td>
              </tr>
            )}
            {sorted.map((u) => (
              <tr key={u.id} className="border-b border-black/[0.04]">
                <td className="px-4 py-3 font-semibold">{u.fullName}</td>
                <td className="px-4 py-3 capitalize">{u.role.replace("_", " ")}</td>
                <td className="px-4 py-3">{u.franchiseName || "—"}</td>
                <td className="px-4 py-3">
                  {u.shopLabel || "—"}
                  {u.shopCity ? ` · ${u.shopCity}` : ""}
                </td>
                <td className="px-4 py-3 text-[12px] text-[#6b6b6b]">
                  {u.email}
                  {u.phone ? ` · ${u.phone}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
