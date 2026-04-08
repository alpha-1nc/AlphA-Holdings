"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

import {
    getPortfolioStrategies,
    upsertPortfolioStrategy,
    deletePortfolioStrategy,
} from "@/app/actions/strategy";
import type { WorkspaceProfile } from "@/lib/profile";
import {
    ASSET_ROLE_LABELS,
    type PortfolioStrategy,
} from "@/types/portfolio-strategy";
import type { AccountType, AssetRole } from "@/generated/prisma";
import {
    ACCOUNT_GROUPS,
    ACCOUNT_TYPE_LABEL,
    DIRECT_ACCOUNT_OPTIONS,
    type AccountGroupKey,
} from "@/lib/accountGroups";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TickerSearchInput, type TickerSearchChangeMeta } from "@/components/dashboard/ticker-search-input";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const ASSET_ROLES = Object.keys(ASSET_ROLE_LABELS) as AssetRole[];

const ROLE_BADGE_STYLES: Record<AssetRole, string> = {
    CORE:      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    GROWTH:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    BOOSTER:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    DEFENSIVE: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    INDEX:     "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    UNASSIGNED: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

const TAB_ORDER: AccountGroupKey[] = ["직투", "ISA", "연금저축"];

interface Props {
    workspaceProfile: WorkspaceProfile;
}

export function PortfolioStrategyManager({ workspaceProfile }: Props) {
    const [activeTab, setActiveTab] = useState<AccountGroupKey>("직투");
    const [strategies, setStrategies] = useState<PortfolioStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Form state
    const [ticker, setTicker] = useState("");
    const [strategyDisplayName, setStrategyDisplayName] = useState<string | null>(null);
    const [role, setRole] = useState<AssetRole>("CORE");
    const [targetWeight, setTargetWeight] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    /** 수정 중인 행의 계좌 유형 — strategies.find 대신 고정해 upsert 키가 어긋나지 않게 함 */
    const [editingAccountType, setEditingAccountType] = useState<AccountType | null>(null);
    /** 직투 탭 종목 추가 시에만 사용 */
    const [directAccountType, setDirectAccountType] = useState<AccountType>("US_DIRECT");

    const tabAccountTypes = [...ACCOUNT_GROUPS[activeTab]];

    async function loadStrategies() {
        setLoading(true);
        try {
            const data = await getPortfolioStrategies(workspaceProfile, {
                accountTypes: tabAccountTypes,
            });
            setStrategies(data);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadStrategies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceProfile, activeTab]);

    function defaultAccountTypeForTab(tab: AccountGroupKey): AccountType {
        if (tab === "ISA") return "ISA";
        if (tab === "연금저축") return "PENSION";
        return directAccountType;
    }

    function handleEdit(strategy: PortfolioStrategy) {
        setEditingId(strategy.id);
        setEditingAccountType(strategy.accountType);
        setTicker(strategy.ticker);
        setStrategyDisplayName(strategy.displayName ?? null);
        setRole(strategy.role);
        setTargetWeight(String(strategy.targetWeight));
        const at = strategy.accountType;
        if (at === "US_DIRECT" || at === "KR_DIRECT" || at === "JP_DIRECT") {
            setDirectAccountType(at);
        }
    }

    function handleCancelEdit() {
        setEditingId(null);
        setEditingAccountType(null);
        setTicker("");
        setStrategyDisplayName(null);
        setRole("CORE");
        setTargetWeight("");
        setDirectAccountType("US_DIRECT");
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const trimmedTicker = ticker.trim().toUpperCase();
        const weight = parseFloat(targetWeight);
        const accountType = editingId
            ? (editingAccountType ?? defaultAccountTypeForTab(activeTab))
            : defaultAccountTypeForTab(activeTab);

        if (!trimmedTicker) {
            toast.error("종목 심볼을 입력해 주세요.");
            return;
        }
        if (isNaN(weight) || weight <= 0 || weight > 100) {
            toast.error("목표 비중은 0 초과 100 이하의 숫자여야 합니다.");
            return;
        }

        const othersSum = strategies.reduce((sum, s) => {
            if (editingId && s.id === editingId) return sum;
            return sum + s.targetWeight;
        }, 0);
        const nextTotal = othersSum + weight;
        if (nextTotal > 100 + 0.001) {
            toast.error(
                `이 탭의 목표 비중 합계는 100%를 넘을 수 없습니다. (저장 시 합계 ${nextTotal.toFixed(1)}%)`
            );
            return;
        }

        const roleForSubmit: AssetRole =
            activeTab === "직투" ? role : editingId ? role : "CORE";

        startTransition(async () => {
            try {
                await upsertPortfolioStrategy({
                    workspaceProfile,
                    ticker: trimmedTicker,
                    displayName: strategyDisplayName?.trim() || null,
                    role: roleForSubmit,
                    targetWeight: weight,
                    accountType,
                });
                toast.success(
                    editingId
                        ? `${trimmedTicker} 목표가 수정되었습니다.`
                        : `${trimmedTicker} 목표가 추가되었습니다.`
                );
                handleCancelEdit();
                await loadStrategies();
            } catch (err) {
                console.error("[목표 포트폴리오 저장]", err);
                toast.error("저장 중 오류가 발생했습니다.");
            }
        });
    }

    function handleDelete(strategy: PortfolioStrategy) {
        startTransition(async () => {
            try {
                await deletePortfolioStrategy({
                    workspaceProfile,
                    ticker: strategy.ticker,
                    accountType: strategy.accountType,
                });
                toast.success(`${strategy.ticker} 목표가 삭제되었습니다.`);
                await loadStrategies();
            } catch {
                toast.error("삭제 중 오류가 발생했습니다.");
            }
        });
    }

    const totalWeight = strategies.reduce((sum, s) => sum + s.targetWeight, 0);
    const weightDiff = totalWeight - 100;
    const weightStatus =
        strategies.length === 0
            ? "skip"
            : Math.abs(weightDiff) < 0.001
            ? "exact"
            : weightDiff > 0
            ? "over"
            : "under";

    const searchAccountType: AccountType =
        activeTab === "직투" ? directAccountType : defaultAccountTypeForTab(activeTab);

    const strategyGridMd =
        activeTab === "직투"
            ? "md:grid-cols-[1fr_auto_auto_auto_auto_auto]"
            : "md:grid-cols-[1fr_auto_auto_auto_auto]";
    /** 모바일: 액션 열에 44px×2 버튼이 들어가도록 비중(3rem)·버튼 열 분리 */
    const strategyGridMobile =
        activeTab === "직투"
            ? "grid-cols-[minmax(0,1fr)_auto_auto_3rem_minmax(5.75rem,auto)]"
            : "grid-cols-[minmax(0,1fr)_auto_3rem_minmax(5.75rem,auto)]";

    return (
        <section className="mb-10">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                목표 포트폴리오
            </p>

            <div
                className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
                role="tablist"
                aria-label="계좌 유형"
            >
                {TAB_ORDER.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab}
                        onClick={() => {
                            setActiveTab(tab);
                            handleCancelEdit();
                        }}
                        className={[
                            "flex min-h-10 items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-semibold leading-tight transition sm:min-h-9 sm:px-3",
                            activeTab === tab
                                ? "bg-white text-neutral-900 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-white/10"
                                : "text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700/50 dark:hover:text-neutral-100",
                        ].join(" ")}
                    >
                        {tab === "연금저축" ? "연금저축" : tab}
                    </button>
                ))}
            </div>

            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800">
                {activeTab === "연금저축" && (
                    <div className="border-b border-neutral-100 px-6 py-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                        세액공제 한도: 월 50만원 (연 600만원) / 투자 대상: 지수 ETF 권장
                    </div>
                )}
                {/* ── 입력 폼 ──────────────────────────────────────────── */}
                <form onSubmit={handleSubmit} className="px-6 py-5">
                    <p className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {editingId ? "목표 수정" : "종목 목표 추가"}
                    </p>

                    <div className="flex min-w-0 flex-wrap items-end gap-2 lg:flex-nowrap lg:gap-1.5 xl:gap-2">
                        {/* Ticker — 남은 폭을 차지하고 min-w-0으로 한 줄 레이아웃에서 가로 스크롤 없이 축소 가능 */}
                        <div className="flex w-full min-w-0 basis-full flex-col gap-1 lg:basis-auto lg:flex-1 lg:min-w-0">
                            <label className="whitespace-nowrap text-xs text-neutral-400 dark:text-neutral-500">
                                종목 심볼
                            </label>
                            {editingId ? (
                                <Input
                                    value={ticker}
                                    readOnly
                                    className="h-9 min-w-0 font-mono text-sm uppercase"
                                />
                            ) : (
                                <TickerSearchInput
                                    value={ticker}
                                    onChange={(t, meta?: TickerSearchChangeMeta) => {
                                        setTicker(t);
                                        if (meta?.source === "select") {
                                            setStrategyDisplayName(meta.displayName?.trim() || null);
                                        } else {
                                            const same = t.trim().toUpperCase() === ticker.trim().toUpperCase();
                                            if (!same) setStrategyDisplayName(null);
                                        }
                                    }}
                                    accountType={searchAccountType}
                                    placeholder="AAPL, 005930, 7203..."
                                />
                            )}
                        </div>

                        {activeTab === "직투" && !editingId && (
                            <div className="flex shrink-0 flex-col gap-1">
                                <label className="text-xs text-neutral-400 dark:text-neutral-500">
                                    계좌
                                </label>
                                <Select
                                    value={directAccountType}
                                    onValueChange={(v) => setDirectAccountType(v as AccountType)}
                                >
                                    <SelectTrigger className="h-9 w-[9rem] shrink-0 text-sm lg:w-[8.25rem] xl:w-[9rem]">
                                        <SelectValue>
                                            {DIRECT_ACCOUNT_OPTIONS.find(
                                                (o) => o.value === directAccountType
                                            )?.label ?? ACCOUNT_TYPE_LABEL[directAccountType]}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DIRECT_ACCOUNT_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* 역할 선택은 직투 탭만 */}
                        {activeTab === "직투" && (
                            <div className="flex shrink-0 flex-col gap-1">
                                <label className="text-xs text-neutral-400 dark:text-neutral-500">
                                    역할
                                </label>
                                <Select
                                    value={role}
                                    onValueChange={(v) => setRole(v as AssetRole)}
                                >
                                    <SelectTrigger className="h-9 w-[7rem] text-sm xl:w-28">
                                        <SelectValue>{ASSET_ROLE_LABELS[role]}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ASSET_ROLES.map((r) => (
                                            <SelectItem key={r} value={r}>
                                                {ASSET_ROLE_LABELS[r]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Target Weight */}
                        <div className="flex shrink-0 flex-col gap-1">
                            <label className="text-xs text-neutral-400 dark:text-neutral-500">
                                목표 비중 (%)
                            </label>
                            {/* 네이티브 input: Base UI Input(FieldControl)의 controlled 고정 ref 이슈로 편집 시 값이 갱신되지 않는 경우 방지 */}
                            <input
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                name="targetWeight"
                                value={targetWeight}
                                onChange={(e) => setTargetWeight(e.target.value)}
                                placeholder="10.00"
                                className={cn(
                                    "h-9 w-[4.5rem] min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm tabular-nums",
                                    "outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                                    "lg:w-20 dark:bg-input/30",
                                )}
                            />
                        </div>

                        {/* Submit + 취소 — 한 줄에서 버튼만 떨어지지 않도록 묶음 */}
                        <div className="flex shrink-0 items-end gap-1.5">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isPending}
                                className="h-9 shrink-0 gap-1.5"
                            >
                                {editingId ? (
                                    <>
                                        <Pencil className="size-3.5" />
                                        수정
                                    </>
                                ) : (
                                    <>
                                        <Plus className="size-3.5" />
                                        추가
                                    </>
                                )}
                            </Button>

                            {editingId && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="h-9 shrink-0 text-neutral-500"
                                >
                                    취소
                                </Button>
                            )}
                        </div>
                    </div>
                </form>

                <div className="mx-6 h-px bg-neutral-100 dark:bg-neutral-800" />

                {/* ── 목표 리스트 ───────────────────────────────────────── */}
                <div className="px-6 py-4">
                    {loading ? (
                        <div className="space-y-2.5 py-1">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-9 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
                                />
                            ))}
                        </div>
                    ) : strategies.length === 0 ? (
                        <p className="py-4 text-center text-sm text-neutral-400 dark:text-neutral-500">
                            이 탭에 등록된 목표가 없습니다.
                        </p>
                    ) : (
                        <div className="min-w-0 space-y-1">
                            {/* Header */}
                            <div
                                className={`grid ${strategyGridMobile} items-center gap-2 px-1 pb-1 text-[11px] md:gap-3 md:text-xs ${strategyGridMd}`}
                            >
                                <span className="font-medium text-neutral-400 dark:text-neutral-500">종목</span>
                                {activeTab === "직투" && (
                                    <span className="w-12 text-center font-medium text-neutral-400 dark:text-neutral-500 md:w-16">
                                        계좌
                                    </span>
                                )}
                                <span className="w-14 text-right font-medium text-neutral-400 dark:text-neutral-500 md:w-16">역할</span>
                                <span className="w-12 text-right font-medium text-neutral-400 dark:text-neutral-500 md:w-14">비중</span>
                                <span className="w-12 md:w-14" />
                            </div>

                            {strategies.map((s) => {
                                const rowLabel = getPortfolioItemDisplayLabel({
                                    ticker: s.ticker,
                                    displayName: s.displayName,
                                });
                                return (
                                <div
                                    key={s.id}
                                    className={`grid ${strategyGridMobile} items-center gap-2 rounded-lg px-1 py-2 text-[11px] transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 md:gap-3 md:text-sm ${strategyGridMd}`}
                                >
                                    <span className="min-w-0 font-medium text-neutral-900 dark:text-neutral-100">
                                        {rowLabel}
                                        {rowLabel.trim().toUpperCase() !== s.ticker.trim().toUpperCase() && (
                                            <span className="ml-1 font-mono text-[10px] text-neutral-500 dark:text-neutral-400 md:text-xs">
                                                ({s.ticker})
                                            </span>
                                        )}
                                    </span>
                                    {activeTab === "직투" && (
                                        <span className="w-12 shrink-0 text-center text-[10px] font-medium text-neutral-600 dark:text-neutral-400 md:w-16 md:text-[10px]">
                                            {ACCOUNT_TYPE_LABEL[s.accountType]}
                                        </span>
                                    )}
                                    <span
                                        className={`inline-flex w-14 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium md:w-16 md:px-2 md:text-xs ${ROLE_BADGE_STYLES[s.role]}`}
                                    >
                                        {ASSET_ROLE_LABELS[s.role]}
                                    </span>
                                    <span className="min-w-0 justify-self-end text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300 md:w-14 md:text-sm">
                                        {s.targetWeight.toFixed(1)}%
                                    </span>
                                    <div className="flex min-w-0 shrink-0 justify-end gap-0.5 justify-self-end md:w-14 md:gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(s)}
                                            disabled={isPending}
                                            className="flex min-h-11 min-w-11 items-center justify-center rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200 disabled:opacity-40 md:min-h-0 md:min-w-0"
                                            aria-label="수정"
                                        >
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(s)}
                                            disabled={isPending}
                                            className="flex min-h-11 min-w-11 items-center justify-center rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-40 md:min-h-0 md:min-w-0"
                                            aria-label="삭제"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    )}
                </div>

                {/* ── 비중 합계 표시 ────────────────────────────────────── */}
                {strategies.length > 0 && weightStatus !== "skip" && (
                    <>
                        <div className="mx-6 h-px bg-neutral-100 dark:bg-neutral-800" />
                        <div className="flex items-center justify-between px-6 py-3.5">
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                목표 비중 합계 ({activeTab})
                            </span>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`font-mono text-sm font-semibold ${
                                        weightStatus === "exact"
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : weightStatus === "over"
                                            ? "text-red-500 dark:text-red-400"
                                            : "text-amber-500 dark:text-amber-400"
                                    }`}
                                >
                                    {totalWeight.toFixed(1)}%
                                </span>
                                {weightStatus !== "exact" && (
                                    <span
                                        className={`text-xs ${
                                            weightStatus === "over"
                                                ? "text-red-400 dark:text-red-500"
                                                : "text-amber-400 dark:text-amber-500"
                                        }`}
                                    >
                                        {weightStatus === "over"
                                            ? `+${weightDiff.toFixed(1)}% 초과`
                                            : `${Math.abs(weightDiff).toFixed(1)}% 부족`}
                                    </span>
                                )}
                                {weightStatus === "exact" && (
                                    <span className="text-xs text-emerald-500 dark:text-emerald-400">
                                        ✓ 100%
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <p className="mt-3 px-1 text-xs text-neutral-400 dark:text-neutral-500">
                현재 선택된 프로필의 종목별 목표 비중을 설정합니다. 탭별로 합계 100%를 맞춰 주세요.
            </p>
        </section>
    );
}
