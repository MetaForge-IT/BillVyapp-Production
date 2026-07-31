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

export function SuperAdminFranchisesPage() {
  const [rows, setRows] = useState<FranchiseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
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

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createFranchise({ name: name.trim(), slug: toSlug(name.trim()) });
      setName("");
      await reload();
      toast.success("Franchise created");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to create franchise"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Platform</p>
          <h1 className="text-2xl font-bold text-[#111118]">Franchises</h1>
          <p className="text-sm text-[#6b6b6b]">Brands and their shops across India</p>
        </div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New franchise name (e.g. Lakme)"
            className="h-10 w-64 rounded-xl border border-black/[0.08] bg-white px-3 text-sm outline-none focus:border-[#D4AF37]/50"
          />
          <button
            type="button"
            disabled={creating || !name.trim()}
            onClick={() => void handleCreate()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#111118] px-4 text-sm font-semibold text-[#D4AF37] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Create
          </button>
        </div>
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
                  <Link to={`/super-admin/franchises/${f.id}`} className="flex items-center gap-2 font-semibold text-[#111118] hover:text-[#9a7d20]">
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
