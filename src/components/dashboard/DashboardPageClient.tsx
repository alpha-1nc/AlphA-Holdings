"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getPortfolioStrategies } from "@/app/actions/strategy";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import type { WorkspaceProfile } from "@/lib/profile";
import {
    computeTickerDeviationsByAccountGroupsFromHoldings,
    portfolioTickerAccountKey,
} from "@/lib/role-allocation";
import {
    ACCOUNT_GROUPS,
    type AccountGroupKey,
    accountTypesForDashboardGroup,
    type DashboardAccountGroupFilter,
} from "@/lib/accountGroups";
import { getDashboardInvestmentNewInflows } from "@/app/actions/dashboard";
import { formatWeekChartLabel, formatWeeksAgoEn, getWeekMonday } from "@/lib/week-snapshot";
import {
    computeBrokerCostBasisMetrics,
    filterHoldingsByDashboardGroup,
} from "@/lib/profit";
import type { PortfolioStrategy, Holding, AccountType } from "@/generated/prisma";

import { DashboardHero } from "./DashboardHero";
import { AssetComposition } from "./AssetComposition";
import { RebalanceInsight } from "./RebalanceInsight";
import { DashboardSideMetrics } from "./DashboardSideMetrics";
import { DashboardStagger } from "./dashboard-stagger";
import { ContributionStatus } from "./ContributionStatus";
import type { RebalanceGroup } from "./RebalanceInsight";
import { PageContainer } from "@/components/layout/page-container";

const GROUP_DEVIATION_TITLES: Record<AccountGroupKey, string> = {
    직투: "직투",
    ISA: "ISA",
    연금저축: "연금저축",
};
const DEVIATION_GROUP_ORDER: AccountGroupKey[] = ["직투", "ISA", "연금저축"];

type RealtimeMetrics = {
    totalValueKrw: number;
    totalCostKrw: number;
    totalDepositsKrw: number;
    totalProfitKrw: number;
    totalProfitRate: number;
    dailyProfitKrw: number;
    lastSynced: string | null;
    byAccount: Record<string, { valueKrw: number; purchaseCostKrw: number; profitKrw: number }>;
    depositsByAccountType: Partial<Record<AccountType, number>>;
    holdingCount: number;
};

type SnapshotRow = {
    date: string;
    totalValueKrw: number;
    totalAssetKrw?: number | null;
    netCashFlowKrw: number | null;
    positions?: Array<{
        accountType: string;
        marketValueKrw: number;
        profitLoss?: number | null;
        profitLossKrw?: number | null;
        currency?: string;
        marketValue?: number;
    }> | null;
};

function weeklySnapshotsToTrendPoints(
    snapshots: SnapshotRow[],
    group: DashboardAccountGroupFilter,
): Array<{ name: string; value: number; tooltipLabel: string }> {
    const types = group === "all" ? null : accountTypesForDashboardGroup(group);
    return snapshots.map((snap) => {
        const allPositions = snap.positions && Array.isArray(snap.positions) ? snap.positions : [];
        const scopedPositions =
            types && allPositions.length > 0
                ? allPositions.filter((p) => types.includes(p.accountType as AccountType))
                : allPositions;

        let value =
            snap.totalAssetKrw != null && snap.totalAssetKrw > 0
                ? snap.totalAssetKrw
                : snap.totalValueKrw;

        if (scopedPositions.length > 0) {
            value = scopedPositions.reduce((s, p) => s + p.marketValueKrw, 0);
        } else if (types && group !== "all") {
            value = 0;
        }

        const weekStart = getWeekMonday(new Date(snap.date));
        return {
            name: formatWeekChartLabel(weekStart),
            value,
            tooltipLabel: formatWeeksAgoEn(weekStart),
        };
    });
}

function sumDepositsForGroup(
    depositsByAccountType: Partial<Record<AccountType, number>>,
    group: DashboardAccountGroupFilter,
): number {
    const types = accountTypesForDashboardGroup(group);
    return types.reduce((s, t) => s + (depositsByAccountType[t] ?? 0), 0);
}

