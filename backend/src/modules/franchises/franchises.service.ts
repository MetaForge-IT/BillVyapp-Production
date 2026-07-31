import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { AppError, ConflictError, NotFoundError } from "../../utils/errors";
import type {
  CreateFranchiseInput,
  CreateShopInput,
  CreateStaffUserInput,
  UpdateFranchiseInput,
} from "./franchises.validators";

function slugifyFallback(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export class FranchisesService {
  async overview() {
    const [franchises, shops, admins, managers, superAdmins] = await Promise.all([
      prisma.franchise.count(),
      prisma.salon.count({ where: { franchiseId: { not: null } } }),
      prisma.user.count({ where: { role: "admin", isActive: true } }),
      prisma.user.count({ where: { role: "manager", isActive: true } }),
      prisma.user.count({ where: { role: "super_admin", isActive: true } }),
    ]);

    return {
      franchises,
      shops,
      admins,
      managers,
      superAdmins,
    };
  }

  async listFranchises() {
    const rows = await prisma.franchise.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { shops: true, users: true } },
        users: {
          where: { role: "admin", isActive: true },
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    return rows.map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      logoUrl: f.logoUrl,
      isActive: f.isActive,
      shopCount: f._count.shops,
      userCount: f._count.users,
      admins: f.users,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async getFranchise(franchiseId: string) {
    const franchise = await prisma.franchise.findUnique({
      where: { id: franchiseId },
      include: {
        shops: {
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
              select: { id: true, displayName: true, city: true, name: true },
            },
          },
        },
      },
    });

    if (!franchise) {
      throw new NotFoundError("Franchise not found");
    }

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
      })),
      createdAt: franchise.createdAt.toISOString(),
    };
  }

  async createFranchise(input: CreateFranchiseInput) {
    const slug = input.slug || slugifyFallback(input.name);
    const existing = await prisma.franchise.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError("A franchise with this slug already exists");
    }

    const created = await prisma.franchise.create({
      data: {
        name: input.name,
        slug,
        logoUrl: input.logoUrl || null,
        isActive: input.isActive ?? true,
      },
    });

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      logoUrl: created.logoUrl,
      isActive: created.isActive,
      shopCount: 0,
      userCount: 0,
      admins: [],
      createdAt: created.createdAt.toISOString(),
    };
  }

  async updateFranchise(franchiseId: string, input: UpdateFranchiseInput) {
    const existing = await prisma.franchise.findUnique({ where: { id: franchiseId } });
    if (!existing) throw new NotFoundError("Franchise not found");

    if (input.slug && input.slug !== existing.slug) {
      const clash = await prisma.franchise.findUnique({ where: { slug: input.slug } });
      if (clash) throw new ConflictError("A franchise with this slug already exists");
    }

    const updated = await prisma.franchise.update({
      where: { id: franchiseId },
      data: {
        name: input.name,
        slug: input.slug,
        logoUrl: input.logoUrl === "" ? null : input.logoUrl,
        isActive: input.isActive,
      },
    });

    return this.getFranchise(updated.id);
  }

  async createShop(franchiseId: string, input: CreateShopInput) {
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
        isActive: input.isActive ?? true,
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

  async listStaff() {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["admin", "manager", "super_admin"] },
        isActive: true,
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        salonId: true,
        franchiseId: true,
        franchise: { select: { id: true, name: true } },
        salon: {
          select: { id: true, name: true, displayName: true, city: true },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      franchiseId: u.franchiseId,
      franchiseName: u.franchise?.name ?? null,
      salonId: u.salonId,
      shopLabel: u.salon?.displayName || u.salon?.name || null,
      shopCity: u.salon?.city ?? null,
    }));
  }

  async createStaffUser(input: CreateStaffUserInput) {
    const franchise = await prisma.franchise.findUnique({ where: { id: input.franchiseId } });
    if (!franchise) throw new NotFoundError("Franchise not found");

    const shop = await prisma.salon.findFirst({
      where: { id: input.salonId, franchiseId: input.franchiseId },
    });
    if (!shop) {
      throw new AppError(400, "Shop does not belong to this franchise", {
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
        role: input.role,
        salonId: input.salonId,
        franchiseId: input.franchiseId,
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

    return user;
  }
}

export const franchisesService = new FranchisesService();
