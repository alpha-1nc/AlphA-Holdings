import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import type { AnalysisOutput } from "@/app/actions/generate-analysis";
import { prisma } from "@/lib/prisma";
import { MODEL_NAMES } from "@/lib/analysis/scoring-framework";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { ReportChartsSection } from "./ReportCharts";
import { ScoreCard } from "./ScoreCard";

export const dynamic = "force-dynamic";

/** 오버레이 이후 본문 섹션 제목 (왼쪽 액센트) */
const REPORT_SECTION_TITLE =
    "mb-4 border-l-2 border-neutral-400 pl-3 text-base font-semibold text-foreground dark:border-[#4B5563]";

/** 섹션 내부 (제목·본문) */
const REPORT_SECTION_INNER = "space-y-3";

function riskAccentBarClass(severity: "낮음" | "중간" | "높음"): string {
    switch (severity) {
        case "높음":
            return "bg-destructive";
        case "중간":
            return "bg-[var(--neutral-state)]";
        case "낮음":
            return "bg-[var(--positive)]";
        default:
            return "bg-muted-foreground";
    }
}

/** 본문 카드: 라이트는 카드/뮤트 톤, 다크는 기존 진한 패널 */
const REPORT_BODY_CARD =
    "rounded-lg border border-border bg-muted/40 px-5 py-4 dark:border-[#1f1f1f] dark:bg-[#111111]";

const getAnalysisReportBySlug = cache(async (slug: string) => {
    return prisma.analysisReport.findUnique({
        where: { slug },
    });
});

const RATING_GAUGE_COLOR: Record<AnalysisOutput["rating"], string> = {
    "Strong Buy": "var(--positive)",
    Buy: "color-mix(in oklab, var(--positive) 65%, white)",
    Hold: "var(--neutral-state)",
    Sell: "var(--negative)",
    "Strong Sell": "color-mix(in oklab, var(--negative) 85%, #991b1b)",
};

function ratingBadgeClass(rating: AnalysisOutput["rating"]): string {
    switch (rating) {
        case "Strong Buy":
            return "bg-[var(--positive)] text-white";
        case "Buy":
            return "bg-[var(--positive-soft)] text-[var(--positive)] border border-[var(--positive)]/25";
        case "Hold":
            return "bg-muted text-muted-foreground border border-border";
        case "Sell":
            return "bg-[var(--negative-soft)] text-[var(--negative)] border border-[var(--negative)]/25";
        case "Strong Sell":
            return "bg-destructive text-destructive-foreground";
        default:
            return "bg-muted text-muted-foreground";
    }
}

function severityBadgeClass(severity: "낮음" | "중간" | "높음"): string {
    switch (severity) {
        case "높음":
            return "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/20 dark:text-destructive";
        case "중간":
            return "border-border bg-muted text-muted-foreground";
        case "낮음":
            return "border-[var(--positive)]/30 bg-[var(--positive-soft)] text-[var(--positive)]";
        default:
            return "border-border bg-muted text-muted-foreground";
    }
}

function TotalScoreGauge({
    score,
    strokeColor,
}: {
    score: number;
    strokeColor: string;
}) {
    const r = 46;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, score));
    const offset = c * (1 - pct / 100);
    const display = Math.round(pct);

    return (
        <div className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center">
            <svg
                className="-rotate-90"
                viewBox="0 0 112 112"
                width={112}
                height={112}
                aria-hidden
            >
                <circle
                    cx="56"
                    cy="56"
                    r={r}
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="10"
                />
                <circle
                    cx="56"
                    cy="56"
                    r={r}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    className="transition-[stroke-dashoffset] duration-500"
                />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                    {display}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">/ 100</span>
            </div>
        </div>
    );
}

