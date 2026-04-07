"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, BarChart2 } from "lucide-react";
import { getReportsByProfileAndType } from "@/app/actions/reports";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import type { Report, PortfolioItem, NewInvestment } from "@/generated/prisma";
import { PageMainTitle } from "@/components/layout/page-main-title";

type ReportWithItems = Report & { 
    portfolioItems: PortfolioItem[];
    newInvestments?: NewInvestment[];
};

const krw = (n: number) =>
    new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
        maximumFractionDigits: 0,
    }).format(n);

function sumNewInvestmentKrw(report: ReportWithItems): number {
    const rows = report.newInvestments ?? [];
    return rows.reduce((s, inv) => s + (inv.krwAmount ?? 0), 0);
}

function ReportCard({ report }: { report: ReportWithItems }) {
    const isDraft = (report as Report & { status?: string }).status === "DRAFT";
    const newInvSum = sumNewInvestmentKrw(report);

    return (
        <Link href={`/reports/${report.id}`} className="group block">
            <div className={`relative overflow-hidden rounded-2xl border bg-white shadow-none ring-1 ring-transparent transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:bg-neutral-900/80 ${
                isDraft
                    ? "border-amber-200/70 opacity-90 hover:opacity-100 dark:border-amber-800/50"
                    : "border-neutral-100 hover:border-neutral-200 hover:ring-neutral-200/70 dark:border-neutral-800 dark:hover:border-neutral-700"
            }`}>
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-neutral-300 via-neutral-400 to-neutral-500 dark:from-neutral-600 dark:via-neutral-500 dark:to-neutral-600" />

                <div className="p-5 pt-6">
                    <div className="mb-3">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500" suppressHydrationWarning>
                                {new Date(report.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                            </p>
                            {isDraft && (
                                <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-400">
                                    임시저장
                                </span>
                            )}
                        </div>
                        <h3 className={`mt-0.5 text-base font-semibold tracking-tight ${isDraft ? "text-neutral-600 dark:text-neutral-400" : "text-neutral-900 dark:text-white"}`}>
                            {report.periodLabel}
                        </h3>
                    </div>

                    {report.summary && (
                        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                            {report.summary}
                        </p>
                    )}

                    <div className="rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/60">
                        <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">이번 달 신규 투자금 합계</p>
                        <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                            {newInvSum === 0 ? "—" : krw(newInvSum)}
                        </p>
                    </div>
                </div>
            </div>
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
            .then((data) => setReports(data as ReportWithItems[]))
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
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                            MONTHLY TIMELINE
                        </p>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                            총 {reports.length}개 리포트
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {reports.map((report) => (
                            <ReportCard key={report.id} report={report} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/80 shadow-none dark:border-neutral-800 dark:bg-neutral-900/60">
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
