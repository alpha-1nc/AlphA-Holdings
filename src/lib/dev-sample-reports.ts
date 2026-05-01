/**
 * 로컬 `npm run dev` 전용 미리보기 데이터입니다.
 * 프로덕션 빌드에서는 병합·호출 분기가 제거되며 DB·서버 로직에는 관여하지 않습니다.
 */

import { deriveQuarterlyIntervalPerformance } from "@/lib/report-performance";
import type { NewInvestment, PortfolioItem, Report } from "@/generated/prisma";
import {
    AccountType,
    AssetRole,
    Currency,
    ReportStatus,
    ReportType,
} from "@/generated/prisma";

/** 개발 목록 카드 등에서 예시 행 여부 판별 (음수 리포트 id) */
export function isDevSampleReport(report: { id: number }): boolean {
    return report.id < 0;
}

type ReportWithItems = Report & {
    portfolioItems: PortfolioItem[];
    newInvestments?: NewInvestment[];
};

const USD_KRW = 1385;
const JPY_PER_100 = 9.2;

const TICKERS_Q1 = [
    { ticker: "NVDA", sector: "Technology", role: AssetRole.GROWTH, kr: 68_250_000, usd: 49_279 },
    { ticker: "MSFT", sector: "Technology", role: AssetRole.CORE, kr: 52_830_000, usd: 38_146 },
    { ticker: "AAPL", sector: "Technology", role: AssetRole.CORE, kr: 49_065_000, usd: 35_427 },
    { ticker: "GOOGL", sector: "Communication Services", role: AssetRole.GROWTH, kr: 34_486_500, usd: 24_900 },
    { ticker: "AMZN", sector: "Consumer Cyclical", role: AssetRole.GROWTH, kr: 30_943_750, usd: 22_344 },
    { ticker: "META", sector: "Communication Services", role: AssetRole.GROWTH, kr: 27_839_850, usd: 20_103 },
    { ticker: "TSM", sector: "Technology", role: AssetRole.GROWTH, kr: 25_069_825, usd: 18_103 },
    { ticker: "BRK.B", sector: "Financial Services", role: AssetRole.DEFENSIVE, kr: 22_097_775, usd: 15_957 },
    { ticker: "VOO", sector: "", role: AssetRole.INDEX, kr: 19_058_975, usd: 13_764 },
    { ticker: "SCHD", sector: "", role: AssetRole.INDEX, kr: 11_058_975, usd: 7_986 },
];

/** 전분기 대비 약간 변동된 평가·한 종목 교체(LLY 도입 등) */
const TICKERS_Q2 = [
    { ticker: "NVDA", sector: "Technology", role: AssetRole.GROWTH, kr: 71_920_000, usd: 51_964 },
    { ticker: "MSFT", sector: "Technology", role: AssetRole.CORE, kr: 54_670_800, usd: 39_478 },
    { ticker: "AAPL", sector: "Technology", role: AssetRole.CORE, kr: 51_035_075, usd: 36_849 },
    { ticker: "GOOGL", sector: "Communication Services", role: AssetRole.GROWTH, kr: 35_206_600, usd: 25_427 },
    { ticker: "AMZN", sector: "Consumer Cyclical", role: AssetRole.GROWTH, kr: 29_058_975, usd: 20_986 },
    { ticker: "META", sector: "Communication Services", role: AssetRole.GROWTH, kr: 28_485_975, usd: 20_582 },
    { ticker: "LLY", sector: "Healthcare", role: AssetRole.CORE, kr: 24_410_000, usd: 17_630 },
    { ticker: "TSM", sector: "Technology", role: AssetRole.GROWTH, kr: 25_623_250, usd: 18_509 },
    { ticker: "BRK.B", sector: "Financial Services", role: AssetRole.DEFENSIVE, kr: 22_691_250, usd: 16_386 },
    { ticker: "VOO", sector: "", role: AssetRole.INDEX, kr: 19_647_750, usd: 14_186 },
];

