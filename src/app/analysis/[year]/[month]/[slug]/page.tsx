import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import type { AnalysisOutput } from "@/app/actions/generate-analysis";
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

export const dynamic = "force-dynamic";

const getAnalysisReportBySlug = cache(async (slug: string) => {
    return prisma.analysisReport.findUnique({
        where: { slug },
    });
});

function ratingBadgeClass(rating: AnalysisOutput["rating"]): string {
    switch (rating) {
        case "Strong Buy":
            return "bg-emerald-600 text-white dark:bg-emerald-500";
        case "Buy":
            return "bg-emerald-200 text-emerald-950 dark:bg-emerald-900/50 dark:text-emerald-100";
        case "Hold":
            return "bg-amber-200 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100";
        case "Sell":
            return "bg-orange-300 text-orange-950 dark:bg-orange-900/50 dark:text-orange-100";
        case "Strong Sell":
            return "bg-red-600 text-white dark:bg-red-500";
        default:
            return "bg-muted text-muted-foreground";
    }
}

function severityBadgeClass(severity: "낮음" | "중간" | "높음"): string {
    switch (severity) {
        case "높음":
            return "border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100";
        case "중간":
            return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100";
        case "낮음":
            return "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100";
        default:
            return "";
    }
}

function dimensionRatioToneClass(ratio: number): string {
    if (ratio >= 0.8) {
        return "border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/30";
    }
    if (ratio >= 0.5) {
        return "border-amber-300/80 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-950/30";
    }
    return "border-red-300/80 bg-red-50/80 dark:border-red-800/60 dark:bg-red-950/30";
}

