import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

/** `schema.prisma` 가 있는 디렉터리 — Prisma CLI와 동일하게 SQLite 상대 경로 기준 */
const PRISMA_SCHEMA_DIR = path.join(process.cwd(), "prisma");

/**
 * SQLite DATABASE_URL을 항상 절대 경로로 맞춥니다.
 * - Prisma CLI(`migrate` 등)는 `file:` 상대 경로를 **프로젝트 루트가 아니라** `prisma/` 폴더 기준으로 풉니다.
 * - 예전 .env 에 `file:./prisma/dev.db` 를 두면 CLI 쪽은 `prisma/prisma/dev.db` 가 되어 앱과 DB가 갈라지는 문제가 생깁니다.
 * - 권장: `DATABASE_URL="file:./dev.db"` (→ `<프로젝트>/prisma/dev.db` 한 곳만 사용).
 */
function getAbsoluteSqlitePath(): string {
    const fromEnv = process.env.DATABASE_URL?.trim();

    if (!fromEnv) {
        return path.join(PRISMA_SCHEMA_DIR, "dev.db");
    }

    if (!fromEnv.startsWith("file:")) {
        return path.join(PRISMA_SCHEMA_DIR, "dev.db");
    }

    // file:///… 형식 (절대 URL)
    if (fromEnv.startsWith("file:///") || fromEnv.startsWith("file://")) {
        try {
            return fileURLToPath(fromEnv);
        } catch {
            // 아래 상대 경로 처리로 폴백
        }
    }

    let rest = fromEnv.slice("file:".length).replace(/^\/+/, "");
    if (path.isAbsolute(rest)) {
        return rest;
    }

    rest = rest.replace(/^\.\//, "");
    // 이미 prisma/ 를 기준 디렉터리로 쓰므로, `prisma/dev.db` 는 `dev.db` 로 환원
    if (rest.startsWith(`prisma${path.sep}`)) {
        rest = rest.slice(`prisma${path.sep}`.length);
    }

    return path.resolve(PRISMA_SCHEMA_DIR, rest);
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
