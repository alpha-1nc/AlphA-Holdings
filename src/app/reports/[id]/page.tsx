import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe, Wallet } from "lucide-react";
import {
    getQuarterlyReportFinancialSummary,
    getReportById,
    sumMonthlyNewInvestmentsInQuarterKrw,
} from "@/app/actions/reports";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportDonutChart } from "@/components/dashboard/portfolio-donut-chart";
import { PortfolioItemLogoAvatar } from "@/components/reports/portfolio-item-logo-avatar";
import { ReportDeleteButton } from "@/components/dashboard/report-delete-button";
import { AiCommentSection } from "@/components/reports/AiCommentSection";
import { QuarterlyReportTabs } from "@/components/reports/QuarterlyReportTabs";
import { getProfileFromLabel } from "@/lib/profile";
import { sortPortfolioItemsForDisplay } from "@/lib/portfolio-display-order";

const krw = (n: number) =>
    new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
        maximumFractionDigits: 0,
    }).format(n);

const ACCOUNT_LABELS: Record<string, string> = {
    US_DIRECT: "미국 직투",
    ISA: "ISA",
    JP_DIRECT: "일본 직투",
    CASH: "현금",
};

const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
    US_DIRECT: <Globe className="h-3.5 w-3.5" />,
    ISA: <Globe className="h-3.5 w-3.5" />,
    JP_DIRECT: <Globe className="h-3.5 w-3.5" />,
    CASH: <Wallet className="h-3.5 w-3.5" />,
};

function parseQuarterlyPeriodLabel(periodLabel: string): { year: number; quarter: number } | null {
    const m = /^(\d{4})-Q([1-4])$/.exec(periodLabel);
    if (!m) return null;
    return { year: Number(m[1]), quarter: Number(m[2]) };
}

