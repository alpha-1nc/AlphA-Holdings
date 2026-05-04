"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import {
    CANONICAL_DONUT_CHART_REFERENCE_MIN_SIDE_PX,
    donutPieRoundedProps,
    donutRadiiScaledToMinSidePx,
    fillForPortfolioOrdinalSlice,
} from "@/lib/rounded-donut-chart";
import { collapseValueSlicesToOther } from "@/lib/portfolio-small-slice-collapse";
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
    const positives = snapshots.filter((d) => d.value > 0);
    const total = positives.reduce((s, d) => s + d.value, 0);
    const collapsed = collapseValueSlicesToOther(positives);
    const dataWithPct = collapsed.map((d, idx) => ({
        ...d,
        pct: total > 0 ? (d.value / total) * 100 : 0,
        color: fillForPortfolioOrdinalSlice(idx),
    }));

    const hasSlices = dataWithPct.length > 0;

    const chartBoxRef = useRef<HTMLDivElement>(null);
    const [radii, setRadii] = useState(() =>
        donutRadiiScaledToMinSidePx(CANONICAL_DONUT_CHART_REFERENCE_MIN_SIDE_PX),
    );

    useLayoutEffect(() => {
        if (!hasSlices) return;
        const el = chartBoxRef.current;
        if (!el) return;

        function syncRadiiFromBox() {
            const box = chartBoxRef.current;
            if (!box) return;
            const rect = box.getBoundingClientRect();
            const m = Math.round(Math.min(rect.width, rect.height));
            if (m > 0) setRadii(donutRadiiScaledToMinSidePx(m));
        }

        syncRadiiFromBox();
        const ro = new ResizeObserver(syncRadiiFromBox);
        ro.observe(el);
        return () => ro.disconnect();
    }, [hasSlices]);

    if (!hasSlices) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center py-8">
                <p className="text-sm text-neutral-400">스냅샷에 종목을 추가하면</p>
                <p className="text-sm text-neutral-400">차트가 표시됩니다</p>
            </div>
        );
    }

    const donutInner = radii.innerRadius;
    const donutOuter = radii.outerRadius;

    return (
        <div className="flex w-full min-w-0 flex-col items-center gap-5">
            <div className="w-full rounded-2xl border border-neutral-100 bg-neutral-50/90 p-5 dark:border-neutral-800/80 dark:bg-neutral-800/40">
                <div
                    ref={chartBoxRef}
                    className="mx-auto h-44 w-full min-w-0"
                >
                    <ChartContainer
                        config={reportDonutChartConfig}
                        className="[&_.recharts-text]:fill-background aspect-auto h-full w-full min-h-0 justify-center"
                    >
                        <PieChart>
                            <Tooltip content={<CustomTooltip />} />
                            <Pie
                                data={dataWithPct}
                                cx="50%"
                                cy="50%"
                                innerRadius={donutInner}
                                outerRadius={donutOuter}
                                dataKey="value"
                                nameKey="name"
                                {...donutPieRoundedProps({
                                    sliceCount: dataWithPct.length,
                                    weights: dataWithPct.map((d) => d.value),
                                    innerRadius: donutInner,
                                    outerRadius: donutOuter,
                                })}
                            >
                                {dataWithPct.map((entry, i) => (
                                    <Cell key={`${entry.ticker}-${i}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
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
                            {d.name !== d.ticker && d.ticker !== "__OTHER__" && (
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
