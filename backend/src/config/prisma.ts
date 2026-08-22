import { PrismaClient } from "@prisma/client";
import { databaseConfig } from "./database.config";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRead: PrismaClient | undefined;
};

function createPrismaClient(url?: string): PrismaClient {
  return new PrismaClient({
    log: env.isDevelopment ? ["warn", "error"] : ["error"],
    ...(url
      ? {
          datasources: {
            db: { url },
          },
        }
      : {}),
  });
}

/**
 * Primary writer — transactions, checkout, mutations.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

/**
 * Read replica for reporting (dashboard, search). Falls back to primary when
 * DATABASE_URL_READ is not configured.
 */
export const prismaRead =
  globalForPrisma.prismaRead ??
  (databaseConfig.readReplicaEnabled
    ? createPrismaClient(databaseConfig.readUrl)
    : prisma);

/** Use for read-heavy reporting queries. */
export function getReadClient(): PrismaClient {
  return prismaRead;
}

if (env.isDevelopment) {
  globalForPrisma.prisma = prisma;
  if (databaseConfig.readReplicaEnabled) {
    globalForPrisma.prismaRead = prismaRead;
  }
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  if (databaseConfig.readReplicaEnabled && prismaRead !== prisma) {
    await prismaRead.$disconnect();
  }
}