export default async function ReportDetailPage(props: {
    params: Promise<{ id: string }>;
}) {
    const { id: idStr } = await props.params;
    
    // ID 검증: 빈 문자열이나 숫자로 변환 불가능한 경우
    if (!idStr || idStr.trim() === "") {
        notFound();
    }
    
    const id = Number(idStr);
    if (Number.isNaN(id) || id <= 0 || !Number.isInteger(id)) {
        notFound();
    }

    let report;
    try {
        report = await getReportById(id);
    } catch (error) {
        console.error("[리포트 조회 오류]", error);
        notFound();
    }
    
    if (!report) {
        notFound();
    }

        // 데이터 검증 및 안전장치
        const portfolioItems = Array.isArray(report.portfolioItems) ? report.portfolioItems : [];
        const sortedPortfolioItems = sortPortfolioItemsForDisplay(portfolioItems);
        const newInvestments = Array.isArray(report.newInvestments) ? report.newInvestments : [];

        const pq = report.type === "QUARTERLY" ? parseQuarterlyPeriodLabel(report.periodLabel) : null;
        const quarterNewInvFromMonthly =
            pq != null
                ? await sumMonthlyNewInvestmentsInQuarterKrw(report.profile, pq.year, pq.quarter)
                : 0;

        const quarterlyFinancial =
            report.type === "QUARTERLY" ? await getQuarterlyReportFinancialSummary(report.id) : null;

        const totalNewInvestment = newInvestments.reduce((sum, inv) => sum + inv.krwAmount, 0);

        const posStyle = (gain: number) => {
            const isPositive = gain >= 0;
            return {
                isPositive,
                color: isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
                barGain: isPositive ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-red-400 to-rose-500",
                barRate: isPositive ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-slate-400 to-gray-500",
            } as const;
        };

        let summaryCards: Array<{ label: string; value: string; color: string; bar: string }> = [];
        if (report.type === "QUARTERLY" && quarterlyFinancial) {
            const totalInvestedKrw = quarterlyFinancial.totalInvestedKrw;
            const totalCurrentKrw = quarterlyFinancial.currentTotalValueKrw;
            const baseCards = [
                { label: "총 투자금", value: krw(totalInvestedKrw), color: "text-neutral-900 dark:text-neutral-50" as const, bar: "bg-gradient-to-r from-blue-400 to-indigo-500" },
                { label: "총 평가금", value: krw(totalCurrentKrw), color: "text-neutral-900 dark:text-neutral-50" as const, bar: "bg-gradient-to-r from-violet-400 to-purple-500" },
            ];
            const qGain = quarterlyFinancial.quarterlyProfitKrw;
            const s = posStyle(qGain);
            summaryCards = [
                ...baseCards,
                {
                    label: "분기 수익금",
                    value: `${s.isPositive ? "+" : ""}${krw(qGain)}`,
                    color: s.color,
                    bar: s.barGain,
                },
                {
                    label: "분기 수익률",
                    value: `${s.isPositive ? "+" : ""}${quarterlyFinancial.quarterlyProfitRatePercent.toFixed(2)}%`,
                    color: s.color,
                    bar: s.barRate,
                },
            ];
        }

    const label =
        report.type === "MONTHLY"
            ? `${report.periodLabel} · Monthly`
            : `${report.periodLabel} · Quarterly`;

    const totalCurrentKrwForQuarterly =
        report.type === "QUARTERLY"
            ? (quarterlyFinancial?.currentTotalValueKrw ?? report.totalCurrentKrw ?? 0)
            : 0;

    const snapshotsForChart = sortedPortfolioItems.map((item) => ({
        ticker: item.ticker,
        name: getPortfolioItemDisplayLabel({
            ticker: item.ticker,
            displayName: item.displayName,
        }),
        value: item.krwAmount,
    }));

    const backHref = report.type === "MONTHLY" ? "/monthly" : "/quarterly";
    const profileId = getProfileFromLabel(report.profile) ?? "alpha-ceo";

    const journalEntries =
        report.type === "MONTHLY"
            ? [
                  { title: "증시 요약", content: report.summary },
                  { title: "느낀 점", content: report.journal },
              ]
            : [
                  { title: "증시 요약", content: report.summary },
                  { title: "느낀 점", content: report.journal },
                  { title: "다음 전략", content: report.strategy },
                  { title: "어닝/실적 리뷰", content: report.earningsReview },
              ];

    const journalMetaSection = (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border border-neutral-100 bg-white/80 shadow-none dark:border-neutral-800 dark:bg-neutral-900/70 lg:col-span-2">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                        JOURNAL
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {journalEntries.map(({ title, content }) => (
                        <div key={title}>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                                {title}
                            </h3>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                                {content || (
                                    <span className="text-neutral-400 dark:text-neutral-500 italic">작성된 내용이 없습니다.</span>
                                )}
                            </p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="border border-neutral-100 bg-white/80 shadow-none dark:border-neutral-800 dark:bg-neutral-900/70">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                        META
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
                    {report.type === "QUARTERLY" && (
                        <div className="flex justify-between">
                            <span className="text-neutral-400">종목 수</span>
                            <span className="font-medium">{portfolioItems.length}개</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-neutral-400">유형</span>
                        <span className="font-medium">{report.type === "MONTHLY" ? "월별" : "분기별"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-400">프로필</span>
                        <span className="font-medium">{report.profile}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-400">마지막 수정</span>
                        <span className="font-medium" suppressHydrationWarning>
                            {new Date(report.updatedAt).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                            })}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* 헤더 */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link
                            href={backHref}
                            className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 5l-7 7 7 7" />
                            </svg>
                            {report.type === "MONTHLY" ? "월별 리포트" : "분기별 리포트"}
                        </Link>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
                        INVESTMENT REPORT
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                        {label}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {report.profile}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="text-right text-xs text-neutral-500 dark:text-neutral-400">
                        <p>작성일</p>
                        <p className="mt-1 font-medium text-neutral-800 dark:text-neutral-200" suppressHydrationWarning>
                            {new Date(report.createdAt).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                            })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/reports/${id}/edit`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            수정
                        </Link>
                        <ReportDeleteButton reportId={id} reportType={report.type} />
                    </div>
                </div>
            </div>

            {report.type === "QUARTERLY" ? (
                <QuarterlyReportTabs
                    overview={
                        <>
                            {summaryCards.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    {summaryCards.map((item) => (
                                        <div
                                            key={item.label}
                                            className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                                        >
                                            <div className={`absolute inset-x-0 top-0 h-[3px] ${item.bar}`} />
                                            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                                {item.label}
                                            </p>
                                            <p className={`mt-1 text-lg font-bold tracking-tight ${item.color}`}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Card className="border border-neutral-100 bg-white/80 shadow-none dark:border-neutral-800 dark:bg-neutral-900/70">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                                        이 분기 신규 납입 (월별 합산)
                                    </CardTitle>
                                    <p className="text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
                                        같은 분기 월별 리포트에 기록된 신규 납입액의 합계입니다.
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <p className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                                            {krw(quarterNewInvFromMonthly)}
                                        </p>
                                        {totalNewInvestment > 0 && (
                                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                                참고: 이전에 분기 리포트에 별도 저장된 신규 항목 {krw(totalNewInvestment)}은(는) 수익 계산에는 사용하지 않습니다.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="border border-neutral-100 bg-white/80 shadow-none dark:border-neutral-800 dark:bg-neutral-900/70 lg:col-span-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                                PORTFOLIO SNAPSHOT
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-800">
                                <div className="grid grid-cols-[2fr_1.4fr_1.6fr_1fr] border-b border-neutral-100 bg-neutral-50 px-3 py-2 text-[11px] font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400">
                                    <div>종목</div>
                                    <div>계좌</div>
                                    <div className="text-right">원화 평가금</div>
                                    <div className="text-right">통화</div>
                                </div>
                                <div className="divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
                                    {sortedPortfolioItems.length > 0 ? (
                                        sortedPortfolioItems.map((item) => {
                                            const pct = totalCurrentKrwForQuarterly > 0
                                                ? ((item.krwAmount / totalCurrentKrwForQuarterly) * 100).toFixed(1)
                                                : "0";
                                            const displayLabel = getPortfolioItemDisplayLabel({
                                                ticker: item.ticker,
                                                displayName: item.displayName,
                                            });
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="grid grid-cols-[2fr_1.4fr_1.6fr_1fr] items-center gap-2 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <PortfolioItemLogoAvatar
                                                            portfolioItemId={item.id}
                                                            reportId={id}
                                                            ticker={item.ticker}
                                                            displayName={item.displayName}
                                                            logoUrl={item.logoUrl}
                                                        />
                                                        <div>
                                                            <p className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                                                                {displayLabel}
                                                                {displayLabel.trim().toUpperCase() !== item.ticker.trim().toUpperCase() && (
                                                                    <span className="ml-1 font-mono text-[10px] font-normal uppercase text-neutral-500 dark:text-neutral-400">
                                                                        ({item.ticker})
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{pct}%</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                                                        {ACCOUNT_ICONS[item.accountType]}
                                                        {ACCOUNT_LABELS[item.accountType] ?? item.accountType}
                                                    </div>
                                                    <div className="text-right text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                                                        {krw(item.krwAmount)}
                                                    </div>
                                                    <div className="text-right text-[11px] text-neutral-500 dark:text-neutral-400">
                                                        {item.originalCurrency}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="px-3 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                                            저장된 종목이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 환율 정보 */}
                            <div className="mt-4 flex gap-3">
                                <div className="flex-1 rounded-xl bg-neutral-50 px-4 py-3 text-xs dark:bg-neutral-800/50">
                                    <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">USD/KRW</p>
                                    <p className="mt-1 font-semibold text-neutral-700 dark:text-neutral-200" suppressHydrationWarning>₩{(report.usdRate ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="flex-1 rounded-xl bg-neutral-50 px-4 py-3 text-xs dark:bg-neutral-800/50">
                                    <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">100 JPY/KRW</p>
                                    <p className="mt-1 font-semibold text-neutral-700 dark:text-neutral-200" suppressHydrationWarning>₩{(report.jpyRate ?? 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 도넛 차트 */}
                    <Card className="border border-neutral-100 bg-white/80 shadow-none dark:border-neutral-800 dark:bg-neutral-900/70">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                                WEIGHT BY POSITION
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ReportDonutChart snapshots={snapshotsForChart} />
                        </CardContent>
                    </Card>
                </div>
                        </>
                    }
                    journal={journalMetaSection}
                />
            ) : (
                <>
                    <Card className="border border-neutral-100 bg-white/80 shadow-none dark:border-neutral-800 dark:bg-neutral-900/70">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                                신규 투자금
                            </CardTitle>
                            <p className="text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
                                해당 월에 계좌별로 기록한 입금·출금(원화)입니다.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {newInvestments.length === 0 ? (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">이번 달 기록된 신규 투자금이 없습니다.</p>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-800">
                                    <div className="grid grid-cols-[1fr_1fr] border-b border-neutral-100 bg-neutral-50 px-3 py-2 text-[11px] font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400 sm:grid-cols-[1fr_1fr_1fr]">
                                        <div>계좌</div>
                                        <div className="hidden sm:block text-right">통화</div>
                                        <div className="text-right">원화 환산</div>
                                    </div>
                                    <div className="divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
                                        {newInvestments.map((inv) => (
                                            <div
                                                key={inv.id}
                                                className="grid grid-cols-[1fr_1fr] items-center gap-2 px-3 py-2.5 sm:grid-cols-[1fr_1fr_1fr]"
                                            >
                                                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                                                    {ACCOUNT_ICONS[inv.accountType]}
                                                    {ACCOUNT_LABELS[inv.accountType] ?? inv.accountType}
                                                </div>
                                                <div className="hidden text-right text-neutral-500 dark:text-neutral-400 sm:block">
                                                    {inv.originalCurrency}
                                                </div>
                                                <div className="text-right font-medium text-neutral-800 dark:text-neutral-200">
                                                    {krw(inv.krwAmount)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end border-t border-neutral-100 bg-neutral-50/80 px-3 py-2.5 text-xs font-semibold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-100">
                                        합계 <span className="ml-2">{krw(totalNewInvestment)}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    {journalMetaSection}
                </>
            )}

            {/* AlphA AI 포트폴리오 분석 */}
            <AiCommentSection
                reportId={report.id}
                profileId={profileId}
                initialComment={report.reportAiComment ?? null}
            />
        </div>
    );
}
