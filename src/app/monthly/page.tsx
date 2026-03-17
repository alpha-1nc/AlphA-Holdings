"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getReportsByProfileAndType } from "@/app/actions/reports";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import { getTickerColor } from "@/constants/brandColors";
import type { Report, PortfolioItem, NewInvestment } from "@/generated/prisma";

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

function ReportCard({ report }: { report: ReportWithItems }) {
    // 신규 투입금을 제외한 투자금으로 수익 계산
    const newInv = (report.newInvestments || []).reduce((sum, inv) => sum + inv.krwAmount, 0);
    const adjustedInvested = report.totalInvestedKrw - newInv;
    const gain = report.totalCurrentKrw - adjustedInvested;
    const isPositive = gain >= 0;
    const returnRate = adjustedInvested !== 0 ? (gain / adjustedInvested) * 100 : 0;
    const total = report.totalCurrentKrw;
    const isDraft = (report as Report & { status?: string }).status === "DRAFT";

    return (
        <Link href={`/reports/${report.id}`} className="group block">
            <div className={`relative overflow-hidden rounded-2xl border bg-white shadow-none ring-1 ring-transparent transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:bg-neutral-900/80 ${
                isDraft
                    ? "border-amber-200/70 opacity-90 hover:opacity-100 dark:border-amber-800/50"
                    : "border-neutral-100 hover:border-neutral-200 hover:ring-neutral-200/70 dark:border-neutral-800 dark:hover:border-neutral-700"
            }`}>
                {/* Top accent bar */}
                <div className={`absolute inset-x-0 top-0 h-[3px] ${isPositive ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-red-400 to-rose-500"}`} />

                <div className="p-5 pt-6">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
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
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${isPositive
                            ? "border-emerald-300/40 bg-emerald-50/70 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "border-red-300/40 bg-red-50/70 text-red-600 dark:border-red-500/40 dark:bg-red-900/40 dark:text-red-400"
                            }`}>
                            {isPositive ? "+" : ""}{returnRate.toFixed(2)}%
                        </span>
                    </div>

                    {/* Summary text */}
                    {report.summary && (
                        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                            {report.summary}
                        </p>
                    )}

                    {/* Financials */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/60">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">평가금</p>
                            <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">{krw(report.totalCurrentKrw)}</p>
                        </div>
                        <div className="rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/60">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">수익금</p>
                            <p className={`mt-0.5 text-sm font-semibold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                {isPositive ? "+" : ""}{krw(gain)}
                            </p>
                        </div>
                    </div>

                    {/* Portfolio mini bar */}
                    {report.portfolioItems.length > 0 && total > 0 && (
                        <div>
                            <div className="flex h-1.5 w-full overflow-hidden rounded-full">
                                {report.portfolioItems
                                    .filter((i) => i.krwAmount > 0)
                                    .map((item, idx) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                width: `${(item.krwAmount / total) * 100}%`,
                                                background: getTickerColor(item.ticker, idx),
                                            }}
                                        />
                                    ))}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
                                {report.portfolioItems
                                    .filter((i) => i.krwAmount > 0)
                                    .slice(0, 5)
                                    .map((item, idx) => (
                                        <span key={item.id} className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: getTickerColor(item.ticker, idx) }} />
                                            {item.ticker}
                                        </span>
                                    ))}
                                {report.portfolioItems.length > 5 && (
                                    <span className="text-[10px] text-neutral-400">+{report.portfolioItems.length - 5}</span>
                                )}
                            </div>
                        </div>
                    )}
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
                <div className="h-7 w-48 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
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
                    <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                        Monthly Reports
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                        월별 투자 스냅샷 아카이브
                        <span className="hidden md:inline"> · </span>
                        <br className="md:hidden" />
                        <span>{getProfileLabel(profileId as "alpha-ceo" | "partner")}</span>
                    </p>
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