function sumKrw(rows: { kr: number }[]): number {
    return rows.reduce((s, r) => s + r.kr, 0);
}

function makePortfolioItems(
    reportId: number,
    rows: Array<{
        ticker: string;
        sector: string;
        role: AssetRole;
        kr: number;
        usd: number;
    }>,
    startItemId: number,
): PortfolioItem[] {
    return rows.map((row, i) => ({
        id: startItemId + i,
        reportId,
        ticker: row.ticker,
        displayName: null,
        logoUrl: null,
        sector: row.sector || null,
        role: row.role,
        accountType: AccountType.US_DIRECT,
        originalCurrency: Currency.USD,
        originalAmount: row.usd,
        krwAmount: row.kr,
        createdAt: new Date("2026-01-15T09:00:00.000Z"),
    }));
}

function quarterlyPair(profile: string): ReportWithItems[] {
    const q1Total = sumKrw(TICKERS_Q1);
    const q2Total = sumKrw(TICKERS_Q2);
    const q1Invested = Math.round(q1Total * 0.94);
    const q2Invested = Math.round(q2Total * 0.93);

    const q1New: NewInvestment[] = [];
    const q2New: NewInvestment[] = [
        {
            id: -92001,
            reportId: -9102,
            accountType: AccountType.US_DIRECT,
            originalCurrency: Currency.USD,
            originalAmount: 5_800,
            krwAmount: 8_033_000,
            createdAt: new Date("2026-05-12T10:00:00.000Z"),
        },
        {
            id: -92002,
            reportId: -9102,
            accountType: AccountType.ISA,
            originalCurrency: Currency.KRW,
            originalAmount: 2_500_000,
            krwAmount: 2_500_000,
            createdAt: new Date("2026-05-12T10:00:00.000Z"),
        },
    ];

    const r1: ReportWithItems = {
        id: -9101,
        type: ReportType.QUARTERLY,
        periodLabel: "2026-Q1",
        usdRate: USD_KRW,
        jpyRate: JPY_PER_100,
        totalInvestedKrw: q1Invested,
        totalCurrentKrw: q1Total,
        profile,
        status: ReportStatus.PUBLISHED,
        summary: "대형 성장주·반도체 쪽 비중 유지하며 현금 성격 자산 소폭 정리했습니다.",
        journal: "",
        strategy: "",
        earningsReview:
            "핵심 보유종목 실적 발표는 대체로 추정치 부합. 다음 분기는 금리·환율 변동폭 모니터링.",
        portfolioItems: makePortfolioItems(-9101, TICKERS_Q1, -93100),
        newInvestments: q1New,
        createdAt: new Date("2026-03-31T06:30:00.000Z"),
        updatedAt: new Date("2026-03-31T06:30:00.000Z"),
    };

    const r2: ReportWithItems = {
        id: -9102,
        type: ReportType.QUARTERLY,
        periodLabel: "2026-Q2",
        usdRate: USD_KRW,
        jpyRate: JPY_PER_100,
        totalInvestedKrw: q2Invested,
        totalCurrentKrw: q2Total,
        profile,
        status: ReportStatus.PUBLISHED,
        summary:
            "전분기 대비 헬스케어 우량주 비중 확대(LLY 신규), 반도체·클라우드는 업종 간 비중 조정만 진행했습니다.",
        journal: "",
        strategy: "",
        earningsReview:
            "전분기 말부터 환헤지 필요성 검토했으며 분기 신규 납입은 ISA·직투 병행.",
        portfolioItems: makePortfolioItems(-9102, TICKERS_Q2, -93200),
        newInvestments: q2New,
        createdAt: new Date("2026-06-29T06:30:00.000Z"),
        updatedAt: new Date("2026-06-29T06:30:00.000Z"),
    };

    return [r1, r2];
}

