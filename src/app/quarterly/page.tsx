"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, BanknoteArrowUp, TrendingUp } from "lucide-react";
import { getQuarterlyArchiveWithIntervals } from "@/app/actions/reports";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import { getTickerColor } from "@/constants/brandColors";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";
import type { Report, PortfolioItem, NewInvestment } from "@/generated/prisma";
import { sortPortfolioItemsForDisplay } from "@/lib/portfolio-display-order";
import { PageMainTitle } from "@/components/layout/page-main-title";
import {
    withDevSampleQuarterlyArchiveIfEmpty,
    isDevSampleReport,
} from "@/lib/dev-sample-reports";
import { cn } from "@/lib/utils";

type ReportWithItems = Report & {
    portfolioItems: PortfolioItem[];
    newInvestments?: NewInvestment[];
};

type QuarterlyArchiveRow = {
    report: ReportWithItems;
    intervalGainKrw: number;
    intervalReturnRatePercent: number;
};

const krw = (n: number) =>
    new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
        maximumFractionDigits: 0,
    }).format(n);

function ReportCard({
    archiveRow,
}: {
    archiveRow: QuarterlyArchiveRow;
}) {
    const { report, intervalReturnRatePercent } = archiveRow;
    const isPositive = intervalReturnRatePercent >= 0;
    const returnRate = intervalReturnRatePercent;
    const total = report.totalCurrentKrw ?? 0;
    const isDraft = (report as Report & { status?: string }).status === "DRAFT";
    const barItems = sortPortfolioItemsForDisplay(
        report.portfolioItems.filter((i) => i.krwAmount > 0),
    );

    const cardShellClass = cn(
        "relative w-full overflow-hidden rounded-2xl border shadow-xl transition-all duration-200",
        "border-zinc-200/90 bg-gradient-to-b from-zinc-50 to-zinc-100/90 text-zinc-900 shadow-zinc-900/[0.06]",
        "hover:-translate-y-1 hover:shadow-2xl hover:shadow-zinc-900/10",
        "dark:border-0 dark:from-zinc-900 dark:to-zinc-900 dark:text-white dark:shadow-black/25",
        "dark:hover:shadow-2xl",
        isDraft && "ring-2 ring-primary/25",
    );

    const cardInner = (
        <div className={cardShellClass}>
            {isDraft && (
                <span className="absolute right-4 top-3 z-10 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    임시저장
                </span>
            )}

            <div className="flex flex-col pt-6">
                <header className="flex items-start justify-between gap-3 px-6 pb-2">
                    <h3 className="text-lg font-semibold tracking-tight text-zinc-500 dark:text-zinc-400">
                        {report.periodLabel}
                    </h3>
                    <span
                        className={cn(
                            "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium",
                            "border-zinc-200/90 bg-white/80 text-zinc-700 shadow-sm hover:bg-white",
                            "dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none dark:hover:bg-zinc-700",
                            "transition-colors [&_svg]:size-[1.0625rem]",
                        )}
                    >
                        <BanknoteArrowUp aria-hidden className="shrink-0" />
                        리포트
                    </span>
                </header>

                <div className="space-y-5 px-6 pb-6">
                    <div className="flex flex-wrap items-end gap-2">
                        <span className="text-3xl font-bold tracking-tight text-zinc-900 tabular-nums dark:text-white">
                            {krw(total)}
                        </span>
                        <span
                            className={cn(
                                "text-base font-semibold tabular-nums ms-2",
                                isPositive ? "text-[var(--positive)]" : "text-[var(--negative)]",
                            )}
                        >
                            {isPositive ? "+" : ""}
                            {Math.round(returnRate)}%
                        </span>
                    </div>

                    {barItems.length > 0 && total > 0 && (
                        <>
                            <div className="border-b border-zinc-200/90 dark:border-zinc-700" />
                            <div className="flex w-full items-start gap-1.5">
                                {barItems.map((item, idx) => {
                                    const pct = (item.krwAmount / total) * 100;
                                    const label = getPortfolioItemDisplayLabel({
                                        ticker: item.ticker,
                                        displayName: item.displayName,
                                    });
                                    return (
                                        <div
                                            key={item.id}
                                            className="min-w-0 space-y-2.5"
                                            style={{ width: `${pct}%` }}
                                        >
                                            <div
                                                className="h-2.5 w-full overflow-hidden rounded-sm"
                                                style={{
                                                    background: getTickerColor(item.ticker, idx),
                                                }}
                                            />
                                            <div className="flex flex-col items-start">
                                                <span className="w-full truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                    {label}
                                                </span>
                                                <span className="text-base font-semibold tabular-nums text-zinc-900 dark:text-white">
                                                    {Math.round(pct)}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    if (isDevSampleReport(report)) {
        return (
            <div className="group block">
                <div className="relative">
                    <span className="absolute right-3 top-3 z-10 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        예시 · 개발
                    </span>
                    <div>{cardInner}</div>
                </div>
            </div>
        );
    }

    return (
        <Link href={`/reports/${report.id}`} className="group block">
            {cardInner}
        </Link>
    );
}

export default function QuarterlyReportPage() {
    const [profileId, setProfileId] = useState<string>("alpha-ceo");
    const [archive, setArchive] = useState<QuarterlyArchiveRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const currentProfile = getCurrentProfile();
        setProfileId(currentProfile);
    }, []);

    useEffect(() => {
        if (!mounted || !profileId) return;
        setLoading(true);
        const profileLabel = getProfileLabel(profileId as "alpha-ceo" | "partner");
        getQuarterlyArchiveWithIntervals(profileLabel)
            .then((data) =>
                setArchive(withDevSampleQuarterlyArchiveIfEmpty(data, profileLabel)),
            )
            .finally(() => setLoading(false));
    }, [mounted, profileId]);

    if (!mounted || loading) {
        return (
            <div className="space-y-8">
                <div className="h-10 w-56 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-52 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <PageMainTitle icon={TrendingUp}>Quarterly Reports</PageMainTitle>
                </div>
                <Link
                    href="/reports/new/quarterly"
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                    + 새리포트
                </Link>
            </div>

            {archive.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                            총 {archive.length}개 리포트
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {archive.map((row) => (
                            <ReportCard key={row.report.id} archiveRow={row} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/80 shadow-none dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                            <BarChart3 className="h-7 w-7 text-neutral-400" />
                        </div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">저장된 분기별 리포트가 없습니다.</p>
                        <p className="mt-2 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                            분기 말에 그 시점의 자산 상태를 기록해 보세요.
                        </p>
                        <Link
                            href="/reports/new/quarterly"
                            className="mt-6 inline-flex items-center rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                            첫 분기별 리포트 작성하기
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
