"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getTickerColor } from "@/constants/brandColors";

const krwFormat = (n: number) =>
    new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
        maximumFractionDigits: 0,
    }).format(n);

const krwShort = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
    if (abs >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
    return String(n);
};

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
                {krwFormat(d.value)} · {d.payload.pct.toFixed(1)}%
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
        .map((d, idx) => ({
            ...d,
            pct: total > 0 ? (d.value / total) * 100 : 0,
            color: getTickerColor(d.ticker, idx),
        }));

    if (dataWithPct.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center py-8">
                <p className="text-sm text-neutral-400">스냅샷에 종목을 추가하면</p>
                <p className="text-sm text-neutral-400">차트가 표시됩니다</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={dataWithPct}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={88}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                            isAnimationActive
                        >
                            {dataWithPct.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                        평가금액
                    </p>
                    <p className="mt-0.5 text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                        {krwShort(total)}
                    </p>
                </div>
            </div>

            {/* Legend: 종목명 (코드) - 메타 있는 경우만 코드 병기 */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                {dataWithPct.map((d) => (
                    <div key={d.ticker} className="flex items-center gap-1 text-[10px] text-neutral-600 dark:text-neutral-400">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span>
                            {d.name}
                            {d.name !== d.ticker && (
                                <span className="ml-0.5 font-mono text-neutral-500 dark:text-neutral-500">({d.ticker})</span>
                            )}
                        </span>
                        <span className="text-neutral-400 dark:text-neutral-500">{d.pct.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
