import { prisma } from "../../config/prisma";

export class StaffRepository {
  async listActive(salonId: string) {
    const users = await prisma.user.findMany({
      where: { salonId, isActive: true },
      select: {
        id: true,
        fullName: true,
        role: true,
        phone: true,
        avatarUrl: true,
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
    });

    return users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone ?? "",
      avatarUrl: user.avatarUrl ?? "",
    }));
  }
}

export const staffRepository = new StaffRepository();
