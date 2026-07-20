import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: env.isDevelopment ? ["warn", "error"] : ["error"],
  });
}

/**
 * Singleton Prisma client.
 * Reuses the same instance during hot-reload in development.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
