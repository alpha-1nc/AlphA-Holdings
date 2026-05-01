"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { hexForCurrencyCode } from "@/lib/currency-colors";
import {
    CHART_CYCLE_FILLS,
    roundedDonutPieProps,
    roundedDonutRadiiPx,
} from "@/lib/rounded-donut-chart";
import {
    ChartContainer,
    type ChartConfig,
} from "@/components/ui/chart";

const reportDonutChartConfig = {
    value: { label: "평가금액" },
} satisfies ChartConfig;

const krwFormat = (n: number) =>
    new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
        maximumFractionDigits: 0,
    }).format(n);

interface TooltipPayload {
    name: string;
    value: number;
    payload: { ticker: string; pct: number; color: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div className="rounded-xl border border-neutral-100 bg-white px-3 py-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-1.5 mb-1">
                <span className="h-2 w-2 rounded-full" style={{ background: d.payload.color }} />
                <p className="text-xs font-semibold text-neutral-900 dark:text-white">{d.name}</p>
            </div>
            <p className="text-xs text-neutral-500">
                {krwFormat(d.value)} · {Math.round(d.payload.pct)}%
            </p>
        </div>
    );
}

export interface SnapshotForChart {
    ticker: string;
    name: string;
    value: number;
}

interface ReportDonutChartProps {
    snapshots: SnapshotForChart[];
}

export function ReportDonutChart({ snapshots }: ReportDonutChartProps) {
    const total = snapshots.reduce((s, d) => s + d.value, 0);
    const dataWithPct = snapshots
        .filter((d) => d.value > 0)
        .map((d, idx) => {
            const u = d.ticker.trim().toUpperCase();
            const color =
                u === "USD" || u === "JPY" || u === "KRW"
                    ? hexForCurrencyCode(u)
                    : CHART_CYCLE_FILLS[idx % CHART_CYCLE_FILLS.length];
            return {
                ...d,
                pct: total > 0 ? (d.value / total) * 100 : 0,
                color,
            };
        });

    if (dataWithPct.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center py-8">
                <p className="text-sm text-neutral-400">스냅샷에 종목을 추가하면</p>
                <p className="text-sm text-neutral-400">차트가 표시됩니다</p>
            </div>
        );
    }

    const { innerRadius, outerRadius } = roundedDonutRadiiPx({ compact: false });

    return (
        <div className="flex w-full min-w-0 flex-col items-center gap-5">
            <div className="w-full rounded-2xl border border-neutral-100 bg-neutral-50/90 p-5 dark:border-neutral-800/80 dark:bg-neutral-800/40">
                <div className="relative mx-auto min-h-[220px] w-full min-w-0 max-w-[320px]">
                    <ChartContainer
                        config={reportDonutChartConfig}
                        className="[&_.recharts-text]:fill-background mx-auto aspect-square h-full max-h-[min(288px,calc(100vw-8rem))] w-full justify-center"
                    >
                        <PieChart>
                            <Tooltip content={<CustomTooltip />} />
                            <Pie
                                data={dataWithPct}
                                cx="50%"
                                cy="50%"
                                innerRadius={innerRadius + 4}
                                outerRadius={outerRadius + 6}
                                dataKey="value"
                                {...roundedDonutPieProps(dataWithPct.length)}
                            >
                                {dataWithPct.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="max-w-[48%] text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
                                합산 평가
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums leading-tight text-neutral-900 dark:text-neutral-100 sm:text-base">
                                {krwFormat(total)}
                            </p>
                            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                                {dataWithPct.length}개 종목
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend: 종목명 (코드) - 메타 있는 경우만 코드 병기 */}
            <div className="grid w-full grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
                {dataWithPct.map((d) => (
                    <div
                        key={d.ticker}
                        className="flex min-w-0 items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                    >
                        <span
                            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: d.color }}
                        />
                        <span className="min-w-0 flex-1 break-words leading-snug">
                            {d.name}
                            {d.name !== d.ticker && (
                                <span className="ml-0.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                    ({d.ticker})
                                </span>
                            )}
                        </span>
                        <span className="ml-auto shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                            {Math.round(d.pct)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
