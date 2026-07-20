import type { Vendor } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AuthContext } from "../auth/auth.types";
import { AppError, ConflictError } from "../../utils/errors";
import { VENDOR_ERROR_CODES, VENDOR_STATUS } from "./vendors.constants";
import type { CreateVendorInput, UpdateVendorInput } from "./vendors.validators";

type VendorWithCounts = Vendor & {
  _count: { products: number; purchaseOrders: number };
};

function mapStatus(isActive: boolean): "active" | "inactive" {
  return isActive ? VENDOR_STATUS.ACTIVE : VENDOR_STATUS.INACTIVE;
}

function mapVendor(vendor: VendorWithCounts) {
  return {
    id: vendor.id,
    name: vendor.name,
    contactPerson: vendor.contactPerson ?? "",
    phone: vendor.phone ?? "",
    email: vendor.email ?? "",
    address: vendor.address ?? "",
    gstin: vendor.gstin ?? "",
    paymentTerms: vendor.paymentTerms ?? "",
    status: mapStatus(vendor.isActive),
    productCount: vendor._count.products,
    purchaseCount: vendor._count.purchaseOrders,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  };
}

function toIsActive(status?: "active" | "inactive"): boolean | undefined {
  if (status === undefined) return undefined;
  return status === VENDOR_STATUS.ACTIVE;
}

const vendorInclude = {
  _count: {
    select: {
      products: { where: { deletedAt: null } },
      purchaseOrders: true,
    },
  },
} as const;

export class VendorsRepository {
  async list(salonId: string) {
    const vendors = await prisma.vendor.findMany({
      where: { salonId, deletedAt: null },
      include: vendorInclude,
      orderBy: { name: "asc" },
    });
    return vendors.map(mapVendor);
  }

  async getById(salonId: string, vendorId: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, salonId, deletedAt: null },
      include: vendorInclude,
    });
    if (!vendor) {
      throw new AppError(404, "Vendor not found", { code: VENDOR_ERROR_CODES.NOT_FOUND });
    }
    return mapVendor(vendor);
  }

  async create(auth: AuthContext, input: CreateVendorInput) {
    const duplicate = await prisma.vendor.findFirst({
      where: { salonId: auth.salonId, name: input.name, deletedAt: null },
    });
    if (duplicate) {
      throw new ConflictError("A vendor with this name already exists");
    }

    const vendor = await prisma.vendor.create({
      data: {
        salonId: auth.salonId,
        name: input.name,
        contactPerson: input.contactPerson ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        gstin: input.gstin ?? null,
        paymentTerms: input.paymentTerms ?? null,
        isActive: toIsActive(input.status) ?? true,
        createdById: auth.userId,
      },
      include: vendorInclude,
    });
    return mapVendor(vendor);
  }

  async update(auth: AuthContext, vendorId: string, input: UpdateVendorInput) {
    const existing = await prisma.vendor.findFirst({
      where: { id: vendorId, salonId: auth.salonId, deletedAt: null },
    });
    if (!existing) {
      throw new AppError(404, "Vendor not found", { code: VENDOR_ERROR_CODES.NOT_FOUND });
    }

    if (input.name) {
      const duplicate = await prisma.vendor.findFirst({
        where: {
          salonId: auth.salonId,
          name: input.name,
          deletedAt: null,
          NOT: { id: vendorId },
        },
      });
      if (duplicate) {
        throw new ConflictError("A vendor with this name already exists");
      }
    }

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        name: input.name,
        contactPerson: input.contactPerson === "" ? null : input.contactPerson,
        phone: input.phone === "" ? null : input.phone,
        email: input.email === "" ? null : input.email,
        address: input.address === "" ? null : input.address,
        gstin: input.gstin === "" ? null : input.gstin,
        paymentTerms: input.paymentTerms === "" ? null : input.paymentTerms,
        isActive: toIsActive(input.status),
        updatedById: auth.userId,
      },
      include: vendorInclude,
    });
    return mapVendor(vendor);
  }

  async softDelete(auth: AuthContext, vendorId: string) {
    const existing = await prisma.vendor.findFirst({
      where: { id: vendorId, salonId: auth.salonId, deletedAt: null },
      include: vendorInclude,
    });
    if (!existing) {
      throw new AppError(404, "Vendor not found", { code: VENDOR_ERROR_CODES.NOT_FOUND });
    }
    if (existing._count.products > 0) {
      throw new AppError(400, "Cannot delete a vendor that has products assigned", {
        code: VENDOR_ERROR_CODES.HAS_PRODUCTS,
      });
    }
    if (existing._count.purchaseOrders > 0) {
      throw new AppError(400, "Cannot delete a vendor that has purchase history", {
        code: VENDOR_ERROR_CODES.HAS_PURCHASES,
      });
    }

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        deletedAt: new Date(),
        deletedById: auth.userId,
        isActive: false,
      },
    });
  }
}

export const vendorsRepository = new VendorsRepository();
