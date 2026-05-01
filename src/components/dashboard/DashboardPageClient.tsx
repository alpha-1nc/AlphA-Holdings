"use client";

import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
    Area,
    ComposedChart,
    LineChart,
    Line,
} from "recharts";
import { Home } from "lucide-react";
import { getReportsByProfilePublished } from "@/app/actions/reports";
import { getPortfolioStrategies } from "@/app/actions/strategy";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import type { WorkspaceProfile } from "@/lib/profile";
import {
    computeRoleAllocation,
    computeTickerDeviationsByAccountGroups,
    isCashLikePortfolioItem,
    type RoleAllocationItem,
    type TickerDeviationItem,
} from "@/lib/role-allocation";
import {
    ACCOUNT_GROUPS,
    ACCOUNT_TYPE_LABEL,
    type AccountGroupKey,
    accountTypesForDashboardGroup,
    portfolioItemsForDashboardGroup,
    type DashboardAccountGroupFilter,
} from "@/lib/accountGroups";
import {
    getDashboardInvestmentNewInflows,
    getDashboardQuarterlyMetrics,
    type QuarterlyDashboardSeriesPoint,
} from "@/app/actions/dashboard";
import { AiBriefingBanner } from "@/components/dashboard/AiBriefingBanner";
import { PageMainTitle } from "@/components/layout/page-main-title";
import { useIsMobileLayout } from "@/hooks/use-is-mobile-layout";
import { DashboardSummaryStatCard } from "@/components/ui/dashboard-summary-stat-card";
import { MiniChart } from "@/components/ui/mini-chart";
import { cn } from "@/lib/utils";
import type { Report, PortfolioItem, NewInvestment, PortfolioStrategy } from "@/generated/prisma";
type ReportWithItems = Report & { 
    portfolioItems: PortfolioItem[];
    newInvestments?: NewInvestment[];
};

const GROUP_DEVIATION_TITLES: Record<AccountGroupKey, string> = {
    직투: "직투",
    ISA: "ISA",
    연금저축: "연금저축",
};
const DEVIATION_GROUP_ORDER: AccountGroupKey[] = ["직투", "ISA", "연금저축"];

