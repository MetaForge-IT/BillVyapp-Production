import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";
import type { AuthContext } from "../auth/auth.types";
import type { CreateManagerInput, CreateShopInput, UpdateShopAddressInput } from "./my-franchise.validators";

async function resolveAdminFranchiseId(auth: AuthContext): Promise<string> {
  if (auth.franchiseId) return auth.franchiseId;

  if (auth.salonId) {
    const salon = await prisma.salon.findUnique({
      where: { id: auth.salonId },
      select: { franchiseId: true },
    });
    if (salon?.franchiseId) return salon.franchiseId;
  }

  throw new ForbiddenError("No franchise is linked to this admin account");
}

export class MyFranchiseService {
  async getMyFranchise(auth: AuthContext) {
    const franchiseId = await resolveAdminFranchiseId(auth);
    const franchise = await prisma.franchise.findUnique({
      where: { id: franchiseId },
      include: {
        shops: {
          where: { isActive: true },
          orderBy: [{ city: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            displayName: true,
            code: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            isActive: true,
          },
        },
        users: {
          where: { isActive: true, role: { in: ["admin", "manager"] } },
          orderBy: [{ role: "asc" }, { fullName: "asc" }],
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            salonId: true,
            salon: {
              select: { id: true, displayName: true, city: true, name: true, address: true, state: true, pincode: true },
            },
          },
        },
      },
    });

    if (!franchise) throw new NotFoundError("Franchise not found");

    return {
      id: franchise.id,
      name: franchise.name,
      slug: franchise.slug,
      logoUrl: franchise.logoUrl,
      isActive: franchise.isActive,
      shops: franchise.shops,
      staff: franchise.users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        salonId: u.salonId,
        shopLabel:
          u.salon?.displayName ||
          u.salon?.name ||
          (u.role === "admin" ? "All shops" : "—"),
        shopCity: u.salon?.city ?? null,
        shopAddress: u.salon?.address ?? null,
      })),
      managers: franchise.users
        .filter((u) => u.role === "manager")
        .map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          salonId: u.salonId,
          shopLabel: u.salon?.displayName || u.salon?.name || "—",
          shopCity: u.salon?.city ?? null,
          shopAddress: u.salon?.address ?? null,
          shopState: u.salon?.state ?? null,
          shopPincode: u.salon?.pincode ?? null,
        })),
      createdAt: franchise.createdAt.toISOString(),
    };
  }

  async createShop(auth: AuthContext, input: CreateShopInput) {
    const franchiseId = await resolveAdminFranchiseId(auth);
    const franchise = await prisma.franchise.findUnique({ where: { id: franchiseId } });
    if (!franchise) throw new NotFoundError("Franchise not found");

    const emailTaken = await prisma.salon.findUnique({ where: { email: input.email } });
    if (emailTaken) throw new ConflictError("A shop with this email already exists");

    const shop = await prisma.salon.create({
      data: {
        franchiseId,
        name: input.name,
        displayName: input.displayName || null,
        code: input.code || null,
        email: input.email,
        phone: input.phone,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        pincode: input.pincode || null,
        isActive: true,
      },
    });

    await prisma.salonFinancialSettings.create({
      data: {
        salonId: shop.id,
        gstEnabled: true,
        defaultGstRate: 18,
        receiptPrefix: "RCP",
        nextReceiptSequence: 1,
      },
    });
    await prisma.salonNotificationSettings.create({
      data: { salonId: shop.id },
    });

    // First shop for this admin becomes their primary salon scope (dashboard / ops).
    const adminUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { salonId: true },
    });
    if (adminUser && !adminUser.salonId) {
      await prisma.user.update({
        where: { id: auth.userId },
        data: { salonId: shop.id },
      });
    }

    // New shops start with an empty service menu. Catalog is filled by upload/CRUD
    // and stays salon-scoped (auth.salonId) so it never leaks across franchises/shops.

    return {
      id: shop.id,
      name: shop.name,
      displayName: shop.displayName,
      code: shop.code,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      city: shop.city,
      state: shop.state,
      pincode: shop.pincode,
      isActive: shop.isActive,
    };
  }

  async createManager(auth: AuthContext, input: CreateManagerInput) {
    const franchiseId = await resolveAdminFranchiseId(auth);

    const shop = await prisma.salon.findFirst({
      where: { id: input.salonId, franchiseId, isActive: true },
    });
    if (!shop) {
      throw new AppError(400, "Shop does not belong to your franchise", {
        code: "SHOP_FRANCHISE_MISMATCH",
      });
    }

    const emailTaken = await prisma.user.findFirst({ where: { email: input.email } });
    if (emailTaken) throw new ConflictError("A user with this email already exists");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        phone: input.phone || null,
        passwordHash,
        role: "manager",
        salonId: input.salonId,
        franchiseId,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        salonId: true,
        franchiseId: true,
      },
    });

    return {
      ...user,
      shopLabel: shop.displayName || shop.name,
      shopCity: shop.city,
      shopAddress: shop.address,
      shopState: shop.state,
      shopPincode: shop.pincode,
    };
  }

  async updateShopAddress(auth: AuthContext, shopId: string, input: UpdateShopAddressInput) {
    const franchiseId = await resolveAdminFranchiseId(auth);

    const shop = await prisma.salon.findFirst({
      where: { id: shopId, franchiseId, isActive: true },
    });
    if (!shop) {
      throw new NotFoundError("Shop not found in your franchise");
    }

    const updated = await prisma.salon.update({
      where: { id: shopId },
      data: {
        ...(input.address !== undefined ? { address: input.address || null } : {}),
        ...(input.city !== undefined ? { city: input.city || null } : {}),
        ...(input.state !== undefined ? { state: input.state || null } : {}),
        ...(input.pincode !== undefined ? { pincode: input.pincode || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.displayName !== undefined
          ? { displayName: input.displayName || null }
          : {}),
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        code: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        isActive: true,
      },
    });

    return updated;
  }

  /**
   * Soft-delete a shop/branch: sets isActive=false so operational history is kept.
   * Deactivates managers assigned only to that shop and reassigns the admin primary salon if needed.
   */
  async deleteShop(auth: AuthContext, shopId: string) {
    const franchiseId = await resolveAdminFranchiseId(auth);

    const shop = await prisma.salon.findFirst({
      where: { id: shopId, franchiseId, isActive: true },
    });
    if (!shop) {
      throw new NotFoundError("Shop not found in your franchise");
    }

    const activeShopCount = await prisma.salon.count({
      where: { franchiseId, isActive: true },
    });
    if (activeShopCount <= 1) {
      throw new AppError(400, "Cannot delete the last active branch in your franchise", {
        code: "LAST_SHOP",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.salon.update({
        where: { id: shopId },
        data: { isActive: false },
      });

      await tx.user.updateMany({
        where: {
          franchiseId,
          salonId: shopId,
          role: "manager",
          isActive: true,
        },
        data: { isActive: false },
      });

      const adminUser = await tx.user.findUnique({
        where: { id: auth.userId },
        select: { salonId: true },
      });
      if (adminUser?.salonId === shopId) {
        const fallback = await tx.salon.findFirst({
          where: { franchiseId, isActive: true, id: { not: shopId } },
          orderBy: [{ city: "asc" }, { name: "asc" }],
          select: { id: true },
        });
        await tx.user.update({
          where: { id: auth.userId },
          data: { salonId: fallback?.id ?? null },
        });
      }
    });

    return { id: shopId, isActive: false as const };
  }
}

export const myFranchiseService = new MyFranchiseService();
