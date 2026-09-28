import { PrismaClient } from "@prisma/client";
import { isDevelopment } from "./env";

/**
 * A single shared PrismaClient instance for the whole process.
 * In development, we cache it on `global` so that hot-reloading (tsx watch)
 * doesn't exhaust PostgreSQL connections by creating a new client every reload.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isDevelopment ? ["warn", "error"] : ["error"],
  });

if (isDevelopment) {
  global.__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
