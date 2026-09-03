import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Megaphone,
  Plus,
  Send,
  Store,
  Trash2,
  X,
} from "lucide-react";
import {
  createCampaign,
  deleteCampaign,
  fetchCampaigns,
  sendCampaign,
  type Campaign,
  type CampaignOfferType,
  type CampaignScope,
} from "../../api/campaigns";
import { fetchMyFranchise } from "../../api/franchises";
import { fetchAllServices } from "../../api/services";
import { getApiErrorMessage } from "../../lib/api";
import { FilterSelect } from "../components/shared/FilterSelect";
import { FormSelect } from "../components/shared/FormSelect";
import { toast } from "../components/ui/hot-toast";
import { cn } from "../components/ui/utils";
import { isAdmin, useRole } from "../context/RoleContext";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatOffer(campaign: Campaign): string {
  if (campaign.offerType === "flat") return `₹${Math.round(campaign.offerValue)} off`;
  return `${campaign.offerValue}% off`;
}

const STATUS_LABEL: Record<Campaign["status"], string> = {
  draft: "Draft",
  sending: "Sending…",
  completed: "Sent",
  failed: "Failed",
};

const STATUS_CLASS: Record<Campaign["status"], string> = {
  draft: "bg-slate-100 text-slate-700",
  sending: "bg-amber-50 text-amber-800",
  completed: "bg-emerald-50 text-emerald-800",
  failed: "bg-red-50 text-red-700",
};

interface CampaignFormState {
  title: string;
  description: string;
  offerType: CampaignOfferType;
  offerValue: string;
  applicableScope: CampaignScope;
  serviceIds: string[];
  validFrom: string;
  validTill: string;
  generateCoupon: boolean;
}

function emptyForm(): CampaignFormState {
  const today = todayIsoDate();
  return {
    title: "",
    description: "",
    offerType: "percentage",
    offerValue: "",
    applicableScope: "all_services",
    serviceIds: [],
    validFrom: today,
    validTill: today,
    generateCoupon: true,
  };
}

