import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Building2, Plus } from "lucide-react";
import { toast } from "../../components/ui/hot-toast";
import {
  createFranchise,
  fetchFranchises,
  type FranchiseSummary,
} from "../../../api/franchises";
import { getApiErrorMessage } from "../../../lib/api";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

const emptyForm = {
  name: "",
  adminFullName: "",
  adminEmail: "",
  adminPhone: "",
  adminPassword: "",
};

export function SuperAdminFranchisesPage() {
  const [rows, setRows] = useState<FranchiseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    const data = await fetchFranchises();
    setRows(data);
  };

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch((e) => toast.error(getApiErrorMessage(e, "Failed to load franchises")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.adminFullName.trim().length >= 2 &&
    form.adminEmail.trim().includes("@") &&
    form.adminPassword.length >= 6;

  const handleCreate = async () => {
    if (!canSubmit) {
      toast.error("Franchise name plus admin name, email, and password (min 6) are required");
      return;
    }
    setCreating(true);
    try {
      await createFranchise({
        name: form.name.trim(),
        slug: toSlug(form.name.trim()),
        admin: {
          fullName: form.adminFullName.trim(),
          email: form.adminEmail.trim(),
          phone: form.adminPhone.trim() || undefined,
          password: form.adminPassword,
        },
      });
      setForm(emptyForm);
      await reload();
      toast.success("Franchise and admin created — admin can log in and add shops");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to create franchise"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Platform</p>
        <h1 className="text-2xl font-bold text-[#111118]">Franchises</h1>
        <p className="text-sm text-[#6b6b6b]">
          Create a brand and its franchise admin together. That admin then adds shops and managers.
        </p>
      </div>

      <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-[#6b6b6b]">
          New franchise + admin
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Franchise name (e.g. Lakme)"
            className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-sm outline-none focus:border-[#D4AF37]/50"
          />
          <input
            value={form.adminFullName}
            onChange={(e) => setForm((f) => ({ ...f, adminFullName: e.target.value }))}
            placeholder="Admin full name"
            className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-sm outline-none focus:border-[#D4AF37]/50"
          />
          <input
            value={form.adminEmail}
            onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
            placeholder="Admin email"
            type="email"
            className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-sm outline-none focus:border-[#D4AF37]/50"
          />
          <input
            value={form.adminPhone}
            onChange={(e) => setForm((f) => ({ ...f, adminPhone: e.target.value }))}
            placeholder="Admin mobile (optional)"
            className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-sm outline-none focus:border-[#D4AF37]/50"
          />
          <input
            value={form.adminPassword}
            onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
            placeholder="Admin temp password"
            type="password"
            className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-sm outline-none focus:border-[#D4AF37]/50"
          />
          <button
            type="button"
            disabled={creating || !canSubmit}
            onClick={() => void handleCreate()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#111118] px-4 text-sm font-semibold text-[#D4AF37] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {creating ? "Creating…" : "Create franchise + admin"}
          </button>
        </div>
        <p className="mt-3 text-[11px] text-[#9a9a9a]">
          No shop is created here. After login, the admin uses their dashboard to add shops (empty
          service menu) and managers for each shop.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] bg-[#FAF8F2] text-left text-[#6b6b6b]">
              <th className="px-4 py-3 font-semibold">Franchise</th>
              <th className="px-4 py-3 font-semibold">Shops</th>
              <th className="px-4 py-3 font-semibold">Admins</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[#9a9a9a]">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[#9a9a9a]">
                  No franchises yet
                </td>
              </tr>
            )}
            {rows.map((f) => (
              <tr key={f.id} className="border-b border-black/[0.04] hover:bg-[#FAF8F2]/60">
                <td className="px-4 py-3">
                  <Link
                    to={`/super-admin/franchises/${f.id}`}
                    className="flex items-center gap-2 font-semibold text-[#111118] hover:text-[#9a7d20]"
                  >
                    <Building2 className="h-4 w-4 text-[#D4AF37]" />
                    {f.name}
                  </Link>
                  <p className="pl-6 text-[11px] text-[#9a9a9a]">{f.slug}</p>
                </td>
                <td className="px-4 py-3 font-medium">{f.shopCount}</td>
                <td className="px-4 py-3">
                  {f.admins.length === 0 ? (
                    <span className="text-[#9a9a9a]">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {f.admins.map((a) => (
                        <p key={a.id} className="text-[12px]">
                          {a.fullName}{" "}
                          <span className="text-[#9a9a9a]">· {a.email}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      f.isActive
                        ? "border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#9a7d20]"
                        : "border-black/10 bg-gray-50 text-gray-500"
                    }`}
                  >
                    {f.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
