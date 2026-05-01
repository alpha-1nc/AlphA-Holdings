"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

const barBgDefault = "bg-[var(--surface-3)]";
const barBgNeighbor = "bg-[var(--text-tertiary)]/70";
const barBgHoverPri = "bg-[var(--accent-500)]";

export type MiniChartDatum = { label: string; value: number };

interface MiniChartProps {
    data: { label: string; value: number }[];
    valueFormatter?: (v: number) => string;
    suffix?: boolean;
    title?: string;
    /** 대시보드 등에서 높이를 부모와 맞출 때 전달 */
    className?: string;
    /**
     * 신규 납입과 같이 좌측 요약 카드(px-4 py-4)와 높이를 맞출 때:
     * 패딩 고정·막대 영역만 flex-grow (부모는 grid row-span으로 높이 고정)
     */
    alignToFlowCards?: boolean;
}

const defaultFormatter = (v: number) => String(v);

function formatBarLabel(label: string): string {
    if (label.includes("-")) {
        const monthPart = label.split("-").pop() ?? "";
        const m = parseInt(monthPart, 10);
        return Number.isNaN(m) ? monthPart.charAt(0) : `${m}월`;
    }
    return label.charAt(0);
}

export function MiniChart({
    data,
    valueFormatter = defaultFormatter,
    suffix = true,
    title = "ACTIVITY",
    className,
    alignToFlowCards = false,
}: MiniChartProps) {
    const barColumnClassName = useMemo(() => {
        const n = data.length;
        if (n >= 12) return "w-4 shrink-0";
        if (n >= 6) return "w-6 shrink-0";
        return "w-8 max-w-[2rem] shrink-0";
    }, [data.length]);

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [displayValue, setDisplayValue] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState(false);

    const maxValue = Math.max(...data.map((d) => d.value), 1);

    useEffect(() => {
        if (hoveredIndex !== null && data[hoveredIndex]) {
            setDisplayValue(data[hoveredIndex].value);
        }
    }, [hoveredIndex, data]);

    const handleContainerEnter = () => setIsHovering(true);
    const handleContainerLeave = () => {
        setIsHovering(false);
        setHoveredIndex(null);
        setTimeout(() => {
            setDisplayValue(null);
        }, 150);
    };

    const formattedHeader =
        displayValue !== null ? valueFormatter(displayValue) : "";

    if (data.length === 0) {
        return (
            <div
                className={cn(
                    "rounded-2xl border p-4 text-sm sm:p-5 md:p-6",
                    className,
                )}
                style={{
                    borderColor: "var(--ah-border)",
                    background: "var(--ah-card)",
                    color: "var(--ah-text-muted)",
                }}
            >
                납입 데이터 없음
            </div>
        );
    }

    const barMaxPx = 96;

    return (
        <div
            onMouseEnter={handleContainerEnter}
            onMouseLeave={handleContainerLeave}
            className={cn(
                "group relative flex min-h-0 flex-col rounded-2xl border border-[var(--ah-border)] bg-transparent",
                alignToFlowCards
                    ? "min-h-0 p-4 lg:h-full"
                    : "h-auto p-4 sm:p-5 md:p-6 lg:h-full",
                className,
            )}
        >
            <div
                className={cn(
                    "flex shrink-0 items-center justify-between",
                    alignToFlowCards ? "mb-3" : "mb-4 sm:mb-5",
                )}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="h-2 w-2 shrink-0 rounded-full bg-primary"
                    />
                    <span
                        className="text-xs uppercase tracking-wide"
                        style={{ color: "var(--ah-text-muted)" }}
                    >
                        {title}
                    </span>
                </div>
                <div className="relative flex h-7 items-center">
                    <span
                        className={cn(
                            "text-lg font-semibold tabular-nums transition-all duration-300 ease-out",
                            isHovering && displayValue !== null
                                ? "opacity-100"
                                : "opacity-50",
                        )}
                        style={{
                            color:
                                isHovering && displayValue !== null
                                    ? "var(--ah-text-pri)"
                                    : "var(--ah-text-muted)",
                        }}
                    >
                        {formattedHeader}
                        {suffix ? (
                            <span
                                className={cn(
                                    "ml-0.5 text-xs font-normal transition-opacity duration-300",
                                    displayValue !== null
                                        ? "opacity-100"
                                        : "opacity-0",
                                )}
                                style={{ color: "var(--ah-text-muted)" }}
                            >
                                %
                            </span>
                        ) : null}
                    </span>
                </div>
            </div>

            <div
                className={cn(
                    /* overflow-hidden 제거: 호버 scale 시 상단·툴팁 잘림 방지 */
                    "flex items-end justify-center gap-1.5 pb-px",
                    alignToFlowCards
                        ? "min-h-0 flex-1"
                        : "min-h-[5.75rem] flex-none lg:min-h-0 lg:flex-1",
                )}
            >
                {data.map((item, index) => {
                    const heightPx = (item.value / maxValue) * barMaxPx;
                    const isHovered = hoveredIndex === index;
                    const isNeighbor =
                        hoveredIndex !== null &&
                        (index === hoveredIndex - 1 ||
                            index === hoveredIndex + 1);

                    const isAnyHovered = hoveredIndex !== null;

                    return (
                        <div
                            key={`${item.label}-${index}`}
                            className={cn(
                                "relative flex h-full min-w-0 flex-col items-center justify-end",
                                barColumnClassName,
                            )}
                            onMouseEnter={() => setHoveredIndex(index)}
                        >
                            <div
                                className={cn(
                                    "w-full origin-bottom cursor-pointer rounded-full transition-all duration-300 ease-out",
                                    isHovered
                                        ? barBgHoverPri
                                        : isNeighbor
                                          ? barBgNeighbor
                                          : isAnyHovered
                                            ? cn(barBgDefault, "opacity-40")
                                            : barBgDefault,
                                )}
                                style={{
                                    height: `${heightPx}px`,
                                    /* origin-bottom + scaleY는 상단이 부모에 잘리므로 가로만 확대 */
                                    transform: isHovered
                                        ? "scaleX(1.12)"
                                        : isNeighbor
                                          ? "scaleX(1.05)"
                                          : "scaleX(1)",
                                }}
                            />

                            <span
                                className="mt-2 text-xs font-medium transition-all duration-300"
                                style={{
                                    color: isHovered
                                        ? "var(--ah-text-pri)"
                                        : "var(--ah-text-muted)",
                                }}
                            >
                                {formatBarLabel(item.label)}
                            </span>

                            <div
                                className={cn(
                                    "pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition-all duration-200",
                                    isHovered
                                        ? "translate-y-0 opacity-100"
                                        : "translate-y-1 opacity-0",
                                )}
                                style={{
                                    background: "var(--foreground)",
                                    color: "var(--background)",
                                }}
                            >
                                {valueFormatter(item.value)}
                                {suffix ? "%" : ""}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-black/[0.04] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-white/[0.06]" />
        </div>
    );
}