function PriceTargetRangeBar({
    bear,
    base,
    bull,
}: {
    bear: number;
    base: number;
    bull: number;
}) {
    const min = Math.min(bear, base, bull);
    const max = Math.max(bear, base, bull);
    const span = max - min || 1;

    const pos = (v: number) => ((v - min) / span) * 100;

    const fmt = (n: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2,
        }).format(n);

    const scenarios = [
        {
            key: "Bear",
            value: bear,
            labelClass: "text-red-600 dark:text-red-400",
            dotColor: "#ef4444",
        },
        {
            key: "Base",
            value: base,
            labelClass: "text-foreground",
            dotColor: "var(--foreground)",
        },
        {
            key: "Bull",
            value: bull,
            labelClass: "text-emerald-600 dark:text-emerald-400",
            dotColor: "#22c55e",
        },
    ] as const;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                {scenarios.map(({ key, value, labelClass }) => (
                    <div
                        key={key}
                        className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-center shadow-sm dark:bg-muted/20"
                    >
                        <p
                            className={cn(
                                "text-xs font-bold uppercase tracking-widest sm:text-sm",
                                labelClass
                            )}
                        >
                            {key}
                        </p>
                        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
                            {fmt(value)}
                        </p>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <p className="text-center text-sm font-medium text-muted-foreground">
                    시나리오별 상대 위치 (낮음 ← → 높음)
                </p>
                <div className="relative h-7 w-full px-0.5">
                    <div
                        className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 rounded-full bg-gradient-to-r from-red-500/30 via-muted to-emerald-500/30 ring-1 ring-border/60 dark:from-red-500/20 dark:via-muted dark:to-emerald-500/25"
                        aria-hidden
                    />
                    {scenarios.map(({ key, value, dotColor }) => (
                        <div
                            key={key}
                            className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                            style={{ left: `${pos(value)}%` }}
                        >
                            <span
                                className="h-4 w-4 rounded-full border-[3px] border-background shadow-md ring-2 ring-black/10 dark:ring-white/10 sm:h-5 sm:w-5"
                                style={{ backgroundColor: dotColor }}
                                title={`${key}: ${fmt(value)}`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export async function generateMetadata(props: {
    params: Promise<{ year: string; month: string; slug: string }>;
}): Promise<Metadata> {
    const { slug } = await props.params;
    const report = await getAnalysisReportBySlug(slug);
    if (!report) {
        notFound();
    }
    return {
        title: `${report.companyName} (${report.ticker}) 분석 리포트 | AlphA Holdings`,
    };
}

export default async function AnalysisReportViewerPage(props: {
    params: Promise<{ year: string; month: string; slug: string }>;
}) {
    const { slug } = await props.params;
    const report = await getAnalysisReportBySlug(slug);

    if (!report) {
        notFound();
    }

    const data = report.reportData as AnalysisOutput;

    const reportDateStr = new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(new Date(report.reportDate));

    const up = data.analystConsensus.updownside;
    const gaugeColor = RATING_GAUGE_COLOR[data.rating] ?? "#a3a3a3";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto max-w-5xl space-y-8 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
                {/* 1. 헤더 */}
                <header className="space-y-5">
                    <Link
                        href="/analysis"
                        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                    >
                        <span aria-hidden>←</span>
                        목록으로
                    </Link>

                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-4">
                            <div className="space-y-2">
                                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                                    <span className="text-foreground">
                                        {report.companyName}
                                    </span>
                                    <span className="ml-2 text-xl font-medium text-muted-foreground sm:text-2xl md:text-3xl">
                                        ({report.ticker})
                                    </span>
                                </h1>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={cn(
                                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                                            ratingBadgeClass(data.rating)
                                        )}
                                    >
                                        {data.rating}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                                    >
                                        Model {data.selectedModel}:{" "}
                                        {
                                            MODEL_NAMES[data.selectedModel].split(
                                                " ("
                                            )[0]
                                        }
                                    </Badge>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {reportDateStr}
                            </p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                                {report.appliedModel}
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-row items-center gap-4 self-start lg:flex-col lg:items-end">
                            <TotalScoreGauge
                                score={data.totalScore}
                                strokeColor={gaugeColor}
                            />
                        </div>
                    </div>
                </header>

                <Separator className="bg-border" />

                {/* 2. 모델 선택 카드 */}
                <section>
                    <Card
                        size="sm"
                        className="border-border bg-card text-card-foreground ring-0"
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-foreground">
                                모델 선택
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Model {data.selectedModel} —{" "}
                                {MODEL_NAMES[data.selectedModel].split(" (")[0]}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {data.modelSelectionRationale}
                            </p>
                        </CardContent>
                    </Card>
                </section>

                {/* 3. 점수 요약 + Kill Switch */}
                <section className="space-y-3">
                    <h2 className="text-base font-semibold text-foreground">
                        점수 요약
                    </h2>
                    <Card
                        size="sm"
                        className="border-border bg-card ring-0"
                    >
                        <CardContent className="space-y-5 pt-4">
                            <div className="space-y-2">
                                <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                                    <span>Dimension 합계 (오버레이 전)</span>
                                    <span className="tabular-nums text-foreground">
                                        {data.dimensionTotal.toFixed(1)} / 100
                                    </span>
                                </div>
                                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full bg-primary/90"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                Math.max(0, data.dimensionTotal)
                                            )}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        오버레이 조정 합계
                                    </p>
                                    <p
                                        className={cn(
                                            "text-lg font-semibold tabular-nums",
                                            data.overlayTotal > 0
                                                ? "text-[var(--positive)]"
                                                : data.overlayTotal < 0
                                                  ? "text-[var(--negative)]"
                                                  : "text-muted-foreground"
                                        )}
                                    >
                                        {data.overlayTotal > 0 ? "+" : ""}
                                        {data.overlayTotal.toFixed(1)}
                                    </p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-xs text-muted-foreground">
                                        최종 종합 점수
                                    </p>
                                    <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                                        {Math.round(data.totalScore)}
                                        <span className="text-lg font-semibold text-muted-foreground">
                                            {" "}
                                            / 100
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {data.killSwitchTriggered ? (
                        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 dark:bg-destructive/20">
                            <p className="text-sm font-semibold text-destructive">
                                Kill Switch 발동
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-destructive/90">
                                {data.killSwitchReason ??
                                    "사유가 기록되지 않았습니다."}
                            </p>
                        </div>
                    ) : null}
                </section>

                {/* 4. 레이더 · 라인 */}
                <ReportChartsSection dimensionScores={data.dimensionScores} />

                {/* 5. 세부 점수 카드 */}
                <section className="space-y-4">
                    <h2 className="text-base font-semibold text-foreground">
                        세부 점수
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                        {data.dimensionScores.map((item) => (
                            <ScoreCard
                                key={item.dimensionId}
                                dimensionName={item.dimensionName}
                                score={item.score}
                                maxScore={item.maxScore}
                                rationale={item.rationale}
                            />
                        ))}
                    </div>
                </section>

                <div className="flex flex-col gap-11">
                {/* 6. 오버레이 */}
                {data.overlayAdjustments.length > 0 ? (
                    <section className={REPORT_SECTION_INNER}>
                        <h2 className={REPORT_SECTION_TITLE}>오버레이 조정</h2>
                        <ul className="space-y-4">
                            {data.overlayAdjustments.map((row, i) => {
                                const positive = row.adjustment > 0;
                                const negative = row.adjustment < 0;
                                return (
                                    <li key={`${row.item}-${i}`}>
                                        <div
                                            className={cn(
                                                "flex overflow-hidden rounded-xl border",
                                                positive &&
                                                    "border-emerald-200 bg-emerald-50/90 dark:border-[#1a3d2b] dark:bg-[#0d2016]",
                                                negative &&
                                                    "border-red-200 bg-red-50/90 dark:border-[#3d1515] dark:bg-[#1f0a0a]",
                                                !positive &&
                                                    !negative &&
                                                    "border-border bg-card"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "w-[2px] shrink-0",
                                                    positive &&
                                                        "bg-emerald-500 dark:bg-[#4ade80]",
                                                    negative &&
                                                        "bg-red-500 dark:bg-[#f87171]",
                                                    !positive &&
                                                        !negative &&
                                                        "bg-muted-foreground/40"
                                                )}
                                                aria-hidden
                                            />
                                            <div className="min-w-0 flex-1 px-4 py-3">
                                                <div className="flex flex-row flex-wrap items-start justify-between gap-2">
                                                    <p className="text-sm font-medium text-foreground">
                                                        {row.item}
                                                    </p>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "shrink-0 border font-semibold tabular-nums",
                                                            positive &&
                                                                "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-[#4ade80]/50 dark:bg-[#0d2016] dark:text-[#4ade80]",
                                                            negative &&
                                                                "border-red-300 bg-red-50 text-red-800 dark:border-[#f87171]/50 dark:bg-[#1f0a0a] dark:text-[#f87171]",
                                                            !positive &&
                                                                !negative &&
                                                                "border-border text-muted-foreground"
                                                        )}
                                                    >
                                                        {positive ? "+" : ""}
                                                        {row.adjustment}
                                                    </Badge>
                                                </div>
                                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                                    {row.rationale}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ) : null}

                {/* 7. 종합 투자 의견 */}
                <section className={REPORT_SECTION_INNER}>
                    <h2 className={REPORT_SECTION_TITLE}>종합 투자 의견</h2>
                    <div
                        className={cn(
                            REPORT_BODY_CARD,
                            "text-foreground leading-[1.9] dark:text-[#d1d5db]"
                        )}
                    >
                        <p className="whitespace-pre-wrap">
                            {data.investmentThesis}
                        </p>
                    </div>
                </section>

                {/* 8. 목표 주가 레인지 */}
                <section className={REPORT_SECTION_INNER}>
                    <h2 className={REPORT_SECTION_TITLE}>
                        목표 주가 (12개월)
                    </h2>
                    <div className={cn(REPORT_BODY_CARD, "space-y-4")}>
                        <PriceTargetRangeBar
                            bear={data.priceTarget.bear}
                            base={data.priceTarget.base}
                            bull={data.priceTarget.bull}
                        />
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {data.priceTarget.rationale}
                        </p>
                    </div>
                </section>

                {/* 9. 상승 촉매 */}
                <section className={REPORT_SECTION_INNER}>
                    <h2 className={REPORT_SECTION_TITLE}>상승 촉매</h2>
                    <ul className="space-y-4">
                        {data.catalysts.map((c, i) => (
                            <li key={i}>
                                <div className="flex overflow-hidden rounded-xl border border-border bg-card dark:border-[#1f1f1f] dark:bg-[#111111]">
                                    <div
                                        className="w-[2px] shrink-0 bg-primary"
                                        aria-hidden
                                    />
                                    <div className="min-w-0 flex-1 px-4 py-3">
                                        <div className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                                            <p className="text-sm font-medium text-foreground">
                                                {c.title}
                                            </p>
                                            <Badge
                                                variant="outline"
                                                className="shrink-0 border-border bg-muted text-[10px] text-muted-foreground dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:text-[#9ca3af]"
                                            >
                                                {c.timeframe}
                                            </Badge>
                                        </div>
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {c.description}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* 10. 리스크 */}
                <section className={REPORT_SECTION_INNER}>
                    <h2 className={REPORT_SECTION_TITLE}>리스크</h2>
                    <ul className="space-y-4">
                        {data.risks.map((r, i) => (
                            <li key={i}>
                                <div className="flex overflow-hidden rounded-xl border border-border bg-card dark:border-[#1f1f1f] dark:bg-[#111111]">
                                    <div
                                        className={cn(
                                            "w-[2px] shrink-0",
                                            riskAccentBarClass(r.severity)
                                        )}
                                        aria-hidden
                                    />
                                    <div className="min-w-0 flex-1 px-4 py-3">
                                        <div className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                                            <p className="text-sm font-medium text-foreground">
                                                {r.title}
                                            </p>
                                            <span
                                                className={cn(
                                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                                    severityBadgeClass(
                                                        r.severity
                                                    )
                                                )}
                                            >
                                                {r.severity}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {r.description}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* 11. 기업 개요 */}
                <section className={REPORT_SECTION_INNER}>
                    <h2 className={REPORT_SECTION_TITLE}>기업 개요</h2>
                    <div className={cn(REPORT_BODY_CARD, "space-y-4")}>
                        <p className="text-sm leading-relaxed text-foreground dark:text-[#d1d5db]">
                            {data.companyOverview.summary}
                        </p>
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                핵심 제품·서비스
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {data.companyOverview.keyProducts.map(
                                    (p, i) => (
                                        <Badge
                                            key={i}
                                            variant="secondary"
                                            className="border-border bg-muted font-normal text-foreground dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-[#d1d5db]"
                                        >
                                            {p}
                                        </Badge>
                                    )
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                경쟁 우위
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {data.companyOverview.competitiveAdvantage}
                            </p>
                        </div>
                    </div>
                </section>

                {/* 12. 애널리스트 컨센서스 */}
                <section className={REPORT_SECTION_INNER}>
                    <h2 className={REPORT_SECTION_TITLE}>
                        애널리스트 컨센서스
                    </h2>
                    <div className={cn(REPORT_BODY_CARD, "space-y-3")}>
                        <p className="text-sm leading-relaxed text-foreground dark:text-[#d1d5db]">
                            {data.analystConsensus.summary}
                        </p>
                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-xs text-muted-foreground">
                                목표가 대비 (Base)
                            </span>
                            <span
                                className={cn(
                                    "text-lg font-semibold tabular-nums",
                                    up >= 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-red-600 dark:text-red-400"
                                )}
                            >
                                {up >= 0 ? "▲" : "▼"}{" "}
                                {Math.round(Math.abs(up))}%
                            </span>
                        </div>
                    </div>
                </section>
                </div>
            </div>
        </div>
    );
}
