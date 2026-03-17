// ── 기업 투자 분석 보고서 메타데이터 ───────────────────────────────────────
// 운용프로필과 무관하게 모든 사용자가 동일하게 조회 가능

export type AnalysisReportMeta = {
    year: number;
    month: number;
    companyCode: string;
    companyName: string;
    title: string;
    fileName: string;
    verdict?: "BUY" | "HOLD" | "SELL";
};

/** 연도/월별 기업 분석 보고서 목록 (당시 데이터 기준) */
export const ANALYSIS_REPORTS: AnalysisReportMeta[] = [
    {
        year: 2026,
        month: 3,
        companyCode: "UNH",
        companyName: "UnitedHealth Group",
        title: "UnitedHealth Group (UNH) 장기 투자 분석 보고서",
        fileName: "UNH_Report_2603.html",
        verdict: "BUY",
    },
    {
        year: 2026,
        month: 3,
        companyCode: "NET",
        companyName: "Cloudflare",
        title: "Cloudflare (NET) 장기 투자 분석 보고서",
        fileName: "NET_Report_2603.html",
        verdict: "BUY",
    },
];

/** 연·월 period 목록 (최신순) */
export function getAnalysisReportPeriods(): string[] {
    const set = new Set<string>();
    for (const r of ANALYSIS_REPORTS) {
        set.add(`${r.year}-${String(r.month).padStart(2, "0")}`);
    }
    return [...set].sort((a, b) => b.localeCompare(a));
}

/** 특정 연·월의 보고서 목록 */
export function getReportsByPeriod(year: number, month: number): AnalysisReportMeta[] {
    return ANALYSIS_REPORTS.filter((r) => r.year === year && r.month === month);
}

/** slug(companyCode)로 보고서 조회 (year, month 일치 시) */
export function getReportBySlug(yearStr: string, monthStr: string, slug: string): AnalysisReportMeta | undefined {
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (Number.isNaN(year) || Number.isNaN(month)) return undefined;
    return ANALYSIS_REPORTS.find(
        (r) => r.year === year && r.month === month && r.companyCode.toUpperCase() === slug.toUpperCase()
    );
}