const MONTH_META: Array<{ label: string; newKrw: number; summary: string }> = [
    { label: "2026-01", newKrw: 3_250_000, summary: "연초 재조정 매수 위주로 집행했습니다." },
    { label: "2026-02", newKrw: 1_800_000, summary: "배당 수령 재투입만 진행했습니다." },
    { label: "2026-03", newKrw: 4_920_000, summary: "분기 마감 전 성장주 비중 정리했습니다." },
    { label: "2026-04", newKrw: 2_100_000, summary: "소액 증자에 맞춰 ISA 납입이 있었습니다." },
    { label: "2026-05", newKrw: 10_533_000, summary: "LLY 진입 분할 매수 포함해 신규 납입이 많았던 달입니다." },
    { label: "2026-06", newKrw: 0, summary: "추가 납입 없이 보유 종목 위주 관망했습니다." },
];

function monthlySeries(profile: string): ReportWithItems[] {
    return MONTH_META.map((m, i) => ({
        id: -94001 - i,
        type: ReportType.MONTHLY,
        periodLabel: m.label,
        usdRate: USD_KRW,
        jpyRate: JPY_PER_100,
        totalInvestedKrw: null,
        totalCurrentKrw: null,
        profile,
        status: ReportStatus.PUBLISHED,
        summary: m.summary,
        journal: "",
        strategy: "",
        earningsReview: null,
        portfolioItems: [],
        newInvestments:
            m.newKrw > 0
                ? [
                      {
                          id: -94100 - i,
                          reportId: -94001 - i,
                          accountType: AccountType.US_DIRECT,
                          originalCurrency: Currency.KRW,
                          originalAmount: m.newKrw,
                          krwAmount: m.newKrw,
                          createdAt: new Date(`${m.label}-15T08:00:00.000Z`),
                      },
                  ]
                : [],
        createdAt: new Date(`${m.label}-27T06:30:00.000Z`),
        updatedAt: new Date(`${m.label}-27T06:30:00.000Z`),
    }));
}

/**
 * DB에서 가져온 목록이 비어 있을 때만, 개발 환경에서 예시 리포트로 채웁니다.
 */
export function withDevSampleReportsIfEmpty(
    real: ReportWithItems[],
    kind: "QUARTERLY" | "MONTHLY",
    profileLabel: string,
): ReportWithItems[] {
    if (process.env.NODE_ENV !== "development" || real.length > 0) {
        return real;
    }
    return kind === "QUARTERLY"
        ? quarterlyPair(profileLabel)
        : monthlySeries(profileLabel);
}

function sumNewKrw(rows: NewInvestment[] | undefined): number {
    if (!rows?.length) return 0;
    return rows.reduce((s, i) => s + i.krwAmount, 0);
}

/** DB 분기 목록이 비었을 때 목록 카드용 구간 지표(Investment 대신 예시 NewInvestment로 동일 공식) */
export function withDevSampleQuarterlyArchiveIfEmpty(
    real: Array<{
        report: ReportWithItems;
        intervalGainKrw: number;
        intervalReturnRatePercent: number;
    }>,
    profileLabel: string,
): Array<{
    report: ReportWithItems;
    intervalGainKrw: number;
    intervalReturnRatePercent: number;
}> {
    if (process.env.NODE_ENV !== "development" || real.length > 0) {
        return real;
    }
    const reports = quarterlyPair(profileLabel);
    const slices = reports.map((r) => ({
        totalCurrentKrw:
            r.portfolioItems.reduce((s, i) => s + i.krwAmount, 0) || r.totalCurrentKrw || 0,
        periodNewInflowKrw: sumNewKrw(r.newInvestments),
    }));
    const intervalRows = slices.map((_, index) =>
        deriveQuarterlyIntervalPerformance(slices, index),
    );
    return reports.map((report, index) => ({
        report,
        intervalGainKrw: intervalRows[index].intervalGainKrw,
        intervalReturnRatePercent: intervalRows[index].intervalReturnRatePercent,
    }));
}
