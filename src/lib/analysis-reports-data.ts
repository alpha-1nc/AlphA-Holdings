import { promises as fs } from "fs";
import path from "path";
import { ANALYSIS_REPORTS, type AnalysisReportMeta } from "@/constants/analysis-reports";

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

/** 코드에 정의된 보고서 + 붙여넣기로 등록한 보고서(레지스트리)를 합칩니다. 동일 연·월·티커는 레지스트리가 우선합니다. */
export async function getMergedAnalysisReports(): Promise<AnalysisReportMeta[]> {
    const dynamic = await readRegistry();
    const map = new Map<string, AnalysisReportMeta>();
    for (const r of ANALYSIS_REPORTS) {
        map.set(reportKey(r), r);
    }
    for (const r of dynamic) {
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

export async function upsertUserReport(html: string, meta: AnalysisReportMeta): Promise<void> {
    const monthDir = String(meta.month).padStart(2, "0");
    const dir = path.join(process.cwd(), "public", "analysis-reports", String(meta.year), monthDir);
    await fs.mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, meta.fileName);

    const list = await readRegistry();
    const idx = list.findIndex((e) => reportKey(e) === reportKey(meta));

    if (idx >= 0) {
        const old = list[idx];
        if (old.fileName !== meta.fileName) {
            const oldPath = path.join(dir, old.fileName);
            try {
                await fs.unlink(oldPath);
            } catch {
                /* ignore */
            }
        }
    }

    await fs.writeFile(fullPath, html, "utf-8");

    const now = new Date().toISOString();
    const entry: UserRegistryEntry = {
        ...meta,
        addedAt: idx >= 0 ? list[idx].addedAt : now,
    };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);

    await fs.writeFile(REGISTRY_PATH, JSON.stringify(list, null, 2), "utf-8");
}
