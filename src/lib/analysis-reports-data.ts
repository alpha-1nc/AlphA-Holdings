import { promises as fs } from "fs";
import path from "path";
import { ANALYSIS_REPORTS, type AnalysisReportMeta } from "@/constants/analysis-reports";
import { prisma } from "@/lib/prisma";

const REGISTRY_PATH = path.join(process.cwd(), "public", "analysis-reports", "registry.json");

export type UserRegistryEntry = AnalysisReportMeta & {
    addedAt: string;
};

function reportKey(r: Pick<AnalysisReportMeta, "year" | "month" | "companyCode">) {
    return `${r.year}-${r.month}-${r.companyCode.toUpperCase()}`;
}

export async function readRegistry(): Promise<UserRegistryEntry[]> {
    try {
        const raw = await fs.readFile(REGISTRY_PATH, "utf-8");
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed as UserRegistryEntry[];
    } catch {
        return [];
    }
}

async function readRegistryFromDb(): Promise<UserRegistryEntry[]> {
    const rows = await prisma.analysisReportUpload.findMany({
        orderBy: { addedAt: "asc" },
    });
    return rows.map((row) => ({
        year: row.year,
        month: row.month,
        companyCode: row.companyCode,
        companyName: row.companyName,
        title: row.title,
        fileName: row.fileName,
        verdict: row.verdict as AnalysisReportMeta["verdict"] | undefined,
        htmlSource: "database" as const,
        addedAt: row.addedAt.toISOString(),
    }));
}

function withStaticSource(r: AnalysisReportMeta): AnalysisReportMeta {
    return { ...r, htmlSource: "static" };
}

/** 코드 정의 + 파일 레지스트리 + DB(붙여넣기)를 합칩니다. 동일 연·월·티커는 나중 항목이 우선(DB가 파일보다 우선). */
export async function getMergedAnalysisReports(): Promise<AnalysisReportMeta[]> {
    const fromFile = await readRegistry();
    const fromDb = await readRegistryFromDb();
    const map = new Map<string, AnalysisReportMeta>();
    for (const r of ANALYSIS_REPORTS) {
        map.set(reportKey(r), withStaticSource(r));
    }
    for (const r of fromFile) {
        map.set(reportKey(r), { ...r, htmlSource: "static" });
    }
    for (const r of fromDb) {
        map.set(reportKey(r), r);
    }
    return [...map.values()].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return a.companyCode.localeCompare(b.companyCode);
    });
}

export async function getReportBySlugMerged(
    yearStr: string,
    monthStr: string,
    slug: string
): Promise<AnalysisReportMeta | undefined> {
    const reports = await getMergedAnalysisReports();
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (Number.isNaN(year) || Number.isNaN(month)) return undefined;
    return reports.find(
        (r) =>
            r.year === year &&
            r.month === month &&
            r.companyCode.toUpperCase() === slug.toUpperCase()
    );
}

/** 붙여넣기 등록: 배포 환경(Vercel 등)에서 public/ 쓰기가 불가하므로 DB에만 저장합니다. */
export async function upsertUserReport(html: string, meta: AnalysisReportMeta): Promise<void> {
    const code = meta.companyCode.toUpperCase();
    await prisma.analysisReportUpload.upsert({
        where: {
            year_month_companyCode: {
                year: meta.year,
                month: meta.month,
                companyCode: code,
            },
        },
        create: {
            year: meta.year,
            month: meta.month,
            companyCode: code,
            companyName: meta.companyName,
            title: meta.title,
            fileName: meta.fileName,
            verdict: meta.verdict ?? null,
            html,
        },
        update: {
            companyName: meta.companyName,
            title: meta.title,
            fileName: meta.fileName,
            verdict: meta.verdict ?? null,
            html,
        },
    });
}
