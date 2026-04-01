"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell,
    ComposedChart, Line, Area,
    LineChart,
} from "recharts";
import { Globe, Wallet, BarChart3, ChevronDown, Home } from "lucide-react";
import { getReportsByProfilePublished } from "@/app/actions/reports";
import { getPortfolioStrategies } from "@/app/actions/strategy";
import { getTickerColor, FALLBACK_COLORS } from "@/constants/brandColors";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import type { WorkspaceProfile } from "@/lib/profile";
import { computeRoleAllocation, computeTickerDeviation } from "@/lib/role-allocation";
import { RoleAllocationChart } from "@/components/dashboard/RoleAllocationChart";
import { TargetVsActualBar } from "@/components/dashboard/TargetVsActualBar";
import { AiBriefingBanner } from "@/components/dashboard/AiBriefingBanner";
import { PageMainTitle } from "@/components/layout/page-main-title";
import type { Report, PortfolioItem, NewInvestment, PortfolioStrategy } from "@/generated/prisma";
import { computeGainKrw, computeReturnRatePercent } from "@/lib/report-performance";

type ReportWithItems = Report & { 
    portfolioItems: PortfolioItem[];
    newInvestments?: NewInvestment[];
};

/* ── Formatters ──────────────────────────────────────────────────────────*/
const krwFmt = (n: number) =>
    new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

const krwShort = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
    if (abs >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
    return String(n);
};

/* ── Empty State ─────────────────────────────────────────────────────────*/
function EmptyState() {
    return (
        <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M3 21h18M3 10.5l9-7.5 9 7.5" />
                </svg>
            </div>
            <div>
                <p className="text-base font-semibold text-neutral-700 dark:text-neutral-200">아직 작성된 리포트가 없습니다.</p>
                <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">새 리포트를 작성하면 여기서 현황을 한눈에 확인할 수 있어요.</p>
            </div>
            <Link
                href="/reports/new"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-95"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                새 리포트 작성
            </Link>
        </div>
    );
}

/* ── Summary Card ────────────────────────────────────────────────────────*/
interface SummaryCardProps {
    label: string;
    value: string;
    sub?: string;
    colorClass?: string;
    icon: React.ReactNode;
    gradient: string;
}

function SummaryCard({ label, value, sub, colorClass, icon, gradient }: SummaryCardProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-neutral-900 dark:border-neutral-800">
            <div className={`absolute inset-x-0 top-0 h-[3px] ${gradient}`} />
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 dark:bg-neutral-800">
                {icon}
            </div>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{label}</p>
            <p className={`text-2xl font-bold tracking-tight ${colorClass ?? "text-neutral-900 dark:text-neutral-50"}`}>{value}</p>
            {sub && <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{sub}</p>}
        </div>
    );
}

/* ── Custom Tooltip ──────────────────────────────────────────────────────*/
function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-neutral-600 dark:text-neutral-300">{p.name}</span>
                    <span className="ml-auto font-semibold text-neutral-900 dark:text-neutral-100">{krwShort(p.value)}</span>
                </div>
            ))}
        </div>
    );
}

type NewInvBarRow = { period: string; "신규 투자금(합계)": number };

