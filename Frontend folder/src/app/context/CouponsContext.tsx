import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createCoupon as apiCreateCoupon,
  deleteCoupon as apiDeleteCoupon,
  fetchCoupons,
  updateCoupon as apiUpdateCoupon,
  type ApiCoupon,
  type CreateCouponPayload,
} from "../../api/coupons";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "../components/ui/hot-toast";

export type CouponType = "percentage" | "flat";
export type CouponStatus = "active" | "expired" | "disabled";

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value: number;
  minSpend: number;
  maxDiscount?: number;
  validFrom: string;
  validTill: string;
  usageLimit: number;
  usedCount: number;
  status: CouponStatus;
  applicableTo: string;
  sentTo: { customerId: number; customerName: string; sentAt: string; channel: "whatsapp" | "sms" }[];
}

interface CouponsContextType {
  coupons: Coupon[];
  loading: boolean;
  refreshCoupons: () => Promise<void>;
  addCoupon: (c: Omit<Coupon, "id" | "usedCount" | "sentTo">) => void;
  updateCoupon: (id: string, patch: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  recordSend: (id: string, customerId: number, customerName: string, channel: "whatsapp" | "sms") => void;
}

const CouponsContext = createContext<CouponsContextType | null>(null);

function mapCoupon(api: ApiCoupon): Coupon {
  return { ...api, sentTo: [] };
}

export function CouponsProvider({ children }: { children: ReactNode }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCoupons = useCallback(async () => {
    try {
      const data = await fetchCoupons();
      setCoupons(data.map(mapCoupon));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load coupons"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCoupons();
  }, [refreshCoupons]);

  const addCoupon: CouponsContextType["addCoupon"] = (c) => {
    const payload: CreateCouponPayload = {
      code: c.code,
      title: c.title,
      description: c.description,
      type: c.type,
      value: c.value,
      minSpend: c.minSpend,
      maxDiscount: c.maxDiscount,
      validFrom: c.validFrom,
      validTill: c.validTill,
      usageLimit: c.usageLimit,
      applicableTo: c.applicableTo,
      status: c.status,
    };
    void apiCreateCoupon(payload)
      .then((created) => setCoupons((prev) => [mapCoupon(created), ...prev]))
      .catch((error) => toast.error(getApiErrorMessage(error, "Failed to create coupon")));
  };

  const updateCoupon: CouponsContextType["updateCoupon"] = (id, patch) => {
    void apiUpdateCoupon(id, patch)
      .then((updated) =>
        setCoupons((prev) => prev.map((coupon) => (coupon.id === id ? mapCoupon(updated) : coupon))),
      )
      .catch((error) => toast.error(getApiErrorMessage(error, "Failed to update coupon")));
  };

  const deleteCoupon: CouponsContextType["deleteCoupon"] = (id) => {
    void apiDeleteCoupon(id)
      .then(() => setCoupons((prev) => prev.filter((coupon) => coupon.id !== id)))
      .catch((error) => toast.error(getApiErrorMessage(error, "Failed to delete coupon")));
  };

  const recordSend: CouponsContextType["recordSend"] = (_id, _customerId, customerName, channel) => {
    toast.success(`Coupon delivery queued`, {
      description: `${channel === "whatsapp" ? "WhatsApp" : "SMS"} to ${customerName}`,
    });
  };

  return (
    <CouponsContext.Provider
      value={{ coupons, loading, refreshCoupons, addCoupon, updateCoupon, deleteCoupon, recordSend }}
    >
      {children}
    </CouponsContext.Provider>
  );
}

export function useCoupons() {
  const ctx = useContext(CouponsContext);
  if (!ctx) throw new Error("useCoupons must be used within a CouponsProvider");
  return ctx;
}
