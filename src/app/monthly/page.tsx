"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart2, ChevronRight, FileText } from "lucide-react";
import { getReportsByProfileAndType } from "@/app/actions/reports";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import type { Report, PortfolioItem, NewInvestment } from "@/generated/prisma";
import { PageMainTitle } from "@/components/layout/page-main-title";
import { cn } from "@/lib/utils";
import { withDevSampleReportsIfEmpty, isDevSampleReport } from "@/lib/dev-sample-reports";

type ReportWithItems = Report & { 
    portfolioItems: PortfolioItem[];
    newInvestments?: NewInvestment[];
};

/** 예: 2025-11 → 2025년 11월 (단독 표시용) */
function formatMonthTitle(periodLabel: string): string {
    const m = /^(\d{4})-(\d{2})$/.exec(periodLabel.trim());
    if (!m) return periodLabel;
    return `${m[1]}년 ${Number(m[2])}월`;
}

/** 연도 섹션 아래 카드: 11월 */
function formatMonthWithinYear(periodLabel: string): string {
    const m = /^(\d{4})-(\d{2})$/.exec(periodLabel.trim());
    if (!m) return formatMonthTitle(periodLabel);
    return `${Number(m[2])}월`;
}

function yearFromPeriodStart(periodLabel: string): number | null {
    const m = /^(\d{4})/.exec(periodLabel.trim());
    if (!m) return null;
    return Number(m[1]);
}

function ReportCard({
    report,
    title,
}: {
    report: ReportWithItems;
    /** 연도 헤더와 함께 쓸 때 월만 (예: 11월) */
    title?: string;
}) {
    const isDraft = (report as Report & { status?: string }).status === "DRAFT";

    const cardShellClass = cn(
        "relative w-full overflow-hidden rounded-2xl border shadow-lg transition-all duration-200",
        "border-zinc-200/90 bg-gradient-to-b from-zinc-50 to-zinc-100/90 text-zinc-900 shadow-zinc-900/[0.05]",
        "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-900/10",
        "dark:border-0 dark:from-zinc-900 dark:to-zinc-900 dark:text-white dark:shadow-black/25",
        "dark:hover:shadow-xl",
        isDraft && "ring-2 ring-primary/25",
    );

    const cardInner = (
        <div className={cardShellClass}>
            {isDraft && (
                <span className="absolute right-3 top-2.5 z-10 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    임시저장
                </span>
            )}

            <div className="flex min-h-[4.5rem] items-center justify-between gap-3 px-5 py-4">
                <p className="min-w-0 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                    {title ?? formatMonthTitle(report.periodLabel)}
                </p>
                <ChevronRight
                    className="size-5 shrink-0 text-zinc-400 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden
                />
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

export default function MonthlyReportPage() {
    const [profileId, setProfileId] = useState<string>("alpha-ceo");
    const [reports, setReports] = useState<ReportWithItems[]>([]);
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
        getReportsByProfileAndType(profileLabel, "MONTHLY")
            .then((data) =>
                setReports(
                    withDevSampleReportsIfEmpty(
                        data as ReportWithItems[],
                        "MONTHLY",
                        profileLabel,
                    ) as ReportWithItems[],
                ),
            )
            .finally(() => setLoading(false));
    }, [mounted, profileId]);

    const yearlyGroups = useMemo(() => {
        const buckets = new Map<number, ReportWithItems[]>();
        const other: ReportWithItems[] = [];
        for (const r of reports) {
            const y = yearFromPeriodStart(r.periodLabel);
            if (y === null) {
                other.push(r);
                continue;
            }
            const list = buckets.get(y) ?? [];
            list.push(r);
            buckets.set(y, list);
        }
        const rows: { year: number | null; items: ReportWithItems[] }[] = [...buckets.entries()]
            .sort(([a], [b]) => a - b)
            .map(([year, items]) => ({
                year,
                items: [...items].sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)),
            }));
        if (other.length > 0) {
            rows.push({
                year: null,
                items: [...other].sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)),
            });
        }
        return rows;
    }, [reports]);

    if (!mounted || loading) {
        return (
            <div className="space-y-8">
                <div className="h-10 w-56 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <PageMainTitle icon={BarChart2}>Monthly Reports</PageMainTitle>
                </div>
                <Link
                    href="/reports/new"
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                    + 새리포트
                </Link>
            </div>

            {reports.length > 0 ? (
                <div className="space-y-8">
                    <div className="flex justify-end">
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                            총 {reports.length}개 리포트
                        </span>
                    </div>
                    {yearlyGroups.map((group) => (
                        <section key={group.year ?? "other"} className="space-y-3">
                            <h2 className="text-sm font-semibold tracking-tight text-neutral-500 dark:text-neutral-400">
                                {group.year !== null ? `${group.year}년` : "기타"}
                            </h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {group.items.map((report) => (
                                    <ReportCard
                                        key={report.id}
                                        report={report}
                                        title={
                                            group.year !== null
                                                ? formatMonthWithinYear(report.periodLabel)
                                                : undefined
                                        }
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/80 shadow-none dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                            <FileText className="h-7 w-7 text-neutral-400" />
                        </div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">저장된 월별 리포트가 없습니다.</p>
                        <p className="mt-2 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                            매월 말에 그 시점의 자산 상태를 기록해 보세요.
                        </p>
                        <Link
                            href="/reports/new"
                            className="mt-6 inline-flex items-center rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                            첫 월별 리포트 작성하기
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
