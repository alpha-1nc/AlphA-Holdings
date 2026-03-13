"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell,
    ComposedChart, Line, Area,
    LineChart,
} from "recharts";
import { Globe, Wallet, BarChart3 } from "lucide-react";
import { getReportsByProfilePublished } from "@/app/actions/reports";
import { getTickerColor, FALLBACK_COLORS } from "@/constants/brandColors";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import type { Report, PortfolioItem, NewInvestment } from "@/generated/prisma";

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

/* ── Sector Tooltip (shows tickers in sector) ────────────────────────────*/
function SectorTooltip({ active, payload }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { color: string; tickers: string[] } }>;
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
            {item.payload.tickers.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.payload.tickers.map((t) => (
                        <span key={t} className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
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
        name: item.ticker,
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
        <div className="flex flex-col items-center gap-4">
            <div className="relative h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
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
                        <div key={d.name} className="flex items-center gap-1 text-[10px] text-neutral-600 dark:text-neutral-400">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
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
    "Financials": "#3B82F6",
    "Consumer Discretionary": "#F59E0B",
    "Consumer Staples": "#10B981",
    "Healthcare": "#EC4899",
    "Industrials": "#8B5CF6",
    "Energy": "#EF4444",
    "Materials": "#84CC16",
    "Real Estate": "#F97316",
    "Utilities": "#06B6D4",
    "Communication Services": "#0EA5E9",
    "ETF / Index": "#6B7280",
    "기타": "#A3A3A3",
};

/** 현금 제외하여 섹터별 비중 계산 (CASH는 섹터 분류 없음) */
function SectorDonut({ items, totalKrw }: { items: PortfolioItem[]; totalKrw: number }) {
    const sectorMap = new Map<string, { value: number; tickers: string[] }>();
    const nonCashItems = items.filter((i) => i.accountType !== "CASH" && i.krwAmount > 0);
    const totalExCash = nonCashItems.reduce((s, i) => s + i.krwAmount, 0);

    nonCashItems.forEach((item) => {
            const sector = (item.sector as string | null) || "기타";
            const existing = sectorMap.get(sector) ?? { value: 0, tickers: [] };
            sectorMap.set(sector, {
                value: existing.value + item.krwAmount,
                tickers: [...existing.tickers, item.ticker],
            });
        });

    const data = Array.from(sectorMap.entries()).map(([name, { value, tickers }], idx) => ({
        name,
        value,
        tickers,
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
        <div className="flex flex-col items-center gap-4">
            <div className="relative h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
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
                        <div key={d.name} className="flex items-center gap-1 text-[10px] text-neutral-600 dark:text-neutral-400">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
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
        getReportsByProfilePublished(profileLabel)
            .then((data) => setReports(data as ReportWithItems[]))
            .finally(() => setLoading(false));
    }, [profileId]);

    if (loading) {
        return (
            <div className="p-6 lg:p-8">
                <div className="mb-8">
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
    // 신규 투자금을 제외한 투자금으로 수익 계산
    const newInv = (latest.newInvestments || []).reduce((sum, inv) => sum + inv.krwAmount, 0);
    const adjustedInvested = invested - newInv;
    const profit = current - adjustedInvested;
    const returnRate = adjustedInvested !== 0 ? (profit / adjustedInvested) * 100 : 0;
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
            label: "수익률",
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

    const barData = chartReports.map((r) => {
        const newInv = (r.newInvestments || []).reduce((sum, inv) => sum + inv.krwAmount, 0);
        const adjustedInvested = r.totalInvestedKrw - newInv;
        const g = r.totalCurrentKrw - adjustedInvested;
        return {
            period: r.periodLabel,
            "총 투자금": r.totalInvestedKrw,
            "총 평가금": r.totalCurrentKrw,
            "수익금": g,
            "신규 투자금": newInv,
        };
    });

    // 신규 투자금 차트 데이터 (월별/계좌별)
    const newInvestmentData = chartReports.map((r) => {
        const newInv = (r.newInvestments || []).reduce((sum, inv) => sum + inv.krwAmount, 0);
        // 월별 리포트의 경우 CASH 계좌 제외
        const filteredInvestments = activeTab === "monthly" 
            ? (r.newInvestments || []).filter((inv) => inv.accountType !== "CASH")
            : (r.newInvestments || []);
        const byAccount = filteredInvestments.reduce((acc, inv) => {
            const key = inv.accountType;
            acc[key] = (acc[key] || 0) + inv.krwAmount;
            return acc;
        }, {} as Record<string, number>);
        return {
            period: r.periodLabel,
            "신규 투자금": newInv,
            ...byAccount,
        };
    });

    const returnData = chartReports.map((r) => {
        const newInv = (r.newInvestments || []).reduce((sum, inv) => sum + inv.krwAmount, 0);
        const adjustedInvested = r.totalInvestedKrw - newInv;
        const g = r.totalCurrentKrw - adjustedInvested;
        const rate = adjustedInvested !== 0 ? (g / adjustedInvested) * 100 : 0;
        return {
            period: r.periodLabel,
            "수익률(%)": parseFloat(rate.toFixed(2)),
        };
    });

    // ── 최신 분기별 리포트 (포트폴리오 도넛 차트용) ──────────────────
    const latestQuarterly = quarterlyReports[quarterlyReports.length - 1];

    return (
        <div className="p-6 lg:p-8 space-y-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                            투자 현황 대시보드
                        </h1>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${profileId === "alpha-ceo"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}>
                            {getProfileLabel(profileId as "alpha-ceo" | "partner")}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        가장 최근 리포트({latest.periodLabel}) 기준 &middot; 총{" "}
                        <strong className="text-neutral-700 dark:text-neutral-300">{reports.length}개</strong> 리포트
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <SummaryCard key={card.label} {...card} />
                ))}
            </div>

            {/* Chart Section */}
            {chartReports.length > 0 && (
                <div className="space-y-6">
                    {/* Tab */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">기간별 투자 추이</h2>
                        <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
                            {(["monthly", "quarterly"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={[
                                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                                        activeTab === tab
                                            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                                            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
                                    ].join(" ")}
                                >
                                    {tab === "monthly" ? "월별" : "분기별"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ComposedChart: 총 투자금(Bar) · 총 평가금(Line) */}
                    <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                            총 투자금 · 총 평가금
                        </p>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
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

                    {/* 계좌별 신규 투자금 스택 차트 */}
                    {newInvestmentData.some((d) => d["신규 투자금"] > 0) && (
                        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                계좌별 신규 투자금
                            </p>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={newInvestmentData.map((d) => {
                                            const rec = d as Record<string, number | string>;
                                            const result: Record<string, number | string> = {
                                                period: d.period,
                                                "미국 직투": (rec["US_DIRECT"] as number) || 0,
                                                "ISA": (rec["ISA"] as number) || 0,
                                                "일본 직투": (rec["JP_DIRECT"] as number) || 0,
                                            };
                                            // 분기별 리포트의 경우에만 현금 표시
                                            if (activeTab === "quarterly") {
                                                result["현금"] = (rec["CASH"] as number) || 0;
                                            }
                                            return result;
                                        })}
                                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                        barGap={4}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={krwShort} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={52} />
                                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                                        <Legend wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
                                        <Bar dataKey="미국 직투" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="ISA" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="일본 직투" stackId="a" fill="#F59E0B" radius={activeTab === "monthly" ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={40} />
                                        {activeTab === "quarterly" && (
                                            <Bar dataKey="현금" stackId="a" fill="#6B7280" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        )}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Two charts side by side: 누적 수익금 + 수익률 (LineChart with gradient fill) */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* 누적 수익금 */}
                        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                누적 수익금
                            </p>
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
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

                        {/* 수익률 */}
                        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                수익률 (%)
                            </p>
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
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
                                            formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, "수익률"]}
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
                </div>
            )}

            {/* Portfolio Composition — based on latest quarterly report */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">포트폴리오 구성</h2>
                        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
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
                            className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
                        >
                            리포트 보기 →
                        </Link>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* 종목별 비중 도넛 */}
                    <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="mb-4 flex items-start justify-between">
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

                    {/* 섹터별 비중 도넛 */}
                    <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                섹터별 비중
                            </p>
                            <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                                Sector Allocation · 호버 시 보유 종목 표시
                            </p>
                        </div>
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
    );
}
