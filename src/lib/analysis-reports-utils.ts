import type { AnalysisReportMeta } from "@/constants/analysis-reports";

export function getPeriodsFromReports(reports: AnalysisReportMeta[]): string[] {
    const set = new Set<string>();
    for (const r of reports) {
        set.add(`${r.year}-${String(r.month).padStart(2, "0")}`);
    }
    return [...set].sort((a, b) => b.localeCompare(a));
}

export function filterReportsByPeriod(
    reports: AnalysisReportMeta[],
    year: number,
    month: number
): AnalysisReportMeta[] {
    return reports.filter((r) => r.year === year && r.month === month);
}