export function Campaigns() {
  const { role } = useRole();
  const admin = isAdmin(role);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CampaignFormState>(emptyForm);
  const [shopFilter, setShopFilter] = useState("all");
  const [formSalonId, setFormSalonId] = useState("");

  const franchiseQuery = useQuery({
    queryKey: ["my-franchise"],
    queryFn: fetchMyFranchise,
    enabled: admin,
  });
  const franchiseShops = franchiseQuery.data?.shops ?? [];
  const showShopColumn = admin && shopFilter === "all" && franchiseShops.length > 1;
  const shopSelectOptions = useMemo(
    () =>
      franchiseShops.map((shop) => ({
        value: shop.id,
        label: shop.displayName?.trim() || shop.name,
      })),
    [franchiseShops],
  );

  const formSalonForServices = formSalonId || (shopFilter !== "all" ? shopFilter : franchiseShops[0]?.id ?? "");
  const servicesQuery = useQuery({
    queryKey: ["services", formSalonForServices],
    queryFn: () => fetchAllServices({ salonId: formSalonForServices, active: true }),
    enabled: showForm && Boolean(formSalonForServices),
  });
  const serviceOptions = servicesQuery.data ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    const salonId = admin && shopFilter !== "all" ? shopFilter : undefined;
    try {
      const rows = await fetchCampaigns({ salonId });
      setCampaigns(rows);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load campaigns"));
    } finally {
      setLoading(false);
    }
  }, [admin, shopFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm());
    setFormSalonId(shopFilter !== "all" ? shopFilter : "");
    setShowForm(false);
  };

  const openCreate = () => {
    setForm(emptyForm());
    setFormSalonId(shopFilter !== "all" ? shopFilter : "");
    setShowForm(true);
  };

  const toggleService = (serviceId: string) => {
    setForm((prev) => {
      const exists = prev.serviceIds.includes(serviceId);
      return {
        ...prev,
        serviceIds: exists
          ? prev.serviceIds.filter((id) => id !== serviceId)
          : [...prev.serviceIds, serviceId],
      };
    });
  };

  const submit = async () => {
    const title = form.title.trim();
    const offerValue = Number(form.offerValue);
    if (!title) {
      toast.error("Enter a campaign title");
      return;
    }
    if (!Number.isFinite(offerValue) || offerValue <= 0) {
      toast.error("Enter a valid offer value");
      return;
    }
    if (form.offerType === "percentage" && offerValue > 100) {
      toast.error("Percentage cannot exceed 100");
      return;
    }
    if (form.validFrom > form.validTill) {
      toast.error("Valid till must be on or after valid from");
      return;
    }
    if (form.applicableScope === "selected_services" && form.serviceIds.length === 0) {
      toast.error("Select at least one service");
      return;
    }
    if (admin && franchiseShops.length > 1 && !formSalonId) {
      toast.error("Select a shop for this campaign");
      return;
    }

    setSaving(true);
    try {
      await createCampaign({
        title,
        description: form.description.trim() || undefined,
        offerType: form.offerType,
        offerValue,
        applicableScope: form.applicableScope,
        serviceIds: form.applicableScope === "selected_services" ? form.serviceIds : [],
        validFrom: form.validFrom,
        validTill: form.validTill,
        generateCoupon: form.generateCoupon,
        ...(admin && formSalonId ? { salonId: formSalonId } : {}),
      });
      toast.success("Campaign created");
      resetForm();
      void load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create campaign"));
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (campaign: Campaign) => {
    const n = campaign.audienceCount ?? 0;
    if (
      !window.confirm(
        `Send "${campaign.title}" to ${n} customer${n === 1 ? "" : "s"} at ${campaign.salonName}?`,
      )
    ) {
      return;
    }
    setActionId(campaign.id);
    try {
      await sendCampaign(campaign.id, shopFilter !== "all" ? shopFilter : undefined);
      toast.success("Campaign sent via WhatsApp");
      void load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send campaign"));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!window.confirm(`Delete draft "${campaign.title}"?`)) return;
    setActionId(campaign.id);
    try {
      await deleteCampaign(campaign.id, shopFilter !== "all" ? shopFilter : undefined);
      toast.success("Campaign deleted");
      void load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete campaign"));
    } finally {
      setActionId(null);
    }
  };

  const draftCount = campaigns.filter((c) => c.status === "draft").length;
  const sentCount = campaigns.filter((c) => c.status === "completed").length;

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-2 overflow-hidden sm:gap-4">
      <div className="flex shrink-0 items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
            Marketing
          </p>
          <h1 className="text-xl font-bold tracking-tight text-[#111118] sm:text-3xl">Campaigns</h1>
          <p className="mt-0.5 hidden text-[12px] text-[#3f3f46] sm:mt-1 sm:block sm:text-[13px]">
            WhatsApp offers to branch customers — banner offer always; optional coupon message too
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#111118] px-3 text-[11px] font-bold text-[#D4AF37] sm:h-11 sm:gap-2 sm:px-4 sm:text-[13px]"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">New campaign</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {admin && franchiseShops.length > 1 && (
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:max-w-xs">
          <FilterSelect
            compact
            icon={Store}
            value={shopFilter}
            onValueChange={setShopFilter}
            active={shopFilter !== "all"}
            className="min-w-0"
            options={[
              { value: "all", label: `All Shops (${franchiseShops.length})` },
              ...shopSelectOptions,
            ]}
          />
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-xl border border-black/[0.07] bg-white p-2.5 sm:rounded-2xl sm:p-4">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#52525b] sm:text-[10px] sm:tracking-[0.12em]">
            Total
          </p>
          <p className="mt-0.5 text-lg font-black text-[#111118] sm:mt-1 sm:text-2xl">{campaigns.length}</p>
        </div>
        <div className="rounded-xl border border-black/[0.07] bg-white p-2.5 sm:rounded-2xl sm:p-4">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#52525b] sm:text-[10px] sm:tracking-[0.12em]">
            Drafts
          </p>
          <p className="mt-0.5 text-lg font-black text-[#111118] sm:mt-1 sm:text-2xl">{draftCount}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-black/[0.07] bg-white p-2.5 sm:col-span-1 sm:rounded-2xl sm:p-4">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#52525b] sm:text-[10px] sm:tracking-[0.12em]">
            Sent
          </p>
          <p className="mt-0.5 text-lg font-black text-emerald-700 sm:mt-1 sm:text-2xl">{sentCount}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#3f3f46]">
            <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D4AF37]/25 bg-[#faf8f2] py-16 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-[#D4AF37]/35" />
            <p className="mt-3 text-sm font-semibold text-[#111118]">No campaigns yet</p>
            <p className="mt-1 text-xs text-[#3f3f46]">Create an offer and broadcast to your customers</p>
          </div>
        ) : (
          <div className="space-y-2 pb-1 sm:space-y-3">
            {campaigns.map((campaign) => {
              const busy = actionId === campaign.id;
              return (
                <div
                  key={campaign.id}
                  className="rounded-xl border border-black/[0.07] bg-white p-3 sm:rounded-2xl sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-[#111118]">{campaign.title}</h2>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            STATUS_CLASS[campaign.status],
                          )}
                        >
                          {STATUS_LABEL[campaign.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#9a7d20]">{formatOffer(campaign)}</p>
                      <p className="mt-1 text-xs text-[#3f3f46]">
                        {formatDisplayDate(campaign.validFrom)} – {formatDisplayDate(campaign.validTill)}
                        {showShopColumn && ` · ${campaign.salonName}`}
                        {campaign.status === "draft" || campaign.status === "failed"
                          ? ` · ${campaign.audienceCount} customer${campaign.audienceCount === 1 ? "" : "s"}`
                          : ""}
                      </p>
                      {campaign.description ? (
                        <p className="mt-2 text-sm text-[#3f3f46] line-clamp-2">{campaign.description}</p>
                      ) : null}
                      {campaign.applicableScope === "selected_services" && campaign.services.length > 0 ? (
                        <p className="mt-2 text-xs text-[#3f3f46]">
                          Services: {campaign.services.map((s) => s.displayName || s.name).join(", ")}
                        </p>
                      ) : null}
                      {campaign.status === "completed" || campaign.status === "failed" ? (
                        <p className="mt-2 text-xs text-[#3f3f46]">
                          {campaign.sentCount} sent
                          {campaign.failedCount > 0 ? ` · ${campaign.failedCount} failed` : ""}
                          {campaign.couponCode ? ` · Coupon ${campaign.couponCode}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {campaign.status === "draft" || campaign.status === "failed" ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSend(campaign)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            {campaign.status === "failed" ? "Resend" : "Send"}
                          </button>
                          {campaign.status === "draft" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDelete(campaign)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
              <h2 className="text-base font-bold text-[#111118]">New campaign</h2>
              <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-[#3f3f46] hover:bg-[#f4f2ed]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {admin && franchiseShops.length > 1 ? (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">Shop *</span>
                  <FormSelect
                    value={formSalonId}
                    onValueChange={setFormSalonId}
                    options={shopSelectOptions}
                    placeholder="Select shop"
                    icon={Store}
                  />
                </label>
              ) : null}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
                  placeholder="Monsoon special"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">
                  Description (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">Offer type</span>
                  <FormSelect
                    value={form.offerType}
                    onValueChange={(v) => setForm((p) => ({ ...p, offerType: v as CampaignOfferType }))}
                    options={[
                      { value: "percentage", label: "Percentage %" },
                      { value: "flat", label: "Flat ₹" },
                    ]}
                  />
                </label>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">Value</label>
                  <input
                    type="number"
                    min={0}
                    step={form.offerType === "percentage" ? 1 : 50}
                    value={form.offerValue}
                    onChange={(e) => setForm((p) => ({ ...p, offerValue: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
                  />
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">Applies to</span>
                <FormSelect
                  value={form.applicableScope}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      applicableScope: v as CampaignScope,
                      serviceIds: v === "all_services" ? [] : p.serviceIds,
                    }))
                  }
                  options={[
                    { value: "all_services", label: "All services" },
                    { value: "selected_services", label: "Selected services" },
                  ]}
                />
              </label>
              {form.applicableScope === "selected_services" ? (
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">
                    Services
                  </label>
                  {servicesQuery.isLoading ? (
                    <p className="text-xs text-[#3f3f46]">Loading services…</p>
                  ) : serviceOptions.length === 0 ? (
                    <p className="text-xs text-[#9a7d20]">Select a shop first or add services</p>
                  ) : (
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-black/[0.08] p-2">
                      {serviceOptions.map((svc) => (
                        <label
                          key={svc.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#f4f2ed]"
                        >
                          <input
                            type="checkbox"
                            checked={form.serviceIds.includes(svc.id)}
                            onChange={() => toggleService(svc.id)}
                            className="rounded border-black/[0.15]"
                          />
                          <span className="truncate text-[#111118]">{svc.displayName || svc.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">
                    Valid from
                  </label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#3f3f46]">
                    Valid till
                  </label>
                  <input
                    type="date"
                    value={form.validTill}
                    onChange={(e) => setForm((p) => ({ ...p, validTill: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[13px] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#3f3f46]">
                <input
                  type="checkbox"
                  checked={form.generateCoupon}
                  onChange={(e) => setForm((p) => ({ ...p, generateCoupon: e.target.checked }))}
                  className="rounded border-black/[0.15]"
                />
                Auto-create & send coupon code (billing) in addition to the campaign offer message
              </label>
              <p className="text-[11px] text-[#52525b]">
                Campaign always sends <span className="font-semibold">starrkuts_campaign_offer</span> with
                banner. If checked, also creates a coupon and sends{" "}
                <span className="font-semibold">starrkuts_coupon_send</span>.
              </p>
            </div>
            <div className="flex gap-2 border-t border-black/[0.06] px-4 py-3">
              <button
                type="button"
                onClick={resetForm}
                className="h-10 flex-1 rounded-xl border border-black/[0.08] text-[12px] font-semibold text-[#3f3f46]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submit()}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[12px] font-bold text-[#111118] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save draft
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
