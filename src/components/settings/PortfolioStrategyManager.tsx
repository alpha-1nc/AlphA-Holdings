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
import type { AssetRole } from "@/generated/prisma";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TickerSearchInput } from "@/components/dashboard/ticker-search-input";
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
};

interface Props {
    workspaceProfile: WorkspaceProfile;
}

export function PortfolioStrategyManager({ workspaceProfile }: Props) {
    const [strategies, setStrategies] = useState<PortfolioStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Form state
    const [ticker, setTicker] = useState("");
    const [role, setRole] = useState<AssetRole>("CORE");
    const [targetWeight, setTargetWeight] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    async function loadStrategies() {
        setLoading(true);
        try {
            const data = await getPortfolioStrategies(workspaceProfile);
            setStrategies(data);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadStrategies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceProfile]);

    function handleEdit(strategy: PortfolioStrategy) {
        setEditingId(strategy.id);
        setTicker(strategy.ticker);
        setRole(strategy.role);
        setTargetWeight(String(strategy.targetWeight));
    }

    function handleCancelEdit() {
        setEditingId(null);
        setTicker("");
        setRole("CORE");
        setTargetWeight("");
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const trimmedTicker = ticker.trim().toUpperCase();
        const weight = parseFloat(targetWeight);

        if (!trimmedTicker) {
            toast.error("종목 심볼을 입력해 주세요.");
            return;
        }
        if (isNaN(weight) || weight <= 0 || weight > 100) {
            toast.error("목표 비중은 0 초과 100 이하의 숫자여야 합니다.");
            return;
        }

        startTransition(async () => {
            try {
                await upsertPortfolioStrategy({
                    workspaceProfile,
                    ticker: trimmedTicker,
                    role,
                    targetWeight: weight,
                });
                toast.success(
                    editingId
                        ? `${trimmedTicker} 전략이 수정되었습니다.`
                        : `${trimmedTicker} 전략이 추가되었습니다.`
                );
                handleCancelEdit();
                await loadStrategies();
            } catch {
                toast.error("저장 중 오류가 발생했습니다.");
            }
        });
    }

    function handleDelete(id: string, ticker: string) {
        startTransition(async () => {
            try {
                await deletePortfolioStrategy(id);
                toast.success(`${ticker} 전략이 삭제되었습니다.`);
                await loadStrategies();
            } catch {
                toast.error("삭제 중 오류가 발생했습니다.");
            }
        });
    }

    const totalWeight = strategies.reduce((sum, s) => sum + s.targetWeight, 0);
    const weightDiff = totalWeight - 100;
    const weightStatus =
        Math.abs(weightDiff) < 0.001
            ? "exact"
            : weightDiff > 0
            ? "over"
            : "under";

    return (
        <section className="mb-10">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                포트폴리오 전략
            </p>

            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800">
                {/* ── 입력 폼 ──────────────────────────────────────────── */}
                <form onSubmit={handleSubmit} className="px-6 py-5">
                    <p className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {editingId ? "전략 수정" : "종목 전략 추가"}
                    </p>

                    <div className="flex flex-wrap items-end gap-2">
                        {/* Ticker — 검색(미국·한국·일본 통합) 또는 수정 시 읽기 전용 */}
                        <div className="flex min-w-[10rem] flex-1 flex-col gap-1 sm:min-w-[11rem]">
                            <label className="text-xs text-neutral-400 dark:text-neutral-500">
                                종목 심볼
                            </label>
                            {editingId ? (
                                <Input
                                    value={ticker}
                                    readOnly
                                    className="h-9 font-mono text-sm uppercase"
                                />
                            ) : (
                                <TickerSearchInput
                                    value={ticker}
                                    onChange={setTicker}
                                    placeholder="AAPL, 005930, 7203..."
                                />
                            )}
                        </div>

                        {/* Role */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-400 dark:text-neutral-500">
                                역할
                            </label>
                            <Select
                                value={role}
                                onValueChange={(v) => setRole(v as AssetRole)}
                            >
                                <SelectTrigger className="h-9 w-32 text-sm">
                                    <SelectValue />
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

                        {/* Target Weight */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-400 dark:text-neutral-500">
                                목표 비중 (%)
                            </label>
                            <Input
                                type="number"
                                min="0.01"
                                max="100"
                                step="0.01"
                                value={targetWeight}
                                onChange={(e) => setTargetWeight(e.target.value)}
                                placeholder="10.00"
                                className="h-9 w-24 text-sm"
                            />
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isPending}
                            className="h-9 gap-1.5"
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
                                className="h-9 text-neutral-500"
                            >
                                취소
                            </Button>
                        )}
                    </div>
                </form>

                <div className="mx-6 h-px bg-neutral-100 dark:bg-neutral-800" />

                {/* ── 전략 리스트 ───────────────────────────────────────── */}
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
                            등록된 전략이 없습니다.
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {/* Header */}
                            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-1 pb-1">
                                <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">종목</span>
                                <span className="w-16 text-right text-xs font-medium text-neutral-400 dark:text-neutral-500">역할</span>
                                <span className="w-14 text-right text-xs font-medium text-neutral-400 dark:text-neutral-500">비중</span>
                                <span className="w-14" />
                            </div>

                            {strategies.map((s) => (
                                <div
                                    key={s.id}
                                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                                >
                                    <span className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        {s.ticker}
                                    </span>
                                    <span
                                        className={`inline-flex w-16 items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_STYLES[s.role]}`}
                                    >
                                        {ASSET_ROLE_LABELS[s.role]}
                                    </span>
                                    <span className="w-14 text-right font-mono text-sm text-neutral-700 dark:text-neutral-300">
                                        {s.targetWeight.toFixed(1)}%
                                    </span>
                                    <div className="flex w-14 justify-end gap-1">
                                        <button
                                            onClick={() => handleEdit(s)}
                                            disabled={isPending}
                                            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200 disabled:opacity-40"
                                            aria-label="수정"
                                        >
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(s.id, s.ticker)}
                                            disabled={isPending}
                                            className="rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-40"
                                            aria-label="삭제"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── 비중 합계 표시 ────────────────────────────────────── */}
                {strategies.length > 0 && (
                    <>
                        <div className="mx-6 h-px bg-neutral-100 dark:bg-neutral-800" />
                        <div className="flex items-center justify-between px-6 py-3.5">
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                목표 비중 합계
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
                현재 선택된 프로필의 종목별 역할과 목표 비중을 관리합니다.
            </p>
        </section>
    );
}
