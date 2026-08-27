import { useCallback, useEffect, useState } from "react";
import { Building2, MapPin, Plus, RefreshCw, Trash2, UserPlus } from "lucide-react";
import {
  createFranchiseManager,
  createMyFranchiseShop,
  deleteMyFranchiseShop,
  fetchMyFranchise,
  updateMyFranchiseShop,
  type MyFranchiseDetail,
} from "../../../../api/franchises";
import * as authApi from "../../../../api/auth";
import { clearCachedAuthUser } from "../../../../lib/authUserCache";
import { useAuthStore } from "../../../../stores/authStore";
import { getApiErrorMessage } from "../../../../lib/api";
import { toast } from "../../../components/ui/hot-toast";
import { FormSelect } from "../../../components/shared/FormSelect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { DashboardCard, DashboardCardHeader, SectionLabel } from "./DashboardCard";

const emptyManagerForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  salonId: "",
};

const emptyShopForm = {
  name: "",
  displayName: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

export function AdminFranchisePanel() {
  const [franchise, setFranchise] = useState<MyFranchiseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingManager, setSavingManager] = useState(false);
  const [creatingShop, setCreatingShop] = useState(false);
  const [savingShopId, setSavingShopId] = useState<string | null>(null);
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  const [shopToDelete, setShopToDelete] = useState<MyFranchiseDetail["shops"][number] | null>(null);
  const [managerForm, setManagerForm] = useState(emptyManagerForm);
  const [shopForm, setShopForm] = useState(emptyShopForm);
  const [addressDrafts, setAddressDrafts] = useState<
    Record<string, { address: string; city: string; state: string; pincode: string; phone: string }>
  >({});

  const reload = useCallback(async () => {
    const data = await fetchMyFranchise();
    setFranchise(data);
    const drafts: typeof addressDrafts = {};
    for (const shop of data.shops) {
      drafts[shop.id] = {
        address: shop.address ?? "",
        city: shop.city ?? "",
        state: shop.state ?? "",
        pincode: shop.pincode ?? "",
        phone: shop.phone ?? "",
      };
    }
    setAddressDrafts(drafts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch((error) => toast.error(getApiErrorMessage(error, "Failed to load franchise")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleCreateManager = async () => {
    if (!managerForm.fullName.trim() || !managerForm.email.trim() || !managerForm.password || !managerForm.salonId) {
      toast.error("Fill name, email, password, and shop");
      return;
    }
    setSavingManager(true);
    try {
      await createFranchiseManager({
        fullName: managerForm.fullName.trim(),
        email: managerForm.email.trim(),
        phone: managerForm.phone.trim() || undefined,
        password: managerForm.password,
        salonId: managerForm.salonId,
      });
      setManagerForm({ ...emptyManagerForm, salonId: managerForm.salonId });
      await reload();
      toast.success("Manager added to your franchise");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to add manager"));
    } finally {
      setSavingManager(false);
    }
  };

  const handleCreateShop = async () => {
    if (!shopForm.name.trim() || !shopForm.email.trim() || !shopForm.phone.trim()) {
      toast.error("Shop name, email, and phone are required");
      return;
    }
    setCreatingShop(true);
    try {
      const created = await createMyFranchiseShop({
        name: shopForm.name.trim(),
        displayName: shopForm.displayName.trim() || undefined,
        code: shopForm.code.trim() || undefined,
        email: shopForm.email.trim(),
        phone: shopForm.phone.trim(),
        address: shopForm.address.trim() || undefined,
        city: shopForm.city.trim() || undefined,
        state: shopForm.state.trim() || undefined,
        pincode: shopForm.pincode.trim() || undefined,
      });
      setShopForm(emptyShopForm);
      await reload();
      setManagerForm((f) => ({ ...f, salonId: created.id }));
      // First shop is linked as the admin's primary salonId — refresh JWT so ops APIs work.
      try {
        const refreshed = await authApi.refresh();
        if (refreshed.data?.accessToken) {
          clearCachedAuthUser();
          useAuthStore.getState().setAccessToken(refreshed.data.accessToken);
        }
      } catch {
        // Shop exists; user can re-login if scoped APIs fail until next refresh.
      }
      toast.success(
        `Shop created${created.city ? ` in ${created.city}` : ""} — empty menu; upload services, then add a manager`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create shop"));
    } finally {
      setCreatingShop(false);
    }
  };

  const handleSaveAddress = async (shopId: string) => {
    const draft = addressDrafts[shopId];
    if (!draft) return;
    setSavingShopId(shopId);
    try {
      await updateMyFranchiseShop(shopId, {
        address: draft.address.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        pincode: draft.pincode.trim(),
        phone: draft.phone.trim() || undefined,
      });
      await reload();
      toast.success("Shop address saved");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save address"));
    } finally {
      setSavingShopId(null);
    }
  };

  const handleDeleteShop = async () => {
    if (!shopToDelete) return;
    setDeletingShopId(shopToDelete.id);
    try {
      await deleteMyFranchiseShop(shopToDelete.id);
      setManagerForm((f) => (f.salonId === shopToDelete.id ? { ...f, salonId: "" } : f));
      setShopToDelete(null);
      await reload();
      try {
        const refreshed = await authApi.refresh();
        if (refreshed.data?.accessToken) {
          clearCachedAuthUser();
          useAuthStore.getState().setAccessToken(refreshed.data.accessToken);
        }
      } catch {
        // Scope may already be fine; next refresh will pick up salon change.
      }
      toast.success("Branch deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete branch"));
    } finally {
      setDeletingShopId(null);
    }
  };

  if (loading && !franchise) {
    return (
      <section aria-label="Franchise management">
        <SectionLabel>Franchise Management</SectionLabel>
        <DashboardCard>
          <p className="px-4 py-8 text-center text-[13px] text-[#52525b]">Loading franchise…</p>
        </DashboardCard>
      </section>
    );
  }

  if (!franchise) {
    return (
      <section aria-label="Franchise management">
        <SectionLabel>Franchise Management</SectionLabel>
        <DashboardCard>
          <p className="px-4 py-8 text-center text-[13px] text-[#52525b]">
            No franchise is linked to this admin account.
          </p>
        </DashboardCard>
      </section>
    );
  }

  const shopSelectOptions = franchise.shops.map((shop) => ({
    value: shop.id,
    label: (shop.displayName || shop.name) + (shop.city ? ` · ${shop.city}` : ""),
    description: [shop.address, shop.state, shop.pincode].filter(Boolean).join(", ") || undefined,
  }));
  const canDeleteShop = franchise.shops.length > 1;

  return (
    <section aria-label="Franchise management" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Franchise Management</SectionLabel>
        <button
          type="button"
          onClick={() => void reload()}
          className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#3f3f46] hover:border-[#D4AF37]/30"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        {/* Add manager */}
        <DashboardCard>
          <DashboardCardHeader
            icon={UserPlus}
            title="Add Manager"
            badge={`${franchise.managers.length} managers`}
          />
          <div className="space-y-3 p-4">
            <p className="text-[12px] text-[#3f3f46]">
              Create a shop manager for <span className="font-semibold text-[#111118]">{franchise.name}</span>.
              Pick the correct branch (e.g. Hyderabad) — that shop is saved on their account and shown in their sidebar.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                placeholder="Full name *"
                value={managerForm.fullName}
                onChange={(e) => setManagerForm((f) => ({ ...f, fullName: e.target.value }))}
                className="h-10 rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 text-[13px] outline-none focus:border-[#D4AF37]/50"
              />
              <input
                placeholder="Email *"
                type="email"
                value={managerForm.email}
                onChange={(e) => setManagerForm((f) => ({ ...f, email: e.target.value }))}
                className="h-10 rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 text-[13px] outline-none focus:border-[#D4AF37]/50"
              />
              <input
                placeholder="Phone"
                value={managerForm.phone}
                onChange={(e) => setManagerForm((f) => ({ ...f, phone: e.target.value }))}
                className="h-10 rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 text-[13px] outline-none focus:border-[#D4AF37]/50"
              />
              <input
                placeholder="Temp password *"
                type="password"
                value={managerForm.password}
                onChange={(e) => setManagerForm((f) => ({ ...f, password: e.target.value }))}
                className="h-10 rounded-xl border border-black/[0.08] bg-[#fafaf8] px-3 text-[13px] outline-none focus:border-[#D4AF37]/50"
              />
              <div className="sm:col-span-2">
                <FormSelect
                  value={managerForm.salonId}
                  onValueChange={(salonId) => setManagerForm((f) => ({ ...f, salonId }))}
                  options={shopSelectOptions}
                  placeholder="Select shop / branch *"
                  icon={Building2}
                  aria-label="Assign manager to shop"
                  triggerClassName="bg-white"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={savingManager}
              onClick={() => void handleCreateManager()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#111118] px-4 text-[12px] font-bold text-[#D4AF37] disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              {savingManager ? "Saving…" : "Add Manager"}
            </button>

            <div className="border-t border-black/[0.05] pt-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#52525b]">
                Current managers
              </p>
              {franchise.managers.length === 0 ? (
                <p className="text-[12px] text-[#52525b]">No managers yet</p>
              ) : (
                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {franchise.managers.map((m) => {
                    const branchLabel = [m.shopLabel, m.shopCity].filter(Boolean).join(" · ");
                    const addressLine = [m.shopAddress, m.shopState, m.shopPincode]
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-black/[0.06] bg-[#fafaf8] p-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                            <UserPlus className="h-3.5 w-3.5 text-[#D4AF37]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-[#111118]">{m.fullName}</p>
                            <p className="truncate text-[11px] text-[#52525b]">{m.email}</p>
                            {m.phone ? (
                              <p className="truncate text-[11px] text-[#3f3f46]">{m.phone}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-black/[0.05] pt-2">
                          <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-bold text-[#9a7d20]">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{branchLabel || "No shop assigned"}</span>
                          </span>
                          {addressLine ? (
                            <p className="w-full truncate text-[10px] text-[#3f3f46]">{addressLine}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DashboardCard>

        {/* Shops — create + edit addresses */}
        <DashboardCard>
          <DashboardCardHeader
            icon={MapPin}
            title="Shops & Addresses"
            badge={`${franchise.shops.length} shops`}
          />
          <div className="space-y-3 p-4">
            <p className="text-[12px] text-[#3f3f46]">
              Add a new branch for <span className="font-semibold text-[#111118]">{franchise.name}</span>{" "}
              or update an existing shop address. Everything is saved to the database.
            </p>

            {/* Create new shop */}
            <div className="rounded-xl border border-[#D4AF37]/25 bg-[#FFFBEB]/60 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#9a7d20]">
                Create new shop
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  placeholder="Shop / brand name *"
                  value={shopForm.name}
                  onChange={(e) => setShopForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                />
                <input
                  placeholder="Branch label (e.g. Main Branch)"
                  value={shopForm.displayName}
                  onChange={(e) => setShopForm((f) => ({ ...f, displayName: e.target.value }))}
                  className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                />
                <input
                  placeholder="Shop email *"
                  type="email"
                  value={shopForm.email}
                  onChange={(e) => setShopForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                />
                <input
                  placeholder="Shop phone *"
                  value={shopForm.phone}
                  onChange={(e) => setShopForm((f) => ({ ...f, phone: e.target.value }))}
                  className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                />
                <input
                  placeholder="Street address"
                  value={shopForm.address}
                  onChange={(e) => setShopForm((f) => ({ ...f, address: e.target.value }))}
                  className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50 sm:col-span-2"
                />
                <input
                  placeholder="City (e.g. Hyderabad)"
                  value={shopForm.city}
                  onChange={(e) => setShopForm((f) => ({ ...f, city: e.target.value }))}
                  className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                />
                <input
                  placeholder="State"
                  value={shopForm.state}
                  onChange={(e) => setShopForm((f) => ({ ...f, state: e.target.value }))}
                  className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                />
                <input
                  placeholder="Pincode"
                  value={shopForm.pincode}
                  onChange={(e) => setShopForm((f) => ({ ...f, pincode: e.target.value }))}
                  className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                />
                <input
                  placeholder="Code (e.g. HYD-02)"
                  value={shopForm.code}
                  onChange={(e) => setShopForm((f) => ({ ...f, code: e.target.value }))}
                  className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <button
                type="button"
                disabled={creatingShop}
                onClick={() => void handleCreateShop()}
                className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#111118] px-3 text-[11px] font-bold text-[#D4AF37] disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                {creatingShop ? "Creating…" : "Create Shop"}
              </button>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-wider text-[#52525b]">
              Existing shops
            </p>
            {franchise.shops.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-[#52525b]">No shops yet — create one above</p>
            ) : (
              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {franchise.shops.map((shop) => {
                  const draft = addressDrafts[shop.id] ?? {
                    address: "",
                    city: "",
                    state: "",
                    pincode: "",
                    phone: "",
                  };
                  return (
                    <div
                      key={shop.id}
                      className="rounded-xl border border-black/[0.06] bg-[#fafaf8] p-3"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-[#111118]">
                              {shop.displayName || shop.name}
                            </p>
                            <p className="text-[10px] font-medium text-[#9a7d20]">
                              {[shop.city, shop.state].filter(Boolean).join(", ") || "No city set"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          title={
                            canDeleteShop
                              ? "Delete branch"
                              : "Cannot delete the last branch"
                          }
                          disabled={!canDeleteShop || deletingShopId === shop.id}
                          onClick={() => setShopToDelete(shop)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Delete ${shop.displayName || shop.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          placeholder="Street address"
                          value={draft.address}
                          onChange={(e) =>
                            setAddressDrafts((prev) => ({
                              ...prev,
                              [shop.id]: { ...draft, address: e.target.value },
                            }))
                          }
                          className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50 sm:col-span-2"
                        />
                        <input
                          placeholder="City"
                          value={draft.city}
                          onChange={(e) =>
                            setAddressDrafts((prev) => ({
                              ...prev,
                              [shop.id]: { ...draft, city: e.target.value },
                            }))
                          }
                          className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                        />
                        <input
                          placeholder="State"
                          value={draft.state}
                          onChange={(e) =>
                            setAddressDrafts((prev) => ({
                              ...prev,
                              [shop.id]: { ...draft, state: e.target.value },
                            }))
                          }
                          className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                        />
                        <input
                          placeholder="Pincode"
                          value={draft.pincode}
                          onChange={(e) =>
                            setAddressDrafts((prev) => ({
                              ...prev,
                              [shop.id]: { ...draft, pincode: e.target.value },
                            }))
                          }
                          className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                        />
                        <input
                          placeholder="Shop phone"
                          value={draft.phone}
                          onChange={(e) =>
                            setAddressDrafts((prev) => ({
                              ...prev,
                              [shop.id]: { ...draft, phone: e.target.value },
                            }))
                          }
                          className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12px] outline-none focus:border-[#D4AF37]/50"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={savingShopId === shop.id}
                        onClick={() => void handleSaveAddress(shop.id)}
                        className="mt-2 inline-flex h-9 items-center rounded-lg bg-[#111118] px-3 text-[11px] font-bold text-[#D4AF37] disabled:opacity-60"
                      >
                        {savingShopId === shop.id ? "Saving…" : "Save Address"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DashboardCard>
      </div>

      <AlertDialog
        open={shopToDelete != null}
        onOpenChange={(open) => {
          if (!open && !deletingShopId) setShopToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this branch?</AlertDialogTitle>
            <AlertDialogDescription>
              {shopToDelete
                ? `“${shopToDelete.displayName || shopToDelete.name}” will be deactivated and removed from your active shops. Managers assigned only to this branch will be deactivated. Billing history is kept.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingShopId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!deletingShopId}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteShop();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletingShopId ? "Deleting…" : "Delete branch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
