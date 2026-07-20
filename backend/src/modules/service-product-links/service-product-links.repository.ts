import type { ServiceProductLink } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/errors";
import type { AuthContext } from "../auth/auth.types";
import { SERVICE_PRODUCT_LINK_ERROR_CODES } from "./service-product-links.constants";
import type { ReplaceServiceProductLinksInput } from "./service-product-links.validators";

function mapLink(link: ServiceProductLink) {
  return {
    id: link.id,
    serviceId: link.serviceId,
    productId: link.productId,
    sku: link.sku,
    name: link.name,
    defaultQty: link.defaultQty,
    unit: link.unit,
    wasteBuffer: link.wasteBuffer,
    minQty: link.minQty,
    maxQty: link.maxQty,
  };
}

export class ServiceProductLinksRepository {
  async listGrouped(salonId: string) {
    const links = await prisma.serviceProductLink.findMany({
      where: { salonId },
      include: { service: { select: { id: true, name: true } } },
      orderBy: [{ serviceId: "asc" }, { name: "asc" }],
    });

    const grouped: Record<
      string,
      { serviceId: string; serviceName: string; links: ReturnType<typeof mapLink>[] }
    > = {};

    for (const link of links) {
      if (!grouped[link.serviceId]) {
        grouped[link.serviceId] = {
          serviceId: link.serviceId,
          serviceName: link.service.name,
          links: [],
        };
      }
      grouped[link.serviceId].links.push(mapLink(link));
    }

    return Object.values(grouped);
  }

  async listByServiceId(salonId: string, serviceId: string) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!service) {
      throw new AppError(404, "Service not found", {
        code: SERVICE_PRODUCT_LINK_ERROR_CODES.SERVICE_NOT_FOUND,
      });
    }

    const links = await prisma.serviceProductLink.findMany({
      where: { salonId, serviceId },
      orderBy: { name: "asc" },
    });

    return {
      serviceId: service.id,
      serviceName: service.name,
      links: links.map(mapLink),
    };
  }

  async replaceForService(
    auth: AuthContext,
    serviceId: string,
    input: ReplaceServiceProductLinksInput,
  ) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId: auth.salonId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!service) {
      throw new AppError(404, "Service not found", {
        code: SERVICE_PRODUCT_LINK_ERROR_CODES.SERVICE_NOT_FOUND,
      });
    }

    for (const link of input.links) {
      if (link.productId) {
        const product = await prisma.product.findFirst({
          where: { id: link.productId, salonId: auth.salonId, deletedAt: null },
        });
        if (!product) {
          throw new AppError(404, "Product not found", {
            code: SERVICE_PRODUCT_LINK_ERROR_CODES.PRODUCT_NOT_FOUND,
          });
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.serviceProductLink.deleteMany({
        where: { salonId: auth.salonId, serviceId },
      });

      if (input.links.length > 0) {
        await tx.serviceProductLink.createMany({
          data: input.links.map((link) => ({
            salonId: auth.salonId,
            serviceId,
            productId: link.productId ?? null,
            sku: link.sku,
            name: link.name,
            defaultQty: link.defaultQty ?? 1,
            unit: link.unit ?? "piece",
            wasteBuffer: link.wasteBuffer ?? 0,
            minQty: link.minQty ?? 1,
            maxQty: link.maxQty ?? 99,
          })),
        });
      }
    });

    return this.listByServiceId(auth.salonId, serviceId);
  }
}

export const serviceProductLinksRepository = new ServiceProductLinksRepository();
