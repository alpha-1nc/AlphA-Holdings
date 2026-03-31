"use client";

import type { AnalysisOutput } from "@/app/actions/generate-analysis";
import type { BaseTickContentProps } from "recharts";
import {
    Line,
    LineChart,
    PolarAngleAxis,
    PolarGrid,
    Radar,
    RadarChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export type RadarChartRow = {
    /** 전체 차원명 — 축에는 8글자만, 툴팁에 전체 표시 */
    fullLabel: string;
    pct: number;
};

function truncateLabel(s: string, max = 8): string {
    const t = s.trim();
    return t.length <= max ? t : t.slice(0, max);
}

function RadarAngleTick(props: BaseTickContentProps) {
    const full = String(props.payload?.value ?? "");
    const short = truncateLabel(full, 8);
    return (
        <text
            x={props.x}
            y={props.y}
            textAnchor={props.textAnchor}
            className="fill-muted-foreground"
            fontSize={10}
            dy={4}
        >
            {short}
        </text>
    );
}

type RadarTooltipPayload = {
    fullLabel: string;
    pct: number;
};

function RadarTooltipBody({
    active,
    payload,
}: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: RadarTooltipPayload }>;
}) {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    const n = typeof p.pct === "number" ? p.pct : Number(p.pct);
    return (
        <div
            className="max-w-[min(280px,80vw)] rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
            style={{ fontSize: 12 }}
        >
            <p className="mb-1.5 font-semibold leading-snug text-popover-foreground">
                {p.fullLabel}
            </p>
            <p className="tabular-nums text-muted-foreground">
                비율: {Number.isFinite(n) ? n.toFixed(1) : "—"}%
            </p>
        </div>
    );
}

export function DimensionRadarBlock({ rows }: { rows: RadarChartRow[] }) {
    const data: RadarTooltipPayload[] = rows.map((r) => ({
        fullLabel: r.fullLabel,
        pct: r.pct,
    }));

    if (data.length === 0) {
        return (
            <div className="flex h-[280px] items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground">
                표시할 차원 데이터가 없습니다.
            </div>
        );
    }

    return (
        <div className="h-[min(360px,70vw)] w-full min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="52%" outerRadius="68%" data={data}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                        dataKey="fullLabel"
                        tick={RadarAngleTick}
                    />
                    <Radar
                        name="점수 %"
                        dataKey="pct"
                        stroke="#34d399"
                        fill="#34d399"
                        fillOpacity={0.35}
                        strokeWidth={1.5}
                        dot={{ r: 4, fill: "#34d399", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#6ee7b7", strokeWidth: 0 }}
                    />
                    <Tooltip content={RadarTooltipBody} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}

/** 동일 차원 순서로 라인 추이 (가격 히스토리 없음 — dimensionScores 기반) */
export function DimensionLineBlock({ rows }: { rows: RadarChartRow[] }) {
    const data = rows.map((r, i) => ({
        idx: i + 1,
        label: truncateLabel(r.fullLabel, 8),
        pct: r.pct,
    }));

    if (data.length === 0) {
        return null;
    }

    return (
        <div className="h-[220px] w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                    <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        axisLine={{ stroke: "var(--border)" }}
                        tickLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        axisLine={{ stroke: "var(--border)" }}
                        tickLine={{ stroke: "var(--border)" }}
                        width={32}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--popover-foreground)",
                        }}
                        formatter={(value) => {
                            const n =
                                typeof value === "number" ? value : Number(value);
                            return [
                                `${Number.isFinite(n) ? n.toFixed(1) : "—"}%`,
                                "비율",
                            ];
                        }}
                    />
                    <ReferenceLine
                        y={50}
                        stroke="var(--muted-foreground)"
                        strokeOpacity={0.35}
                        strokeDasharray="4 4"
                    />
                    <ReferenceLine
                        y={80}
                        stroke="var(--muted-foreground)"
                        strokeOpacity={0.25}
                        strokeDasharray="4 4"
                    />
                    <Line
                        type="monotone"
                        dataKey="pct"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        dot={{ fill: "#38bdf8", strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ReportChartsSection({
    dimensionScores,
}: {
    dimensionScores: AnalysisOutput["dimensionScores"];
}) {
    const sorted = [...dimensionScores].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, 6);
    const rows: RadarChartRow[] = top.map((d) => ({
        fullLabel: d.dimensionName,
        pct:
            d.maxScore > 0 ? Math.min(100, (d.score / d.maxScore) * 100) : 0,
    }));

    return (
        <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">
                Dimension 레이더 · 추이
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                        레이더 (상위 {Math.min(6, dimensionScores.length)}개 차원)
                    </p>
                    <DimensionRadarBlock rows={rows} />
                </div>
                <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                        차원별 점수 비율 추이 (동일 순서)
                    </p>
                    <DimensionLineBlock rows={rows} />
                </div>
            </div>
        </section>
    );
}