function NewInvestmentAccordion({
    latestPeriodLabel,
    latestAmount,
    ytdAmount,
    yearLabel,
    chartData,
}: {
    latestPeriodLabel: string;
    latestAmount: number;
    ytdAmount: number;
    yearLabel: number;
    chartData: NewInvBarRow[];
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="min-w-0 rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 md:p-6"
            >
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                        신규 납입
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                        <div>
                            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">최근 달 ({latestPeriodLabel})</p>
                            <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50 md:text-2xl">
                                {krwFmt(latestAmount)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{yearLabel}년 누적</p>
                            <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50 md:text-2xl">
                                {krwFmt(ytdAmount)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{open ? "접기" : "추이 보기"}</span>
                    <ChevronDown
                        className={[
                            "h-5 w-5 text-neutral-400 transition-transform duration-200 dark:text-neutral-500",
                            open ? "rotate-180" : "",
                        ].join(" ")}
                        aria-hidden
                    />
                </div>
            </button>
            {open && (
                <div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800 md:px-6 md:pb-6">
                    <p className="mb-3 text-[11px] text-neutral-400 dark:text-neutral-500">
                        각 월별 리포트에 기록된 신규 납입액 합계입니다.
                    </p>
                    <div className="h-52 min-w-0 md:h-56">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={krwShort} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={52} />
                                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                                <Bar name="신규 납입" dataKey="신규 투자금(합계)" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={44} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Donut Tooltip ───────────────────────────────────────────────────────*/
function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: item.payload.color }} />
                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{item.name}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{krwFmt(item.value)}</p>
        </div>
    );
}

/* ── Sector Tooltip (shows holding labels in sector) ─────────────────────*/
function SectorTooltip({ active, payload }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { color: string; holdingLabels: string[] } }>;
}) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.payload.color }} />
                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{item.name}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{krwFmt(item.value)}</p>
            {item.payload.holdingLabels.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.payload.holdingLabels.map((t, i) => (
                        <span key={`${t}-${i}`} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {t}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Ticker Donut ────────────────────────────────────────────────────────*/
/** 현금 고정 색상 (상징성 낮은 회색) */
const CASH_CHART_COLOR = "#6B7280";

function TickerCashToggle({ includeCash, setIncludeCash }: { includeCash: boolean; setIncludeCash: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={includeCash}
            onClick={() => setIncludeCash(!includeCash)}
            className={[
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                includeCash ? "bg-indigo-600" : "bg-neutral-200 dark:bg-neutral-700",
            ].join(" ")}
        >
            <span
                className={[
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                    includeCash ? "translate-x-4" : "translate-x-0.5",
                ].join(" ")}
            />
        </button>
    );
}

function TickerDonut({ items, totalKrw, includeCash }: { items: PortfolioItem[]; totalKrw: number; includeCash: boolean }) {
    const nonCashItems = items.filter((i) => i.accountType !== "CASH" && i.krwAmount > 0);
    const cashItems = items.filter((i) => i.accountType === "CASH" && i.krwAmount > 0);
    const totalExCash = nonCashItems.reduce((s, i) => s + i.krwAmount, 0);
    const totalCash = cashItems.reduce((s, i) => s + i.krwAmount, 0);
    const displayTotal = includeCash ? totalKrw : totalExCash;

    const nonCashData = nonCashItems.map((item, idx) => ({
        name: getPortfolioItemDisplayLabel({
            ticker: item.ticker,
            displayName: item.displayName,
        }),
        value: item.krwAmount,
        color: getTickerColor(item.ticker, idx),
    }));
    const aggregatedCash = totalCash > 0 ? { name: "현금", value: totalCash, color: CASH_CHART_COLOR } : null;
    const data = includeCash && aggregatedCash ? [...nonCashData, aggregatedCash] : nonCashData;

    if (!data.length) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">분기별 리포트에 종목을 추가하면</p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500">차트가 표시됩니다</p>
            </div>
        );
    }

    return (
        <div className="flex w-full min-w-0 flex-col items-center gap-4">
            <div className="relative h-52 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={88}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                            isAnimationActive
                        >
                            {data.map((entry, i) => (
                                <Cell key={`${entry.name}-${i}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">평가금액</p>
                    <p className="mt-0.5 text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                        {krwShort(displayTotal)}
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                {data.map((d) => {
                    const pct = displayTotal > 0 ? ((d.value / displayTotal) * 100).toFixed(1) : "0";
                    return (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                            <span>{d.name}</span>
                            <span className="text-neutral-400 dark:text-neutral-500">{pct}%</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Sector Donut ────────────────────────────────────────────────────────*/
const SECTOR_COLORS: Record<string, string> = {
    "Technology": "#6366F1",
    "Financials": "#2563EB",
    "Consumer Discretionary": "#F59E0B",
    "Consumer Staples": "#059669",
    "Healthcare": "#EC4899",
    "Industrials": "#0D9488",
    "Energy": "#DC2626",
    "Materials": "#65A30D",
    "Real Estate": "#7C3AED",
    "Utilities": "#0891B2",
    "Communication Services": "#EA580C",
    "ETF / Index": "#6B7280",
    "기타": "#9CA3AF",
};

/** 현금 제외하여 섹터별 비중 계산 (CASH는 섹터 분류 없음) */
function SectorDonut({ items, totalKrw }: { items: PortfolioItem[]; totalKrw: number }) {
    const sectorMap = new Map<string, { value: number; holdingLabels: string[] }>();
    const nonCashItems = items.filter((i) => i.accountType !== "CASH" && i.krwAmount > 0);
    const totalExCash = nonCashItems.reduce((s, i) => s + i.krwAmount, 0);

    nonCashItems.forEach((item) => {
            const sector = (item.sector as string | null) || "기타";
            const existing = sectorMap.get(sector) ?? { value: 0, holdingLabels: [] };
            const label = getPortfolioItemDisplayLabel({
                ticker: item.ticker,
                displayName: item.displayName,
            });
            sectorMap.set(sector, {
                value: existing.value + item.krwAmount,
                holdingLabels: [...existing.holdingLabels, label],
            });
        });

    const data = Array.from(sectorMap.entries()).map(([name, { value, holdingLabels }], idx) => ({
        name,
        value,
        holdingLabels,
        color: SECTOR_COLORS[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
    }));

    if (!data.length) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">분기별 리포트에 섹터 정보를 입력하면</p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500">차트가 표시됩니다</p>
            </div>
        );
    }

    return (
        <div className="flex w-full min-w-0 flex-col items-center gap-4">
            <div className="relative h-52 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={88}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                            isAnimationActive
                        >
                            {data.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<SectorTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">섹터 분산</p>
                    <p className="mt-0.5 text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                        {data.length}개 섹터
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                {data.map((d) => {
                    const pct = totalExCash > 0 ? ((d.value / totalExCash) * 100).toFixed(1) : "0";
                    return (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                            <span>{d.name}</span>
                            <span className="text-neutral-400 dark:text-neutral-500">{pct}%</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Dashboard
══════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
    const [profileId, setProfileId] = useState<string>("alpha-ceo");
    const [reports, setReports] = useState<ReportWithItems[]>([]);
    const [strategies, setStrategies] = useState<PortfolioStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"monthly" | "quarterly">("monthly");
    const [includeCash, setIncludeCash] = useState(false);

    useEffect(() => {
        const currentProfile = getCurrentProfile();
        setProfileId(currentProfile);
    }, []);

    useEffect(() => {
        if (!profileId) return;
        setLoading(true);
        const profileLabel = getProfileLabel(profileId as "alpha-ceo" | "partner");
        Promise.all([
            getReportsByProfilePublished(profileLabel),
            getPortfolioStrategies(profileId as WorkspaceProfile),
        ])
            .then(([reportData, strategyData]) => {
                setReports(reportData as ReportWithItems[]);
                setStrategies(strategyData);
            })
            .finally(() => setLoading(false));
    }, [profileId]);

    if (loading) {
        return (
            <div className="p-0">
                <div className="mb-6 md:mb-8">
                    <div className="h-7 w-48 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-2 h-4 w-72 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-700" />
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-36 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
                    ))}
                </div>
            </div>
        );
    }

    if (reports.length === 0) return <EmptyState />;

    const latest = reports[0];
    const invested = latest.totalInvestedKrw;
    const current = latest.totalCurrentKrw;
    const profit = computeGainKrw(current, invested);
    const returnRate = computeReturnRatePercent(current, invested);
    const isPositive = profit >= 0;
    const profitColor = isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
    const profitSign = isPositive ? "+" : "";

    const cards: SummaryCardProps[] = [
        {
            label: "총 투자금",
            value: krwFmt(invested),
            sub: `기준 리포트: ${latest.periodLabel}`,
            gradient: "bg-gradient-to-r from-blue-400 to-indigo-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>,
        },
        {
            label: "현재 총 평가금",
            value: krwFmt(current),
            gradient: "bg-gradient-to-r from-violet-400 to-purple-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
        },
        {
            label: "누적 수익금",
            value: `${profitSign}${krwFmt(profit)}`,
            colorClass: profitColor,
            sub: `원금 대비 ${profitSign}${krwFmt(profit)}`,
            gradient: isPositive ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-gradient-to-r from-red-400 to-rose-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isPositive ? "text-emerald-500" : "text-red-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>{isPositive ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />}</svg>,
        },
        {
            label: "누적 수익률",
            value: `${profitSign}${returnRate.toFixed(2)}%`,
            colorClass: profitColor,
            sub: isPositive ? "수익 중 🎉" : "손실 중",
            gradient: isPositive ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-slate-400 to-gray-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isPositive ? "text-amber-500" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        },
    ];

    // ── 차트 데이터 준비 ─────────────────────────────────────────────
    const monthlyReports = [...reports].filter((r) => r.type === "MONTHLY").reverse();
    const quarterlyReports = [...reports].filter((r) => r.type === "QUARTERLY").reverse();
    const chartReports = activeTab === "monthly" ? monthlyReports : quarterlyReports;

    const barData = chartReports.map((r) => ({
        period: r.periodLabel,
        "총 투자금": r.totalInvestedKrw,
        "총 평가금": r.totalCurrentKrw,
        "수익금": computeGainKrw(r.totalCurrentKrw, r.totalInvestedKrw),
    }));

    const monthlyAscForNewInv = [...reports]
        .filter((r) => r.type === "MONTHLY")
        .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel));
    const calendarYear = new Date().getFullYear();
    const ytdNewInvestmentKrw = monthlyAscForNewInv
        .filter((r) => r.periodLabel.startsWith(`${calendarYear}-`))
        .reduce(
            (sum, r) => sum + (r.newInvestments || []).reduce((s, i) => s + i.krwAmount, 0),
            0,
        );
    const latestMonthlyForNewInv =
        monthlyAscForNewInv.length > 0 ? monthlyAscForNewInv[monthlyAscForNewInv.length - 1] : null;
    const monthlyNewInvBarData: NewInvBarRow[] = monthlyAscForNewInv.map((r) => ({
        period: r.periodLabel,
        "신규 투자금(합계)": (r.newInvestments || []).reduce((s, i) => s + i.krwAmount, 0),
    }));

    const returnData = chartReports.map((r) => ({
        period: r.periodLabel,
        "수익률(%)": parseFloat(computeReturnRatePercent(r.totalCurrentKrw, r.totalInvestedKrw).toFixed(2)),
    }));

    // ── 최신 분기별 리포트 (포트폴리오 도넛 차트용) ──────────────────
    const latestQuarterly = quarterlyReports[quarterlyReports.length - 1];

    // ── 역할군 비중 계산 (기능 A: items만, 도넛 차트용) ───────────────────
    const roleAllocationData = latestQuarterly
        ? computeRoleAllocation(latestQuarterly.portfolioItems)
        : [];

    // ── 종목별 목표 대비 괴리율 (기능 B: 개별 종목 중심) ─────────────────
    const tickerDeviationData =
        latestQuarterly && strategies.length > 0
            ? computeTickerDeviation(latestQuarterly.portfolioItems, strategies)
            : [];

    return (
        <div className="w-full max-w-[100vw] space-y-8 overflow-hidden p-0 md:space-y-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <PageMainTitle icon={Home}>Dashboard</PageMainTitle>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${profileId === "alpha-ceo"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}>
                            {getProfileLabel(profileId as "alpha-ceo" | "partner")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <SummaryCard key={card.label} {...card} />
                ))}
            </div>

            {/* AI 브리핑 배너 */}
            <AiBriefingBanner profileId={profileId as WorkspaceProfile} />

            {/* 기간별 투자 추이 (AI 브리핑 바로 아래) — 탭은 항상 표시, 데이터 없을 때는 안내 문구 */}
            <div className="space-y-4 md:space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">기간별 투자 추이</h2>
                    <div className="inline-flex shrink-0 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab("monthly")}
                            className={[
                                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                                activeTab === "monthly"
                                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100",
                            ].join(" ")}
                        >
                            월별
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("quarterly")}
                            className={[
                                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                                activeTab === "quarterly"
                                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100",
                            ].join(" ")}
                        >
                            분기별
                        </button>
                    </div>
                </div>

                {chartReports.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-14 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                            {activeTab === "monthly"
                                ? "표시할 월별 리포트 데이터가 없습니다."
                                : "표시할 분기별 리포트 데이터가 없습니다."}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                            해당 유형의 리포트를 작성하면 추이 그래프가 나타납니다.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="min-w-0 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                총 투자금 · 총 평가금
                            </p>
                            <div className="h-52 min-w-0 md:h-64">
                                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                    <ComposedChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={krwShort} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={52} />
                                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                                        <Legend wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
                                        <Bar dataKey="총 투자금" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Line type="monotone" dataKey="총 평가금" stroke="#10B981" strokeWidth={3} dot={{ fill: "#10B981", strokeWidth: 0 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="min-w-0 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                    누적 수익금
                                </p>
                                <div className="h-48 min-w-0 md:h-52">
                                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                        <LineChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                                                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                            <YAxis tickFormatter={krwShort} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={52} />
                                            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                                            <Area type="monotone" dataKey="수익금" fill="url(#profitGradient)" stroke="none" hide />
                                            <Line type="monotone" dataKey="수익금" stroke="#F59E0B" strokeWidth={2} dot={{ fill: "#F59E0B", strokeWidth: 0 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="min-w-0 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                    누적 수익률 (%)
                                </p>
                                <div className="h-48 min-w-0 md:h-52">
                                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                        <LineChart data={returnData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                                                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={40} unit="%" />
                                            <Tooltip
                                                formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, "누적 수익률"]}
                                                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                                                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                                            />
                                            <Area type="monotone" dataKey="수익률(%)" fill="url(#returnGradient)" stroke="none" hide />
                                            <Line type="monotone" dataKey="수익률(%)" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: "#8B5CF6", strokeWidth: 0 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {latestMonthlyForNewInv && (
                <NewInvestmentAccordion
                    latestPeriodLabel={latestMonthlyForNewInv.periodLabel}
                    latestAmount={(latestMonthlyForNewInv.newInvestments || []).reduce((s, i) => s + i.krwAmount, 0)}
                    ytdAmount={ytdNewInvestmentKrw}
                    yearLabel={calendarYear}
                    chartData={monthlyNewInvBarData}
                />
            )}

            {/* Portfolio Composition — based on latest quarterly report */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">포트폴리오 구성</h2>
                        <p className="mt-0.5 break-words text-xs text-neutral-400 dark:text-neutral-500">
                            최신 분기별 리포트 기준
                            {latestQuarterly && (
                                <span className="ml-1 font-medium text-neutral-600 dark:text-neutral-300">
                                    ({latestQuarterly.periodLabel})
                                </span>
                            )}
                        </p>
                    </div>
                    {latestQuarterly && (
                        <Link
                            href={`/reports/${latestQuarterly.id}`}
                            className="shrink-0 text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
                        >
                            리포트 보기 →
                        </Link>
                    )}
                </div>
                {/* 2x2 그리드: [1,1]종목별 [1,2]목표대비괴리율 [2,1]역할별 [2,2]섹터별 */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
                    {/* [1행 1열 - 좌상단] 종목별 비중 (Ticker Allocation) */}
                    <div className="flex min-h-[380px] min-w-0 flex-col rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
                        <div className="mb-4 flex shrink-0 items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                    종목별 비중
                                </p>
                                <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                    Ticker Allocation
                                </p>
                            </div>
                            {latestQuarterly && (() => {
                                const hasCash = latestQuarterly.portfolioItems.some((i) => i.accountType === "CASH" && i.krwAmount > 0);
                                return hasCash ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">현금 포함</span>
                                        <TickerCashToggle
                                            includeCash={includeCash}
                                            setIncludeCash={setIncludeCash}
                                        />
                                    </div>
                                ) : null;
                            })()}
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center">
                            {latestQuarterly ? (
                                <TickerDonut
                                    items={latestQuarterly.portfolioItems}
                                    totalKrw={latestQuarterly.totalCurrentKrw}
                                    includeCash={includeCash}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                                    <p className="text-sm text-neutral-400 dark:text-neutral-500">분기별 리포트가 없습니다</p>
                                    <Link
                                        href="/reports/new/quarterly"
                                        className="mt-1 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition"
                                    >
                                        분기별 리포트 작성 →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* [1행 2열 - 우상단] 목표 대비 괴리율 (Target vs Actual) */}
                    <div className="flex min-h-[380px] min-w-0 flex-col rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
                        <div className="mb-4 shrink-0">
                            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                목표 대비 괴리율
                            </p>
                            <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                Target vs Actual · ±5% 초과 시 리밸런싱 힌트
                            </p>
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto">
                            <TargetVsActualBar data={tickerDeviationData} />
                        </div>
                    </div>

                    {/* [2행 1열 - 좌하단] 역할별 비중 (Role Allocation) */}
                    <div className="flex min-h-[380px] min-w-0 flex-col rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
                        <div className="mb-4 shrink-0">
                            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                역할별 비중
                            </p>
                            <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                Role Allocation · 설정에서 역할 지정 가능
                            </p>
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center">
                            <RoleAllocationChart data={roleAllocationData} />
                        </div>
                    </div>

                    {/* [2행 2열 - 우하단] 섹터별 비중 (Sector Allocation) */}
                    <div className="flex min-h-[380px] min-w-0 flex-col rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
                        <div className="mb-4 shrink-0">
                            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                섹터별 비중
                            </p>
                            <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                Sector Allocation · 호버 시 보유 종목 표시
                            </p>
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center">
                            {latestQuarterly ? (
                                <SectorDonut
                                    items={latestQuarterly.portfolioItems}
                                    totalKrw={latestQuarterly.totalCurrentKrw}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                                    <p className="text-sm text-neutral-400 dark:text-neutral-500">분기별 리포트가 없습니다</p>
                                    <Link
                                        href="/reports/new/quarterly"
                                        className="mt-1 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition"
                                    >
                                        분기별 리포트 작성 →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
