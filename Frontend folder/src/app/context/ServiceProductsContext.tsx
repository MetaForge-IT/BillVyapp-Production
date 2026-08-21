import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchServiceProductLinks,
  replaceServiceProductLinks,
  type ServiceProductLinkDto,
} from "../../api/service-product-links";
import { getApiErrorMessage } from "../../lib/api";
import { toast } from "../components/ui/hot-toast";

export type ServiceProductLink = {
  sku: string;
  name: string;
  defaultQty: number;
  unit: "ml" | "g" | "piece" | "application";
  wasteBuffer: number;
  minQty: number;
  maxQty: number;
  productId?: string | null;
};

export type ServiceLinksMap = Record<string, ServiceProductLink[]>;

type ServiceProductsContextValue = {
  links: ServiceLinksMap;
  loading: boolean;
  refreshLinks: () => Promise<void>;
  getLinks: (serviceId: string) => ServiceProductLink[];
  setLinks: (serviceId: string, links: ServiceProductLink[]) => void;
  removeLink: (serviceId: string, sku: string) => void;
};

const ServiceProductsContext = createContext<ServiceProductsContextValue | null>(null);

function mapLink(dto: ServiceProductLinkDto): ServiceProductLink {
  return {
    sku: dto.sku,
    name: dto.name,
    defaultQty: dto.defaultQty,
    unit: dto.unit as ServiceProductLink["unit"],
    wasteBuffer: dto.wasteBuffer,
    minQty: dto.minQty,
    maxQty: dto.maxQty,
    productId: dto.productId,
  };
}

function toApiPayload(links: ServiceProductLink[]) {
  return links.map((link) => ({
    productId: link.productId ?? null,
    sku: link.sku,
    name: link.name,
    defaultQty: link.defaultQty,
    unit: link.unit,
    wasteBuffer: link.wasteBuffer,
    minQty: link.minQty,
    maxQty: link.maxQty,
  }));
}

export function ServiceProductsProvider({ children }: { children: ReactNode }) {
  const [links, setLinksState] = useState<ServiceLinksMap>({});
  const [loading, setLoading] = useState(true);

  const refreshLinks = useCallback(async () => {
    try {
      const grouped = await fetchServiceProductLinks();
      if (!Array.isArray(grouped)) return;
      const map: ServiceLinksMap = {};
      for (const group of grouped) {
        map[group.serviceId] = group.links.map(mapLink);
      }
      setLinksState(map);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load service product links"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLinks();
  }, [refreshLinks]);

  const getLinks = useCallback((serviceId: string): ServiceProductLink[] => {
    return links[serviceId] ?? [];
  }, [links]);

  const setLinks = useCallback((serviceId: string, newLinks: ServiceProductLink[]) => {
    void replaceServiceProductLinks(serviceId, toApiPayload(newLinks))
      .then((group) => {
        setLinksState((prev) => ({ ...prev, [serviceId]: group.links.map(mapLink) }));
      })
      .catch((error) => toast.error(getApiErrorMessage(error, "Failed to save product links")));
  }, []);

  const removeLink = useCallback((serviceId: string, sku: string) => {
    setLinksState((prev) => {
      const next = (prev[serviceId] ?? []).filter((link) => link.sku !== sku);
      void replaceServiceProductLinks(serviceId, toApiPayload(next))
        .then((group) => {
          setLinksState((curr) => ({ ...curr, [serviceId]: group.links.map(mapLink) }));
        })
        .catch((error) => toast.error(getApiErrorMessage(error, "Failed to save product links")));
      return { ...prev, [serviceId]: next };
    });
  }, []);

  const value = useMemo(
    () => ({ links, loading, refreshLinks, getLinks, setLinks, removeLink }),
    [links, loading, refreshLinks, getLinks, setLinks, removeLink],
  );

  return (
    <ServiceProductsContext.Provider value={value}>
      {children}
    </ServiceProductsContext.Provider>
  );
}

export function useServiceProducts() {
  const ctx = useContext(ServiceProductsContext);
  if (!ctx) throw new Error("useServiceProducts must be inside ServiceProductsProvider");
  return ctx;
}