function dimensionRatioTextClass(ratio: number): string {
    if (ratio >= 0.8) return "text-emerald-700 dark:text-emerald-300";
    if (ratio >= 0.5) return "text-amber-800 dark:text-amber-200";
    return "text-red-700 dark:text-red-300";
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

    const fmtPrice = (n: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2,
        }).format(n);

    const up = data.analystConsensus.updownside;

    return (
        <div className="mx-auto max-w-4xl space-y-10 pb-16 pt-2">
            <Link
                href="/analysis"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                목록으로
            </Link>

            {/* 1. 헤더 */}
            <header className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            {report.companyName}
                            <span className="ml-2 text-xl font-medium text-muted-foreground sm:text-2xl">
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
                                className="border-primary/40 bg-background px-2.5 py-0.5 text-[11px] font-medium"
                            >
                                Model {data.selectedModel}:{" "}
                                {MODEL_NAMES[data.selectedModel].split(" (")[0]}
                            </Badge>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            {data.modelSelectionRationale}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                        <span className="text-xs text-muted-foreground">
                            종합 점수
                        </span>
                        <span className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
                            {Math.round(data.totalScore)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-baseline sm:gap-3">
                    <span>{report.periodLabel}</span>
                    <span className="hidden sm:inline">·</span>
                    <span>{reportDateStr}</span>
                </div>
            </header>

            <Separator />

            {/* 2. 세부 점수 (차원별) */}
            <section className="space-y-3">
                <h2 className="text-base font-semibold">세부 점수</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                    {data.dimensionScores.map((item) => {
                        const ratio =
                            item.maxScore > 0 ? item.score / item.maxScore : 0;
                        const scoreLabel = Number.isInteger(item.score)
                            ? String(item.score)
                            : item.score.toFixed(1);
                        return (
                            <Card
                                key={item.dimensionId}
                                size="sm"
                                className={cn(
                                    "gap-0 border py-3",
                                    dimensionRatioToneClass(ratio)
                                )}
                            >
                                <CardHeader className="px-3 pb-2 pt-0">
                                    <CardTitle className="text-sm font-medium leading-snug">
                                        {item.dimensionName}
                                    </CardTitle>
                                    <div
                                        className={cn(
                                            "text-2xl font-bold tabular-nums",
                                            dimensionRatioTextClass(ratio)
                                        )}
                                    >
                                        {scoreLabel} / {item.maxScore}
                                    </div>
                                </CardHeader>
                                <CardContent className="px-3 pb-0 pt-0">
                                    <CardDescription className="text-xs leading-relaxed">
                                        {item.rationale}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* 점수 요약 바 */}
            <section>
                <Card size="sm" className="border-muted bg-muted/30">
                    <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div className="space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground">
                                Dimension 합계 (오버레이 전)
                            </p>
                            <p className="text-lg font-semibold tabular-nums">
                                {data.dimensionTotal.toFixed(1)} / 100
                            </p>
                        </div>
                        <Separator className="sm:hidden" />
                        <div className="space-y-0.5 sm:text-center">
                            <p className="text-xs font-medium text-muted-foreground">
                                오버레이 조정 합계
                            </p>
                            <p
                                className={cn(
                                    "text-lg font-semibold tabular-nums",
                                    data.overlayTotal > 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : data.overlayTotal < 0
                                          ? "text-red-600 dark:text-red-400"
                                          : "text-muted-foreground"
                                )}
                            >
                                {data.overlayTotal > 0 ? "+" : ""}
                                {data.overlayTotal.toFixed(1)}
                            </p>
                        </div>
                        <Separator className="sm:hidden" />
                        <div className="space-y-0.5 sm:text-right">
                            <p className="text-xs font-medium text-muted-foreground">
                                최종 종합 점수
                            </p>
                            <p className="text-2xl font-bold tabular-nums tracking-tight">
                                {Math.round(data.totalScore)}
                                <span className="text-base font-semibold text-muted-foreground">
                                    {" "}
                                    / 100
                                </span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* 오버레이 조정 (있을 때만) */}
            {data.overlayAdjustments.length > 0 ? (
                <section className="space-y-3">
                    <h2 className="text-base font-semibold">오버레이 조정</h2>
                    <ul className="space-y-3">
                        {data.overlayAdjustments.map((row, i) => (
                            <li key={`${row.item}-${i}`}>
                                <Card size="sm">
                                    <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {row.item}
                                        </CardTitle>
                                        <span
                                            className={cn(
                                                "shrink-0 text-sm font-semibold tabular-nums",
                                                row.adjustment > 0
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : row.adjustment < 0
                                                      ? "text-red-600 dark:text-red-400"
                                                      : "text-muted-foreground"
                                            )}
                                        >
                                            {row.adjustment > 0 ? "+" : ""}
                                            {row.adjustment}
                                        </span>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {row.rationale}
                                        </p>
                                    </CardContent>
                                </Card>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {/* Kill Switch */}
            {data.killSwitchTriggered ? (
                <section>
                    <Card
                        size="sm"
                        className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-red-900 dark:text-red-100">
                                Kill Switch 발동
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-sm leading-relaxed text-red-950 dark:text-red-100/90">
                                {data.killSwitchReason ?? "사유가 기록되지 않았습니다."}
                            </p>
                        </CardContent>
                    </Card>
                </section>
            ) : null}

            {/* 3. 투자 의견 */}
            <section className="space-y-3">
                <h2 className="text-base font-semibold">종합 투자 의견</h2>
                <Card size="sm">
                    <CardContent className="pt-0">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {data.investmentThesis}
                        </p>
                    </CardContent>
                </Card>
            </section>

            {/* 4. 목표 주가 */}
            <section className="space-y-3">
                <h2 className="text-base font-semibold">목표 주가 (12개월)</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(
                        [
                            ["Bear", data.priceTarget.bear],
                            ["Base", data.priceTarget.base],
                            ["Bull", data.priceTarget.bull],
                        ] as const
                    ).map(([label, value]) => (
                        <Card key={label} size="sm" className="items-center py-4">
                            <CardHeader className="items-center pb-1 text-center">
                                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-xl font-semibold tabular-nums">
                                    {fmtPrice(value)}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    {data.priceTarget.rationale}
                </p>
            </section>

            {/* 5. 상승 촉매 */}
            <section className="space-y-3">
                <h2 className="text-base font-semibold">상승 촉매</h2>
                <ul className="space-y-3">
                    {data.catalysts.map((c, i) => (
                        <li key={i}>
                            <Card size="sm">
                                <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {c.title}
                                    </CardTitle>
                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                        {c.timeframe}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {c.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ul>
            </section>

            {/* 6. 리스크 */}
            <section className="space-y-3">
                <h2 className="text-base font-semibold">리스크</h2>
                <ul className="space-y-3">
                    {data.risks.map((r, i) => (
                        <li key={i}>
                            <Card size="sm">
                                <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {r.title}
                                    </CardTitle>
                                    <span
                                        className={cn(
                                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                            severityBadgeClass(r.severity)
                                        )}
                                    >
                                        {r.severity}
                                    </span>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {r.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ul>
            </section>

            {/* 7. 기업 개요 */}
            <section className="space-y-4">
                <h2 className="text-base font-semibold">기업 개요</h2>
                <Card size="sm">
                    <CardContent className="space-y-4 pt-0">
                        <p className="text-sm leading-relaxed">
                            {data.companyOverview.summary}
                        </p>
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                핵심 제품·서비스
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {data.companyOverview.keyProducts.map((p, i) => (
                                    <Badge
                                        key={i}
                                        variant="secondary"
                                        className="font-normal"
                                    >
                                        {p}
                                    </Badge>
                                ))}
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
                    </CardContent>
                </Card>
            </section>

            {/* 8. 애널리스트 컨센서스 */}
            <section className="space-y-3">
                <h2 className="text-base font-semibold">애널리스트 컨센서스</h2>
                <Card size="sm">
                    <CardContent className="space-y-3 pt-0">
                        <p className="text-sm leading-relaxed">
                            {data.analystConsensus.summary}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs text-muted-foreground">
                                목표가 대비
                            </span>
                            <span
                                className={cn(
                                    "text-lg font-semibold tabular-nums",
                                    up >= 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-red-600 dark:text-red-400"
                                )}
                            >
                                {up >= 0 ? "▲" : "▼"} {Math.abs(up).toFixed(1)}%
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
