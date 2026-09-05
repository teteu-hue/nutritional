import { normalizeDatabaseEnv } from "@/server/core/env";
import { PrismaClient } from "@prisma/client";

normalizeDatabaseEnv();

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = createPrismaClient();
  }
  return globalForPrisma.__prisma;
}

export const prisma = getPrisma();
