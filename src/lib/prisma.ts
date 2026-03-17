import path from "node:path";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Prisma SQLite does NOT support percent-encoded paths (e.g. %20 for spaces).
// We build the URL using the raw filesystem path so spaces are preserved as-is.
function getDatasourceUrl(): string {
    const fromEnv = process.env.DATABASE_URL;
    // If the env var is already set and valid (no %20 encoding issues), use it.
    // Otherwise fall back to an absolute path derived from cwd.
    if (fromEnv?.startsWith("file:") && !fromEnv.includes("%")) {
        return fromEnv;
    }
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    return `file:${dbPath}`;
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasourceUrl: getDatasourceUrl(),
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
