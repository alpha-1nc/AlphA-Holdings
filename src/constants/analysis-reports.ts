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
