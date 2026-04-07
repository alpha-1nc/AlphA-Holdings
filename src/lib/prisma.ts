import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

/**
 * SQLite DATABASE_URL을 항상 절대 경로로 맞춥니다.
 * - `file:./dev.db`처럼 상대 경로만 있으면 Next.js/Turbopack 실행 시 cwd에 따라 DB 위치가 달라져
 *   Error code 14 (Unable to open the database file)가 날 수 있습니다.
 * - 마이그레이션 기본 위치는 `prisma/dev.db`와 일치시키는 것이 안전합니다.
 */
function getAbsoluteSqlitePath(): string {
    const fromEnv = process.env.DATABASE_URL?.trim();

    if (!fromEnv) {
        return path.join(process.cwd(), "prisma", "dev.db");
    }

    if (!fromEnv.startsWith("file:")) {
        return path.join(process.cwd(), "prisma", "dev.db");
    }

    // file:///… 형식 (절대 URL)
    if (fromEnv.startsWith("file:///") || fromEnv.startsWith("file://")) {
        try {
            return fileURLToPath(fromEnv);
        } catch {
            // 아래 상대 경로 처리로 폴백
        }
    }

    const rest = fromEnv.slice("file:".length).replace(/^\/+/, "");
    if (path.isAbsolute(rest)) {
        return rest;
    }

    return path.resolve(process.cwd(), rest);
}

function getDatasourceUrl(): string {
    const absolute = getAbsoluteSqlitePath();

    const dir = path.dirname(absolute);
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch {
        // 권한 문제는 SQLite 단계에서 동일하게 14로 드러남
    }

    // Prisma SQLite: 경로에 % 인코딩 쓰지 않음
    return `file:${absolute}`;
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasourceUrl: getDatasourceUrl(),
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