function metricsFromHoldings(holdings: Holding[], group: DashboardAccountGroupFilter) {
    const scoped = filterHoldingsByDashboardGroup(holdings, group);
    const { totalValueKrw, totalProfitKrw, totalPurchaseCostKrw, totalProfitRate } =
        computeBrokerCostBasisMetrics(scoped);
    return {
        totalValueKrw,
        totalCostKrw: totalPurchaseCostKrw,
        totalProfitKrw,
        totalProfitRate,
    };
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
                href="/journal/new"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-95"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                새 일지 작성
            </Link>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Dashboard — 토스 감성 재설계 (데이터 흐름은 기존 유지)
══════════════════════════════════════════════════════════════════════════ */
export function DashboardPageClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [profileId, setProfileId] = useState<string>("alpha-ceo");
    const [strategies, setStrategies] = useState<PortfolioStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [realtimeLoading, setRealtimeLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [weeklySnapshots, setWeeklySnapshots] = useState<SnapshotRow[]>([]);
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

    const monthlyNewInvBars = useMemo(() => {
        const bars = investmentNewFlows?.monthlyBars ?? [];
        return bars.map((m) => ({ label: m.periodLabel, value: m.amountKrw }));
    }, [investmentNewFlows]);

    /** 선택 계좌 필터 + marketValueKrw 기준 종목 비중 (실시간 holdings) */
    const consolidatedHoldingsRealtime = useMemo(() => {
        const scoped = holdings.filter((h) => {
            if (h.marketValueKrw <= 0) return false;
            if (group === "all") return true;
            const types = accountTypesForDashboardGroup(group);
            return types.includes(h.accountType);
        });
        const byTicker = new Map<string, { name: string; krw: number }>();
        for (const h of scoped) {
            const ticker = h.ticker;
            const name = h.name ?? h.ticker;
            const prev = byTicker.get(ticker);
            if (prev) {
                prev.krw += h.marketValueKrw;
            } else {
                byTicker.set(ticker, { name, krw: h.marketValueKrw });
            }
        }
        const totalKrw = [...byTicker.values()].reduce((s, v) => s + v.krw, 0);
        return [...byTicker.entries()]
            .map(([ticker, { name, krw }]) => ({
                ticker,
                name,
                krw,
                weight: totalKrw > 0 ? (krw / totalKrw) * 100 : 0,
            }))
            .sort((a, b) => b.krw - a.krw);
    }, [holdings, group]);

    const holdingsForDeviation = useMemo(() => {
        if (group === "all") return holdings;
        const types = accountTypesForDashboardGroup(group);
        return holdings.filter((h) => types.includes(h.accountType));
    }, [holdings, group]);

    const sparklinePoints = useMemo(
        () => weeklySnapshotsToTrendPoints(weeklySnapshots, group),
        [weeklySnapshots, group],
    );

    const filteredRealtime = useMemo(() => {
        if (holdings.length === 0 || !realtimeMetrics) return null;
        const broker = metricsFromHoldings(holdings, group);
        const totalDepositsKrw = sumDepositsForGroup(realtimeMetrics.depositsByAccountType ?? {}, group);
        const dailyRatio =
            realtimeMetrics.totalValueKrw > 0
                ? broker.totalValueKrw / realtimeMetrics.totalValueKrw
                : 0;
        return {
            ...broker,
            totalDepositsKrw,
            dailyProfitKrw: realtimeMetrics.dailyProfitKrw * dailyRatio,
        };
    }, [holdings, realtimeMetrics, group]);

    const visibleDeviationGroups = useMemo((): AccountGroupKey[] => {
        if (group === "all") return DEVIATION_GROUP_ORDER;
        return [group];
    }, [group]);

    const deviationByGroup = useMemo(() => {
        if (holdingsForDeviation.length === 0 || strategies.length === 0) return null;
        return computeTickerDeviationsByAccountGroupsFromHoldings(holdingsForDeviation, strategies);
    }, [holdingsForDeviation, strategies]);

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

    const configuredTargetKeys = useMemo(
        () =>
            new Set(
                strategies.map((s) => portfolioTickerAccountKey(s.ticker, s.accountType)),
            ),
        [strategies],
    );

    const filteredHoldingsCount = useMemo(() => {
        const scoped = filterHoldingsByDashboardGroup(holdings, group);
        return scoped.filter((h) => h.marketValueKrw > 0).length;
    }, [holdings, group]);

    useEffect(() => {
        const currentProfile = getCurrentProfile();
        setProfileId(currentProfile);
    }, []);

    useEffect(() => {
        if (!profileId) return;
        setLoading(true);
        getPortfolioStrategies(profileId as WorkspaceProfile)
            .then(setStrategies)
            .finally(() => setLoading(false));
    }, [profileId]);

    const fetchRealtimeData = useCallback(async () => {
        setRealtimeLoading(true);
        try {
            const [rtRes, snapRes, holdRes] = await Promise.all([
                fetch("/api/dashboard/realtime"),
                fetch("/api/snapshots?days=365&kind=WEEKLY"),
                fetch("/api/holdings"),
            ]);
            if (rtRes.ok) {
                const rt = await rtRes.json();
                setRealtimeMetrics(rt);
            }
            if (snapRes.ok) {
                const snap = await snapRes.json();
                setWeeklySnapshots(snap.snapshots ?? []);
            }
            if (holdRes.ok) {
                const hold = await holdRes.json();
                setHoldings(hold.holdings ?? []);
            }
        } finally {
            setRealtimeLoading(false);
        }
    }, []);

    const handleSync = useCallback(async () => {
        setSyncing(true);
        try {
            const res = await fetch("/api/sync", { method: "POST" });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error ?? "동기화 실패");
            toast.success("동기화 완료");
            await fetchRealtimeData();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "동기화 중 오류");
        } finally {
            setSyncing(false);
        }
    }, [fetchRealtimeData]);

    useEffect(() => {
        void fetchRealtimeData();
    }, [fetchRealtimeData]);

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
            <PageContainer>
                <div className="h-64 animate-pulse rounded-3xl bg-[var(--ah-card-soft)]" />
                <div className="mt-7 grid grid-cols-1 gap-7 md:grid-cols-2">
                    <div className="h-72 animate-pulse rounded-3xl bg-[var(--ah-card-soft)]" />
                    <div className="h-72 animate-pulse rounded-3xl bg-[var(--ah-card-soft)]" />
                </div>
            </PageContainer>
        );
    }

    if (!loading && !realtimeLoading && (realtimeMetrics?.holdingCount ?? 0) === 0) {
        return <EmptyState />;
    }

    const invested = filteredRealtime?.totalDepositsKrw ?? 0;
    const current = filteredRealtime?.totalValueKrw ?? 0;
    const hasSummaryTotals = filteredRealtime != null && !realtimeLoading && (realtimeMetrics?.holdingCount ?? 0) > 0;
    const profit = filteredRealtime?.totalProfitKrw ?? 0;
    const returnRate = (filteredRealtime?.totalProfitRate ?? 0) * 100;
    const hasHoldingsValue = current > 0;

    const lastSyncedDate = realtimeMetrics?.lastSynced ? new Date(realtimeMetrics.lastSynced) : null;
    const lastSyncedCaption = lastSyncedDate
        ? `마지막 동기화 ${lastSyncedDate.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
        : realtimeLoading
          ? "불러오는 중…"
          : "동기화 기록 없음";

    const hasManualPension = holdings.some(
        (h) => h.source === "MANUAL" && h.accountType === "PENSION" && h.marketValueKrw > 0,
    );
    const manualInputNote =
        hasManualPension && (group === "all" || group === "연금저축")
            ? "연금 · 수동 입력 (실시간 아님)"
            : null;

    const calendarYear = new Date().getFullYear();
    const flowBars = investmentNewFlows?.monthlyBars ?? [];
    const latestFlowBar = flowBars.length > 0 ? flowBars[flowBars.length - 1] : null;

    const groupHasHoldings = (key: AccountGroupKey) => {
        const types = ACCOUNT_GROUPS[key];
        return holdings.some(
            (h) =>
                h.marketValueKrw > 0 &&
                (types as readonly AccountType[]).includes(h.accountType),
        );
    };

    const portfolioDonutSegments = consolidatedHoldingsRealtime.map(({ ticker, name, weight }) => ({
        ticker,
        name,
        weight,
    }));

    const rebalanceGroups: RebalanceGroup[] = visibleDeviationGroups
        .filter((k) => groupHasHoldings(k))
        .map((k) => ({
            key: k,
            title: GROUP_DEVIATION_TITLES[k],
            data: deviationByGroup?.[k] ?? [],
        }))
        .filter((g) => g.data.length > 0);

    const rebalanceEmptyMessage =
        holdings.length === 0
            ? "보유 종목이 없습니다. 새로고침으로 동기화해 주세요."
            : strategies.length === 0
              ? "포트폴리오 전략이 없어 목표 대비 괴리를 표시하지 않습니다."
              : rebalanceGroups.length === 0
                ? "계좌 그룹별 보유 종목이 없어 괴리율을 표시하지 않습니다."
                : null;

    return (
        <PageContainer innerClassName="relative flex flex-col gap-8 md:gap-10">
                {/* [1] 히어로 — 카드 없이 배경 위 직접 */}
                <DashboardStagger delay={0}>
                    <DashboardHero
                        current={current}
                        invested={invested}
                        profit={profit}
                        returnRate={returnRate}
                        hasData={hasSummaryTotals}
                        loading={realtimeLoading}
                        hasHoldingsValue={hasHoldingsValue}
                        lastSyncedCaption={lastSyncedCaption}
                        group={group}
                        onGroupChange={setGroup}
                        syncing={syncing}
                        onSync={() => void handleSync()}
                        sparklinePoints={sparklinePoints}
                        manualInputNote={manualInputNote}
                    />
                </DashboardStagger>

                {/* [2] 핵심 지표 4카드 그리드 */}
                <DashboardStagger delay={0.06}>
                    <DashboardSideMetrics
                        profit={profit}
                        returnRate={returnRate}
                        dailyProfit={filteredRealtime?.dailyProfitKrw ?? 0}
                        holdingCount={filteredHoldingsCount}
                        loading={realtimeLoading}
                        groupKey={group}
                    />
                </DashboardStagger>

                {/* [3] 자산 구성 + 리밸런싱 — 비대칭 그리드 */}
                <DashboardStagger
                    delay={0.08}
                    className="grid grid-cols-1 items-stretch gap-3.5 sm:gap-4 xl:grid-cols-12"
                >
                    <div className="flex h-full flex-col xl:col-span-7">
                        <AssetComposition
                            segments={portfolioDonutSegments}
                            loading={realtimeLoading}
                            groupKey={group}
                            index={0}
                        />
                    </div>
                    <div className="flex h-full flex-col xl:col-span-5">
                        <RebalanceInsight
                            groups={rebalanceGroups}
                            normalCount={normalCount}
                            overCount={overCount}
                            underCount={underCount}
                            configuredTargetKeys={configuredTargetKeys}
                            loading={realtimeLoading}
                            emptyMessage={rebalanceEmptyMessage}
                            groupKey={group}
                            index={1}
                        />
                    </div>
                </DashboardStagger>

                {/* [4] 납입 현황 — 풀폭 CashFlow 차트 */}
                {investmentNewFlows !== null && (
                    <DashboardStagger delay={0.14}>
                        <ContributionStatus
                            latestLabel={latestFlowBar?.periodLabel ?? null}
                            latestAmount={latestFlowBar?.amountKrw ?? 0}
                            ytdSum={investmentNewFlows.ytdSumKrw ?? 0}
                            calendarYear={calendarYear}
                            monthlyBars={monthlyNewInvBars}
                            index={2}
                        />
                    </DashboardStagger>
                )}
        </PageContainer>
    );
}