function DeviationDivergingBar({ data, groupTitle }: { data: TickerDeviationItem[]; groupTitle: string }) {
    if (!data.length) return null;

    const maxAbs = Math.max(
        ...data.map((d) => Math.abs(d.diff)),
        10,
    );

    return (
        <div>
            <p
                className="mb-3 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--ah-text-subtle)" }}
            >
                {groupTitle}
            </p>

            <div className="mb-2 flex items-center text-xs" style={{ color: "var(--ah-text-subtle)" }}>
                <span className="w-28 shrink-0" />
                <div className="flex flex-1 items-center justify-between px-1">
                    <span>← 부족</span>
                    <span className="font-medium" style={{ color: "var(--ah-text-muted)" }}>
                        목표 기준
                    </span>
                    <span>초과 →</span>
                </div>
                <span className="w-20 shrink-0" />
            </div>

            <div className="space-y-2">
                {data.map((item, i) => {
                    const diff = item.diff;
                    const absD = Math.abs(diff);
                    const isOver = diff > 0;
                    const isNormal = absD < 5;
                    const pct = Math.min((absD / maxAbs) * 50, 50);

                    /** 상단 요약 카드 스파크와 동일: --dashboard-spark-success / --dashboard-spark-negative */
                    const barColor = isNormal
                        ? "var(--ah-text-muted)"
                        : isOver
                          ? "var(--dashboard-spark-success)"
                          : "var(--dashboard-spark-negative)";

                    const badgeClass = isNormal
                        ? "bg-[var(--neutral-soft)] text-[var(--neutral-state)]"
                        : isOver
                          ? "bg-[var(--positive-soft)] text-[var(--positive)]"
                          : "bg-[var(--negative-soft)] text-[var(--negative)]";

                    const badgeLabel = isNormal ? "정상" : isOver ? `+${Math.round(diff)}%` : `${Math.round(diff)}%`;

                    return (
                        <div
                            key={`${item.ticker}-${i}`}
                            className="group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors duration-150"
                            style={{ "--hover-bg": "var(--ah-card-soft)" } as CSSProperties}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "var(--ah-card-soft)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                            }}
                        >
                            <div className="flex w-28 shrink-0 items-center gap-1.5 min-w-0">
                                <span className="truncate text-sm font-semibold" style={{ color: "var(--ah-text-pri)" }}>
                                    {item.displayLabel}
                                </span>
                                {item.accountType && (
                                    <span
                                        className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium"
                                        style={{
                                            background: "var(--ah-card-soft)",
                                            color: "var(--ah-text-subtle)",
                                        }}
                                    >
                                        {ACCOUNT_TYPE_LABEL[item.accountType]}
                                    </span>
                                )}
                            </div>

                            <div className="relative flex flex-1 items-center">
                                <div
                                    className="relative h-4 w-full rounded-full overflow-hidden"
                                    style={{ background: "var(--ah-card-soft)" }}
                                >
                                    {!isOver && (
                                        <div
                                            className="absolute inset-y-0 right-1/2 transition-all duration-700 ease-out"
                                            style={{
                                                width: `${pct}%`,
                                                background: barColor,
                                                opacity: 0.7,
                                                borderRadius: "9999px 0 0 9999px",
                                            }}
                                        />
                                    )}

                                    {isOver && (
                                        <div
                                            className="absolute inset-y-0 left-1/2 transition-all duration-700 ease-out"
                                            style={{
                                                width: `${pct}%`,
                                                background: barColor,
                                                opacity: 0.85,
                                                borderRadius: "0 9999px 9999px 0",
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                                    <span
                                        className="rounded-md px-2 py-0.5 text-xs font-medium shadow-sm"
                                        style={{
                                            background: "var(--ah-card)",
                                            color: "var(--ah-text-muted)",
                                            border: "1px solid var(--ah-border)",
                                        }}
                                    >
                                        {Math.round(item.actualWeight)}% → {Math.round(item.targetWeight)}%
                                    </span>
                                </div>
                            </div>

                            <div className="w-20 shrink-0 flex justify-end">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${badgeClass}`}>
                                    {badgeLabel}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Formatters ──────────────────────────────────────────────────────────*/
const krwFmt = (n: number) =>
    new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

/** 상단 요약 카드 금액용 — ₩8.90M · ₩890k */
function krwFmtKm(absKrw: number): string {
    const abs = Math.abs(absKrw);
    if (!Number.isFinite(abs)) return "—";
    if (abs >= 1_000_000) {
        const m = abs / 1_000_000;
        return `₩${m >= 10 ? m.toFixed(1) : m.toFixed(2)}M`;
    }
    if (abs >= 1_000) {
        const k = abs / 1_000;
        return `₩${k >= 100 ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return `₩${Math.round(abs).toLocaleString("ko-KR")}`;
}

function krwFmtKmSigned(n: number): string {
    const sign = n >= 0 ? "+" : "-";
    return `${sign}${krwFmtKm(Math.abs(n))}`;
}

const krwShort = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
    if (abs >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
    return String(n);
};

/** 투자/수익금 ComposedChart·LineChart 공통 툴팁 */
function CustomBarTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{
        name?: string;
        value?: unknown;
        color?: string;
        dataKey?: string | number;
    }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    const seen = new Set<string | number>();
    const rows = payload.filter((p) => {
        const k = p.dataKey ?? p.name ?? "";
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
    return (
        <div
            className="rounded-xl px-3 py-2 shadow-lg"
            style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--ah-border)",
                background: "var(--ah-card)",
            }}
        >
            {label != null && label !== "" && (
                <p className="mb-1.5 text-xs" style={{ color: "var(--ah-text-muted)" }}>
                    기준 분기 ·{" "}
                    <span className="font-medium" style={{ color: "var(--ah-text-pri)" }}>
                        {String(label)}
                    </span>
                </p>
            )}
            <div className="space-y-1">
                {rows.map((p, i) => {
                    const v = p.value;
                    const num = typeof v === "number" ? v : Number(v);
                    const display = Number.isNaN(num) ? "—" : krwFmt(num);
                    return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            <span
                                className="h-2 w-2 shrink-0 rounded-sm"
                                style={{ background: p.color ?? "var(--neutral-state)" }}
                            />
                            <span style={{ color: "var(--ah-text-muted)" }}>{p.name}</span>
                            <span
                                className="ml-auto font-medium tabular-nums"
                                style={{ color: "var(--ah-text-pri)" }}
                            >
                                {display}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface AssetTrendChartProps {
    series: QuarterlyDashboardSeriesPoint[];
    isMobileLayout: boolean;
}

function AssetTrendChart({ series, isMobileLayout }: AssetTrendChartProps) {
    const [chartTab, setChartTab] = useState<"value" | "profit" | "return">("value");
    const [isDark, setIsDark] = useState(false);
    const sparkUid = useId().replace(/:/g, "");
    const sparkFillGradId = `assetTrendSpark-fill-${sparkUid}`;


    useEffect(() => {
        const update = () => setIsDark(document.documentElement.classList.contains("dark"));
        update();
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const tabs = [
        { key: "value" as const, label: "자산 추이", description: "투자금 vs 평가금" },
        { key: "profit" as const, label: "누적 수익금", description: "각 분기 말 시점 누적" },
        { key: "return" as const, label: "누적 수익률", description: "각 분기 말 시점 누적" },
    ];

    const barData = useMemo(
        () =>
            series.map((row) => ({
                period: row.periodLabel,
                "총 투자금": row.totalInvested,
                "총 평가금": row.totalCurrent,
                totalInvested: row.totalInvested,
                totalCurrent: row.totalCurrent,
                수익금: row.profit,
            })),
        [series],
    );

    const returnData = useMemo(
        () =>
            series.map((row) => ({
                period: row.periodLabel,
                "수익률(%)": row.returnRate,
            })),
        [series],
    );

    /**
     * 자산 추이: 마지막 분기 기준 총 평가금 vs 총 투자금 → 초록/주황
     * (`--dashboard-spark-success` / `--dashboard-spark-negative`, 상단 요약 카드 스파크와 동일)
     * 수익/수익률 탭: 각각 누적 수익금·수익률 부호 기준
     */
    const sparkPositive = useMemo(() => {
        const last = series[series.length - 1];
        if (!last) return true;
        if (chartTab === "value") {
            return last.totalCurrent >= last.totalInvested;
        }
        if (chartTab === "return") return last.returnRate >= 0;
        return last.profit >= 0;
    }, [series, chartTab]);

    const currentTab = tabs.find((t) => t.key === chartTab) ?? tabs[0];
    const chartBottom = isMobileLayout ? 36 : 0;

    const gridStroke = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
    const tickFill = "var(--text-tertiary)";

    const sparkStrokeWrapper = cn(
        sparkPositive ? "[--spark-stroke:var(--dashboard-spark-success)]" : "[--spark-stroke:var(--dashboard-spark-negative)]",
    );

    return (
        <div className="rounded-2xl border border-[var(--ah-border)] bg-[var(--ah-card)] p-5 shadow-sm transition-all duration-300 hover:shadow-md md:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-base font-bold" style={{ color: "var(--ah-text-pri)" }}>
                        {currentTab.label}
                    </h3>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--ah-text-subtle)" }}>
                        {currentTab.description}
                    </p>
                </div>

                <div
                    className="relative inline-flex w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-[var(--ah-border)] bg-[var(--ah-card)] p-1 shadow-sm md:w-auto md:overflow-visible"
                    role="tablist"
                    aria-label="차트 유형"
                >
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={chartTab === t.key}
                            onClick={() => setChartTab(t.key)}
                            className={[
                                "relative z-10 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300",
                                chartTab === t.key
                                    ? "bg-[var(--ah-accent)] text-[var(--ah-accent-fg)] shadow-sm"
                                    : "text-[var(--ah-text-muted)] hover:text-[var(--ah-text-pri)]",
                            ].join(" ")}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={cn("h-64 w-full md:h-72", sparkStrokeWrapper)}>
                {chartTab === "value" && (
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <ComposedChart
                            data={barData}
                            margin={{ top: 8, right: 8, left: 0, bottom: chartBottom }}
                        >
                            <defs>
                                <linearGradient id={sparkFillGradId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--spark-stroke)" stopOpacity={0.42} />
                                    <stop offset="100%" stopColor="var(--spark-stroke)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                            <XAxis
                                dataKey="period"
                                tick={{ fontSize: isMobileLayout ? 9 : 11, fill: tickFill }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={krwShort}
                                tick={{ fontSize: isMobileLayout ? 9 : 11, fill: tickFill }}
                                axisLine={false}
                                tickLine={false}
                                width={isMobileLayout ? 44 : 52}
                            />
                            <Tooltip
                                content={<CustomBarTooltip />}
                                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                            />
                            <Bar
                                dataKey="totalInvested"
                                name="총 투자금"
                                fill="var(--primary)"
                                fillOpacity={0.88}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                            />
                            <Area
                                type="natural"
                                dataKey="totalCurrent"
                                name="총 평가금"
                                stroke="var(--spark-stroke)"
                                strokeWidth={3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill={`url(#${sparkFillGradId})`}
                                dot={{ fill: "var(--spark-stroke)", strokeWidth: 0, r: 3 }}
                                activeDot={{ r: 4 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}

                {chartTab === "profit" && (
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <LineChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: chartBottom }}>
                            <defs>
                                <linearGradient id={sparkFillGradId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--spark-stroke)" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="var(--spark-stroke)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                            <XAxis
                                dataKey="period"
                                tick={{ fontSize: isMobileLayout ? 9 : 11, fill: tickFill }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={krwShort}
                                tick={{ fontSize: isMobileLayout ? 9 : 11, fill: tickFill }}
                                axisLine={false}
                                tickLine={false}
                                width={isMobileLayout ? 44 : 52}
                            />
                            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                            <Area
                                type="natural"
                                dataKey="수익금"
                                stroke="none"
                                fill={`url(#${sparkFillGradId})`}
                            />
                            <Line
                                type="natural"
                                dataKey="수익금"
                                stroke="var(--spark-stroke)"
                                strokeWidth={3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                dot={{ fill: "var(--spark-stroke)", strokeWidth: 0, r: 3 }}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}

                {chartTab === "return" && (
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <LineChart data={returnData} margin={{ top: 8, right: 8, left: 0, bottom: chartBottom }}>
                            <defs>
                                <linearGradient id={sparkFillGradId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--spark-stroke)" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="var(--spark-stroke)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                            <XAxis
                                dataKey="period"
                                tick={{ fontSize: isMobileLayout ? 9 : 11, fill: tickFill }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={(v) => String(Math.round(Number(v)))}
                                tick={{ fontSize: isMobileLayout ? 9 : 11, fill: tickFill }}
                                axisLine={false}
                                tickLine={false}
                                width={40}
                                unit="%"
                            />
                            <Tooltip
                                formatter={(v: unknown) => [`${Math.round(v as number)}%`, "누적 수익률"]}
                                contentStyle={{
                                    borderRadius: 12,
                                    fontSize: 12,
                                    border: "1px solid var(--ah-border)",
                                    background: "var(--ah-card)",
                                    color: "var(--ah-text-pri)",
                                }}
                                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                            />
                            <Area
                                type="natural"
                                dataKey="수익률(%)"
                                stroke="none"
                                fill={`url(#${sparkFillGradId})`}
                            />
                            <Line
                                type="natural"
                                dataKey="수익률(%)"
                                stroke="var(--spark-stroke)"
                                strokeWidth={3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                dot={{ fill: "var(--spark-stroke)", strokeWidth: 0, r: 3 }}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

/** 선택한 계좌 필터 범위 — 표시명 기준 합산 비중 도넛 */
function PortfolioWeightDonut({
    segments,
    group,
}: {
    segments: { name: string; weight: number }[];
    group: DashboardAccountGroupFilter;
}) {
    const data = segments
        .filter((s) => s.weight > 0)
        .map((s, i) => ({
            ...s,
            fill: `var(--donut-${(i % 8) + 1})`,
        }));

    return (
        <div className="h-full rounded-2xl border border-[var(--ah-border)] bg-[var(--ah-card)] p-5 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold" style={{ color: "var(--ah-text-pri)" }}>
                    포트폴리오 비중
                </p>
                <p className="text-xs" style={{ color: "var(--ah-text-subtle)" }}>
                    {PORTFOLIO_DONUT_SCOPE_SUBTITLE[group]}
                </p>
            </div>

            {data.length === 0 ? (
                <p className="mt-8 py-10 text-center text-sm" style={{ color: "var(--ah-text-muted)" }}>
                    표시할 보유 종목이 없습니다
                </p>
            ) : (
                <>
                    <div className="mt-4 h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="weight"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={75}
                                    paddingAngle={2}
                                    cornerRadius={6}
                                    strokeWidth={0}
                                    isAnimationActive
                                    animationDuration={700}
                                >
                                    {data.map((d, i) => (
                                        <Cell key={`${d.name}-${i}`} fill={d.fill} />
                                    ))}
                                </Pie>
                                <Tooltip content={<DonutWeightTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 max-h-40 space-y-2 overflow-y-auto pr-1">
                        {data.map((d) => (
                            <div key={d.name} className="flex items-center justify-between">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ background: d.fill }}
                                    />
                                    <span
                                        className="truncate text-sm font-medium"
                                        style={{ color: "var(--ah-text-pri)" }}
                                    >
                                        {d.name}
                                    </span>
                                </div>
                                <span
                                    className="shrink-0 text-sm font-semibold tabular-nums"
                                    style={{ color: "var(--ah-text-pri)" }}
                                >
                                    {Math.round(d.weight)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function parseGroupParam(raw: string | null): DashboardAccountGroupFilter {
    if (!raw || raw === "전체") return "all";
    if (raw === "직투" || raw === "ISA" || raw === "연금저축") return raw;
    return "all";
}

const GROUP_QUERY_VALUE: Record<DashboardAccountGroupFilter, string | null> = {
    all: null,
    직투: "직투",
    ISA: "ISA",
    연금저축: "연금저축",
};

/** 포트폴리오 비중 도넛 — 계좌 필터 부제 */
const PORTFOLIO_DONUT_SCOPE_SUBTITLE: Record<DashboardAccountGroupFilter, string> = {
    all: "전 계좌 · 현재 자산 기준",
    직투: "직투 · 현재 자산 기준",
    ISA: "ISA · 현재 자산 기준",
    연금저축: "연금저축 · 현재 자산 기준",
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
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-95"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                새 리포트 작성
            </Link>
        </div>
    );
}

function QuarterlyEmptyState() {
    return (
        <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M3 21h18M3 10.5l9-7.5 9 7.5" />
                </svg>
            </div>
            <div>
                <p className="text-base font-semibold text-neutral-700 dark:text-neutral-200">분기별 리포트가 없습니다.</p>
                <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">대시보드는 분기별 리포트를 기준으로 표시됩니다. 분기 리포트를 작성해 주세요.</p>
            </div>
            <Link
                href="/reports/new/quarterly"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-95"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                분기별 리포트 작성
            </Link>
        </div>
    );
}

/* ── 포트폴리오·섹터 도넛 공통 툴팁 (종목/섹터명 + 비중 %) ───────────────*/
function DonutWeightTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number }>;
}) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const label = item.name ?? "";
    const pct = typeof item.value === "number" ? item.value : 0;
    return (
        <div
            className="rounded-lg px-3 py-2 shadow-lg"
            style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--ah-border)",
                background: "var(--ah-card)",
            }}
        >
            <p className="text-xs font-medium" style={{ color: "var(--ah-text-pri)" }}>
                {label}
            </p>
            <p className="text-xs tabular-nums" style={{ color: "var(--ah-text-muted)" }}>
                {Math.round(pct)}%
            </p>
        </div>
    );
}

function DistributionAnalysisCard({
    roleData,
    sectorData,
}: {
    roleData: { role: string; weight: number }[];
    sectorData: { name: string; weight: number }[];
}) {
    const [activeTab, setActiveTab] = useState<"role" | "sector">("role");

    const ROLE_COLORS: Record<string, string> = {
        코어: "var(--role-alloc-core)",
        성장: "var(--role-alloc-growth)",
        방어: "var(--role-alloc-defensive)",
        부스터: "var(--role-alloc-booster)",
        지수: "var(--role-alloc-index)",
        채권: "var(--role-alloc-bond)",
        미지정: "var(--role-alloc-unassigned)",
        기타: "var(--neutral-state)",
    };

    const SECTOR_COLORS = [
        "var(--donut-1)",
        "var(--donut-2)",
        "var(--donut-3)",
        "var(--donut-4)",
        "var(--donut-5)",
        "var(--ah-text-subtle)",
    ];

    const activeData =
        activeTab === "role"
            ? roleData.map((d) => ({
                  name: d.role,
                  value: d.weight,
                  color: ROLE_COLORS[d.role] ?? "var(--ah-text-subtle)",
              }))
            : sectorData.map((d, i) => ({
                  name: d.name,
                  value: d.weight,
                  color: SECTOR_COLORS[i % SECTOR_COLORS.length],
              }));

    return (
        <div
            className="flex h-full flex-col rounded-2xl p-5 transition-all duration-300 hover:shadow-md"
            style={{ background: "var(--ah-card)", border: "1px solid var(--ah-border)" }}
        >
            <div className="mb-5 flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: "var(--ah-text-pri)" }}>
                    {activeTab === "role" ? "역할별 분산" : "섹터별 분산"}
                </h3>

                <div
                    className="relative inline-flex w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-[var(--ah-border)] bg-[var(--ah-card)] p-1 shadow-sm md:w-auto md:overflow-visible"
                    role="tablist"
                    aria-label="역할·섹터 보기"
                >
                    {(["role", "sector"] as const).map((tab) => {
                        const selected = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => setActiveTab(tab)}
                                className={[
                                    "relative z-10 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300",
                                    selected
                                        ? "bg-[var(--ah-accent)] text-[var(--ah-accent-fg)] shadow-sm"
                                        : "text-[var(--ah-text-muted)] hover:text-[var(--ah-text-pri)]",
                                ].join(" ")}
                            >
                                {tab === "role" ? "역할" : "섹터"}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="relative mx-auto h-44 w-44">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <PieChart>
                        <Pie
                            key={activeTab}
                            data={activeData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={78}
                            paddingAngle={3}
                            cornerRadius={6}
                            strokeWidth={0}
                            isAnimationActive
                            animationDuration={500}
                            animationBegin={0}
                        >
                            {activeData.map((d, i) => (
                                <Cell key={`${d.name}-${i}`} fill={d.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0];
                                return (
                                    <div
                                        className="rounded-lg px-3 py-2 text-xs shadow-lg"
                                        style={{
                                            background: "var(--ah-card)",
                                            border: "1px solid var(--ah-border)",
                                            color: "var(--ah-text-pri)",
                                        }}
                                    >
                                        <p className="font-semibold">{d.name}</p>
                                        <p style={{ color: "var(--ah-text-muted)" }}>
                                            {Math.round(d.value as number)}%
                                        </p>
                                    </div>
                                );
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-xs" style={{ color: "var(--ah-text-subtle)" }}>
                            {activeData.length}개
                        </p>
                        <p className="text-sm font-bold" style={{ color: "var(--ah-text-pri)" }}>
                            {activeTab === "role" ? "역할" : "섹터"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-5 flex-1 space-y-2">
                {activeData.map((d, i) => (
                    <div
                        key={`${d.name}-${i}`}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors duration-150"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--ah-card-soft)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                        }}
                    >
                        <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                            <span className="text-sm" style={{ color: "var(--ah-text-pri)" }}>
                                {d.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-16 overflow-hidden rounded-full" style={{ background: "var(--ah-card-soft)" }}>
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${Math.min(d.value, 100)}%`,
                                        background: d.color,
                                        opacity: 0.8,
                                    }}
                                />
                            </div>
                            <span
                                className="w-10 text-right text-sm font-semibold tabular-nums"
                                style={{ color: "var(--ah-text-pri)" }}
                            >
                                {Math.round(d.value)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function UnifiedPortfolioCard({
    group,
    latestQuarterly,
    roleAllocationData,
}: {
    group: DashboardAccountGroupFilter;
    latestQuarterly: ReportWithItems | undefined;
    roleAllocationData: RoleAllocationItem[];
}) {
    return (
        <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--ah-border)] bg-[var(--ah-card)] p-5 shadow-sm transition-all duration-300 hover:shadow-md">
            <DistributionAnalysisCard
                roleData={roleAllocationData.map((d) => ({
                    role: d.label ?? String(d.role ?? ""),
                    weight: d.actualWeight,
                }))}
                sectorData={(() => {
                    if (!latestQuarterly) return [];
                    const types = accountTypesForDashboardGroup(group);
                    const scoped = latestQuarterly.portfolioItems.filter(
                        (i) =>
                            types.includes(i.accountType) &&
                            i.accountType !== "CASH" &&
                            i.krwAmount > 0 &&
                            !isCashLikePortfolioItem(i),
                    );
                    const totalExCash = scoped.reduce((s, i) => s + i.krwAmount, 0);
                    const sectorMap = new Map<string, number>();
                    scoped.forEach((item) => {
                        const sector = (item.sector as string | null) || "기타";
                        sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + item.krwAmount);
                    });
                    return Array.from(sectorMap.entries())
                        .map(([name, value]) => ({
                            name,
                            weight: totalExCash > 0 ? (value / totalExCash) * 100 : 0,
                        }))
                        .sort((a, b) => b.weight - a.weight)
                        .slice(0, 6);
                })()}
            />
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Dashboard
══════════════════════════════════════════════════════════════════════════ */
export function DashboardPageClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isMobileLayout = useIsMobileLayout();

    const [profileId, setProfileId] = useState<string>("alpha-ceo");
    const [reports, setReports] = useState<ReportWithItems[]>([]);
    const [strategies, setStrategies] = useState<PortfolioStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getDashboardQuarterlyMetrics>> | null>(null);
    const [investmentNewFlows, setInvestmentNewFlows] = useState<
        Awaited<ReturnType<typeof getDashboardInvestmentNewInflows>> | null
    >(null);

    const group = useMemo(
        () => parseGroupParam(searchParams.get("group")),
        [searchParams],
    );

    const setGroup = useCallback(
        (next: DashboardAccountGroupFilter) => {
            const params = new URLSearchParams(searchParams.toString());
            const q = GROUP_QUERY_VALUE[next];
            if (q == null) params.delete("group");
            else params.set("group", q);
            const qs = params.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname);
        },
        [pathname, router, searchParams],
    );

    const monthlyNewInvBarData = useMemo(() => {
        const bars = investmentNewFlows?.monthlyBars ?? [];
        return bars.map((m) => ({
            period: m.periodLabel,
            "신규 투자금(합계)": m.amountKrw,
        }));
    }, [investmentNewFlows]);

    const quarterlyReports = useMemo(
        () => [...reports].filter((r) => r.type === "QUARTERLY").reverse(),
        [reports],
    );
    const latestQuarterly =
        quarterlyReports.length > 0 ? quarterlyReports[quarterlyReports.length - 1] : undefined;

    /** 선택 계좌 필터에 포함된 종목만 표시명 기준 합산 (현금 행 제외) */
    const consolidatedHoldings = useMemo(() => {
        if (!latestQuarterly) return [];
        const scoped = portfolioItemsForDashboardGroup(latestQuarterly.portfolioItems, group).filter(
            (i) => i.accountType !== "CASH" && i.krwAmount > 0,
        );
        const byName = new Map<string, number>();
        for (const i of scoped) {
            const name = getPortfolioItemDisplayLabel({ ticker: i.ticker, displayName: i.displayName });
            byName.set(name, (byName.get(name) ?? 0) + i.krwAmount);
        }
        const totalKrw = [...byName.values()].reduce((s, v) => s + v, 0);
        return [...byName.entries()]
            .map(([name, krw]) => ({
                name,
                krw,
                weight: totalKrw > 0 ? (krw / totalKrw) * 100 : 0,
            }))
            .sort((a, b) => b.krw - a.krw);
    }, [latestQuarterly, group]);

    const visibleDeviationGroups = useMemo((): AccountGroupKey[] => {
        if (group === "all") return DEVIATION_GROUP_ORDER;
        return [group];
    }, [group]);

    const deviationByGroup = useMemo(() => {
        const itemsForDeviation =
            latestQuarterly == null
                ? null
                : group === "all"
                  ? latestQuarterly.portfolioItems
                  : portfolioItemsForDashboardGroup(latestQuarterly.portfolioItems, group);
        if (itemsForDeviation == null || strategies.length === 0) return null;
        return computeTickerDeviationsByAccountGroups(itemsForDeviation, strategies);
    }, [latestQuarterly, strategies, group]);

    const allDeviations = useMemo(() => {
        if (!deviationByGroup) return [];
        return visibleDeviationGroups.flatMap((k) => deviationByGroup[k] ?? []);
    }, [deviationByGroup, visibleDeviationGroups]);

    const { normalCount, overCount, underCount } = useMemo(() => {
        const normal = allDeviations.filter((d) => Math.abs(d.diff) < 5).length;
        const over = allDeviations.filter((d) => d.diff >= 5).length;
        const under = allDeviations.filter((d) => d.diff <= -5).length;
        return { normalCount: normal, overCount: over, underCount: under };
    }, [allDeviations]);

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

    useEffect(() => {
        if (!profileId) return;
        const profileLabel = getProfileLabel(profileId as "alpha-ceo" | "partner");
        setMetricsLoading(true);
        getDashboardQuarterlyMetrics(profileLabel, group)
            .then(setMetrics)
            .finally(() => setMetricsLoading(false));
    }, [profileId, group]);

    useEffect(() => {
        if (!profileId) return;
        const profileLabel = getProfileLabel(profileId as "alpha-ceo" | "partner");
        const calendarYear = new Date().getFullYear();
        void getDashboardInvestmentNewInflows(
            profileLabel,
            calendarYear,
            group === "all" ? undefined : accountTypesForDashboardGroup(group),
        ).then(setInvestmentNewFlows);
    }, [profileId, group]);

    if (loading) {
        return (
            <div className="p-0">
                <div className="mb-6 md:mb-8">
                    <div className="h-7 w-48 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-2 h-4 w-72 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-700" />
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                    {[...Array(2)].map((_, col) => (
                        <div key={col} className="flex flex-col gap-2 md:gap-3">
                            {[...Array(2)].map((_, row) => (
                                <div
                                    key={`${col}-${row}`}
                                    className="h-40 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800"
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (reports.length === 0) return <EmptyState />;

    if (quarterlyReports.length === 0) return <QuarterlyEmptyState />;

    const summary = metrics?.summary;
    const invested = summary?.totalInvested ?? 0;
    const current = summary?.totalCurrent ?? 0;
    const hasSummaryTotals = summary != null && !metricsLoading;
    const profit = summary != null ? summary.profit : 0;
    const returnRate = summary != null ? summary.returnRate : 0;
    const isPositive = profit >= 0;
    const profitSign = isPositive ? "+" : "";

    const series = metrics?.series ?? [];

    const investedHist = series.map((r) => r.totalInvested);
    const currentHist = series.map((r) => r.totalCurrent);
    const profitHist = series.map((r) => r.profit);
    const returnHist = series.map((r) => r.returnRate);

    let deltaInvested = 0;
    let deltaCurrent = 0;
    let deltaProfit = 0;
    let deltaReturnPoints = 0;
    if (series.length >= 2) {
        const last = series[series.length - 1];
        const prev = series[series.length - 2];
        deltaInvested =
            prev.totalInvested !== 0
                ? ((last.totalInvested - prev.totalInvested) / prev.totalInvested) * 100
                : last.totalInvested !== 0
                  ? 100
                  : 0;
        deltaCurrent =
            prev.totalCurrent !== 0
                ? ((last.totalCurrent - prev.totalCurrent) / prev.totalCurrent) * 100
                : last.totalCurrent !== 0
                  ? 100
                  : 0;
        const absPrevProfit = Math.abs(prev.profit);
        deltaProfit =
            absPrevProfit > 1e-9
                ? ((last.profit - prev.profit) / absPrevProfit) * 100
                : last.profit !== prev.profit
                  ? last.profit > prev.profit
                      ? 100
                      : -100
                  : 0;
        deltaReturnPoints = last.returnRate - prev.returnRate;
    }

    const summaryPeriodCaption =
        hasSummaryTotals && summary
            ? `기준: ${summary.periodLabel}`
            : metricsLoading
              ? "불러오는 중…"
              : "분기별 리포트 없음";
    const calendarYear = new Date().getFullYear();
    const flowBars = investmentNewFlows?.monthlyBars ?? [];
    const latestFlowBar =
        flowBars.length > 0 ? flowBars[flowBars.length - 1] : null;

    const itemsScopedForRole = latestQuarterly
        ? portfolioItemsForDashboardGroup(latestQuarterly.portfolioItems, group)
        : [];

    const roleAllocationData = latestQuarterly
        ? computeRoleAllocation(itemsScopedForRole)
        : [];

    const groupHasHoldings = (key: AccountGroupKey) => {
        if (!latestQuarterly) return false;
        const types = ACCOUNT_GROUPS[key];
        return latestQuarterly.portfolioItems.some(
            (i) =>
                i.accountType !== "CASH" &&
                i.krwAmount > 0 &&
                (types as readonly (typeof i.accountType)[]).includes(i.accountType),
        );
    };

    /** ISA·연금저축: 역할/섹터 분산 카드 생략, 비중 도넛은 아래 '포트폴리오 구성' 좌측으로 이동, 추이 차트는 전폭 */
    const portfolioDonutBesideTrendChart = group !== "ISA" && group !== "연금저축";
    const portfolioDonutSegments = consolidatedHoldings.map(({ name, weight }) => ({ name, weight }));

    const qoqDeltaBadge = series.length >= 2;

    return (
        <div className="w-full max-w-[100vw] space-y-8 overflow-hidden bg-[var(--ah-bg)] p-0">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <PageMainTitle icon={Home}>Dashboard</PageMainTitle>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${profileId === "alpha-ceo"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                        }`}>
                        {getProfileLabel(profileId as "alpha-ceo" | "partner")}
                    </span>
                </div>
                <div
                    className="relative inline-flex w-full md:w-auto flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-[var(--ah-border)] bg-[var(--ah-card)] p-1 shadow-sm md:overflow-visible"
                    role="tablist"
                    aria-label="계좌 필터"
                >
                    {(
                        [
                            ["전체", "all"],
                            ["직투", "직투"],
                            ["ISA", "ISA"],
                            ["연금저축", "연금저축"],
                        ] as const
                    ).map(([label, key]) => {
                        const selected =
                            key === "all" ? group === "all" : group === key;
                        return (
                            <button
                                key={label}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() =>
                                    setGroup(key === "all" ? "all" : (key as AccountGroupKey))
                                }
                                className={[
                                    "relative z-10 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300",
                                    selected
                                        ? "bg-[var(--ah-accent)] text-[var(--ah-accent-fg)] shadow-sm"
                                        : "text-[var(--ah-text-muted)] hover:text-[var(--ah-text-pri)]",
                                ].join(" ")}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Summary — 좌: 투자금·평가금 / 우: 수익금·수익률 (기준 분기는 상단 한 줄만) */}
            <div className="space-y-1.5">
                <p className="text-end text-[11px] leading-snug text-[var(--ah-text-muted)]">
                    {summaryPeriodCaption}
                </p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                    <div className="flex flex-col gap-2 md:min-h-0 md:gap-3">
                        <DashboardSummaryStatCard
                            title="총 투자금"
                            value={hasSummaryTotals ? krwFmtKm(invested) : metricsLoading ? "…" : "—"}
                            delta={deltaInvested}
                            showDeltaBadge={qoqDeltaBadge}
                            trendData={investedHist}
                            isPositive={deltaInvested >= 0}
                        />
                        <DashboardSummaryStatCard
                            title="현재 총 평가금"
                            value={hasSummaryTotals ? krwFmtKm(current) : metricsLoading ? "…" : "—"}
                            delta={deltaCurrent}
                            showDeltaBadge={qoqDeltaBadge}
                            trendData={currentHist}
                            isPositive={deltaCurrent >= 0}
                        />
                    </div>
                    <div className="flex flex-col gap-2 md:min-h-0 md:gap-3">
                        <DashboardSummaryStatCard
                            title="누적 수익금"
                            value={hasSummaryTotals ? krwFmtKmSigned(profit) : metricsLoading ? "…" : "—"}
                            delta={deltaProfit}
                            showDeltaBadge={qoqDeltaBadge}
                            trendData={profitHist}
                            isPositive={profit >= 0}
                        />
                        <DashboardSummaryStatCard
                            title="누적 수익률"
                            value={hasSummaryTotals ? `${profitSign}${Math.round(returnRate)}%` : metricsLoading ? "…" : "—"}
                            delta={deltaReturnPoints}
                            deltaUnit="points"
                            showDeltaBadge={qoqDeltaBadge}
                            trendData={returnHist}
                            isPositive={returnRate >= 0}
                        />
                    </div>
                </div>
            </div>

            {/* AI 브리핑 배너 */}
            <AiBriefingBanner profileId={profileId as WorkspaceProfile} />

            {/* 기간별 투자 추이 — 분기별 리포트 기준 */}
            <div className="space-y-4 md:space-y-6">
                <h2 className="text-sm font-semibold" style={{ color: "var(--ah-text-pri)" }}>
                    기간별 투자 추이
                </h2>

                {metricsLoading ? (
                    <div className="h-[min(22rem,85vw)] animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
                ) : series.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-14 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                            표시할 분기별 리포트 데이터가 없습니다.
                        </p>
                        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                            분기별 리포트를 작성하면 추이 그래프가 나타납니다.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className={portfolioDonutBesideTrendChart ? "lg:col-span-2" : "lg:col-span-3"}>
                            <AssetTrendChart series={series} isMobileLayout={isMobileLayout} />
                        </div>
                        {portfolioDonutBesideTrendChart && (
                            <div className="lg:col-span-1">
                                <PortfolioWeightDonut group={group} segments={portfolioDonutSegments} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Portfolio Composition — based on latest quarterly report */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold" style={{ color: "var(--ah-text-pri)" }}>
                            포트폴리오 구성
                        </h2>
                        <p className="mt-0.5 break-words text-xs" style={{ color: "var(--ah-text-muted)" }}>
                            최신 분기별 리포트 기준
                            {latestQuarterly && (
                                <span className="ml-1 font-medium" style={{ color: "var(--ah-text-pri)" }}>
                                    ({latestQuarterly.periodLabel})
                                </span>
                            )}
                        </p>
                    </div>
                    {latestQuarterly && (
                        <Link
                            href={`/reports/${latestQuarterly.id}`}
                            className="shrink-0 text-xs text-[var(--ah-text-subtle)] transition-colors hover:text-[var(--ah-text-pri)]"
                        >
                            리포트 보기 →
                        </Link>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
                    {portfolioDonutBesideTrendChart ? (
                        <UnifiedPortfolioCard
                            group={group}
                            latestQuarterly={latestQuarterly}
                            roleAllocationData={roleAllocationData}
                        />
                    ) : (
                        <PortfolioWeightDonut group={group} segments={portfolioDonutSegments} />
                    )}

                    {/* 자산 요약과 동일 높이(stretch)·패딩 */}
                    <div className="flex h-full min-h-0 flex-col">
                        {!latestQuarterly ? (
                            <div
                                className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border px-5 py-10 text-center md:px-6"
                                style={{ background: "var(--ah-card)", borderColor: "var(--ah-border)", borderWidth: 1 }}
                            >
                                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                    분기별 리포트가 없습니다
                                </p>
                            </div>
                        ) : strategies.length === 0 ? (
                            <div
                                className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border px-5 py-10 text-center md:px-6"
                                style={{ background: "var(--ah-card)", borderColor: "var(--ah-border)", borderWidth: 1 }}
                            >
                                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                    포트폴리오 전략이 없어 목표 대비 괴리를 표시하지 않습니다.
                                </p>
                            </div>
                        ) : !visibleDeviationGroups.some((k) => groupHasHoldings(k)) ? (
                            <div
                                className="flex flex-1 flex-col items-center justify-center rounded-2xl border px-5 py-10 text-center md:px-6"
                                style={{ background: "var(--ah-card)", borderColor: "var(--ah-border)", borderWidth: 1 }}
                            >
                                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                    계좌 그룹별 보유 종목이 없어 괴리율을 표시하지 않습니다.
                                </p>
                            </div>
                        ) : (
                            <div
                                className="rounded-2xl p-5 md:p-6 transition-all duration-300 hover:shadow-md flex min-h-0 flex-1 flex-col overflow-y-auto"
                                style={{ background: "var(--ah-card)", border: "1px solid var(--ah-border)" }}
                            >
                                <div className="mb-6 flex flex-wrap items-start justify-between gap-3 shrink-0">
                                    <div>
                                        <h3 className="text-base font-bold" style={{ color: "var(--ah-text-pri)" }}>
                                            리밸런싱 인사이트
                                        </h3>
                                        <p className="mt-0.5 text-xs" style={{ color: "var(--ah-text-subtle)" }}>
                                            링 = 실제/목표 달성률 · 넘침 = 초과 · 호버 시 상세
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs">
                                        {[
                                            { label: "정상", count: normalCount, color: "var(--ah-text-muted)" },
                                            { label: "초과", count: overCount, color: "var(--dashboard-spark-success)" },
                                            { label: "부족", count: underCount, color: "var(--dashboard-spark-negative)" },
                                        ].map(({ label, count, color }) => (
                                            <div key={label} className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                                                <span style={{ color: "var(--ah-text-muted)" }}>
                                                    {label}{" "}
                                                    <span className="font-semibold" style={{ color: "var(--ah-text-pri)" }}>
                                                        {count}
                                                    </span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-5 h-px shrink-0" style={{ background: "var(--ah-border)" }} />

                                <div className="space-y-6 min-h-0">
                                    {visibleDeviationGroups.map((key) => {
                                        if (!groupHasHoldings(key)) return null;
                                        const data = deviationByGroup?.[key] ?? [];
                                        if (!data.length) return null;
                                        return (
                                            <DeviationDivergingBar
                                                key={key}
                                                data={data}
                                                groupTitle={GROUP_DEVIATION_TITLES[key]}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {investmentNewFlows !== null && (
                <div className="rounded-2xl border border-[var(--ah-border)] bg-[var(--ah-card)] p-5 shadow-sm transition-all duration-300 hover:shadow-md md:p-6">
                    <div>
                        <p
                            className="text-xs font-semibold uppercase tracking-widest"
                            style={{ color: "var(--ah-text-subtle)" }}
                        >
                            신규 납입
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "var(--ah-text-muted)" }}>
                            최근 납입액과 {calendarYear}년 연간 누적
                        </p>
                    </div>

                    {/* 데스크톱: 그리드 2행·2열로 좌 카드 높이(행1+간격+행2)와 우 막대 카드 높이를 픽셀 단위 동일하게 */}
                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:grid-rows-[auto_auto] lg:gap-x-6 lg:gap-y-3">
                        <div className="flex flex-col gap-3 lg:contents">
                            <div
                                className="flex min-w-0 flex-col justify-center rounded-xl border border-[var(--ah-border)] px-4 py-4 text-left lg:col-start-1 lg:row-start-1"
                                style={{ background: "var(--ah-card-soft)" }}
                            >
                                <span className="text-xs leading-tight" style={{ color: "var(--ah-text-muted)" }}>
                                    최근 ({latestFlowBar?.periodLabel ?? "—"})
                                </span>
                                <p
                                    className="mt-1 text-xl font-bold tabular-nums sm:text-2xl"
                                    style={{ color: "var(--ah-text-pri)" }}
                                >
                                    {krwFmt(latestFlowBar?.amountKrw ?? 0)}
                                </p>
                            </div>
                            <div
                                className="flex min-w-0 flex-col justify-center rounded-xl border border-[var(--ah-border)] px-4 py-4 text-left lg:col-start-1 lg:row-start-2"
                                style={{ background: "var(--ah-card-soft)" }}
                            >
                                <span className="text-xs leading-tight" style={{ color: "var(--ah-text-muted)" }}>
                                    {calendarYear}년 누적
                                </span>
                                <p
                                    className="mt-1 text-xl font-bold tabular-nums sm:text-2xl"
                                    style={{ color: "var(--ah-text-pri)" }}
                                >
                                    {krwFmt(investmentNewFlows.ytdSumKrw ?? 0)}
                                </p>
                            </div>
                        </div>

                        <div className="flex min-h-0 min-w-0 flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1">
                            <MiniChart
                                alignToFlowCards
                                className="min-h-0 flex-1"
                                data={monthlyNewInvBarData.map((m) => ({
                                    label: m.period,
                                    value: m["신규 투자금(합계)"],
                                }))}
                                valueFormatter={krwShort}
                                suffix={false}
                                title="월별 납입"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
