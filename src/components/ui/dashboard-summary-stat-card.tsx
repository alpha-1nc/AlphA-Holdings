"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardSummaryStatCardProps {
  title: string;
  value: string;
  delta: number;
  deltaUnit?: "percent" | "points";
  /** 직전 분기 대비 증감 배지 표시 (분기 시계열 2개 미만이면 false 권장) */
  showDeltaBadge?: boolean;
  /** 카드 하단 보조 문구 (미전달 시 영역 생략) */
  footerLine?: string;
  trendData?: number[];
  isPositive?: boolean;
  className?: string;
}

function formatDeltaBadge(delta: number, unit: "percent" | "points"): string {
  const suffix = unit === "points" ? "%p" : "%";
  const r = Math.round(delta);
  if (r === 0) return `0${suffix}`;
  const sign = delta > 0 ? "+" : "-";
  return `${sign}${Math.abs(r)}${suffix}`;
}

/** 래퍼런스(StatsWidget)와 동일: 중점 제어점으로 매끄러운 컨티뉴이티 C 곡선 */
function generateSmoothPath(
  points: number[],
  width: number,
  height: number,
): string {
  if (!points || points.length < 2) {
    return `M 0 ${height}`;
  }

  const xStep = width / (points.length - 1);
  const pathData = points.map((point, i) => {
    const x = i * xStep;
    const y =
      height - (point / 100) * (height * 0.8) - height * 0.1;
    return [x, y] as const;
  });

  let path = `M ${pathData[0][0]} ${pathData[0][1]}`;

  for (let i = 0; i < pathData.length - 1; i++) {
    const x1 = pathData[i][0];
    const y1 = pathData[i][1];
    const x2 = pathData[i + 1][0];
    const y2 = pathData[i + 1][1];
    const midX = (x1 + x2) / 2;
    path += ` C ${midX},${y1} ${midX},${y2} ${x2},${y2}`;
  }

  return path;
}

function normalizeToHundred(raw: number[]): number[] {
  if (raw.length < 2) return raw;
  const finite = raw.filter((n) => Number.isFinite(n));
  if (finite.length < 2) return raw.map(() => 50);
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (max === min) {
    return raw.map(() => 50);
  }
  return raw.map((n) =>
    Number.isFinite(n) ? ((n - min) / (max - min)) * 100 : 50,
  );
}

const SVG_W = 150;
const SVG_H = 60;

function StatsWidgetSpark({
  chartPoints,
  positive,
}: {
  chartPoints: number[];
  positive: boolean;
}) {
  const linePathRef = useRef<SVGPathElement>(null);
  const areaPathRef = useRef<SVGPathElement>(null);
  const uid = useId().replace(/:/g, "");
  const gradId = `areaSpark-${uid}`;

  const linePath = useMemo(
    () => generateSmoothPath(chartPoints, SVG_W, SVG_H),
    [chartPoints],
  );

  const areaPath = useMemo(() => {
    if (!linePath.startsWith("M")) return "";
    return `${linePath} L ${SVG_W} ${SVG_H} L 0 ${SVG_H} Z`;
  }, [linePath]);

  useEffect(() => {
    const path = linePathRef.current;
    const area = areaPathRef.current;

    if (path && area) {
      const length = path.getTotalLength();
      path.style.transition = "none";
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = `${length}`;

      area.style.transition = "none";
      area.style.opacity = "0";

      path.getBoundingClientRect();

      path.style.transition =
        "stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease";
      path.style.strokeDashoffset = "0";

      area.style.transition = "opacity 0.8s ease-in-out 0.2s, fill 0.5s ease";
      area.style.opacity = "1";
    }
  }, [linePath]);

  return (
    <div
      className={cn(
        "h-16 min-h-16 w-full overflow-hidden rounded-md",
        positive
          ? "[--spark-stroke:var(--dashboard-spark-success)]"
          : "[--spark-stroke:var(--dashboard-spark-negative)]",
      )}
    >
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--spark-stroke)"
              stopOpacity={0.4}
            />
            <stop
              offset="100%"
              stopColor="var(--spark-stroke)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <path ref={areaPathRef} d={areaPath} fill={`url(#${gradId})`} />
        <path
          ref={linePathRef}
          d={linePath}
          fill="none"
          stroke="var(--spark-stroke)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function DashboardSummaryStatCard({
  title,
  value,
  delta,
  deltaUnit = "percent",
  showDeltaBadge = true,
  footerLine: footerLineProp,
  trendData,
  isPositive: isPositiveProp,
  className,
}: DashboardSummaryStatCardProps) {
  const footerLine = footerLineProp?.trim();
  const badgePositive = isPositiveProp ?? delta >= 0;
  const sparkPositive = badgePositive;
  const badgeText = formatDeltaBadge(delta, deltaUnit);

  const normalizedTrend = useMemo(() => {
    if (!trendData || trendData.length < 2) return null;
    return normalizeToHundred(trendData);
  }, [trendData]);

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col rounded-3xl border p-6 shadow-lg",
        "border-[var(--ah-border)] bg-[var(--ah-card)] text-[var(--ah-text-pri)] transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          normalizedTrend != null
            ? "flex-col sm:flex-row sm:items-center sm:justify-between"
            : "",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col",
            normalizedTrend != null ? "w-full sm:w-1/2 sm:shrink-0" : "w-full",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-normal text-[var(--ah-text-muted)]">{title}</span>
            {showDeltaBadge && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold tabular-nums",
                  badgePositive
                    ? "text-[var(--dashboard-spark-success)]"
                    : "text-[var(--dashboard-spark-negative)]",
                )}
              >
                {badgeText}
                {badgePositive ? (
                  <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <ArrowDown className="h-4 w-4 shrink-0" aria-hidden />
                )}
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
            {value}
          </p>
        </div>

        {normalizedTrend != null && (
          <div className="mt-3 w-full min-w-[8rem] sm:mt-0 sm:h-16 sm:w-1/2 sm:max-w-[50%]">
            <StatsWidgetSpark chartPoints={normalizedTrend} positive={sparkPositive} />
          </div>
        )}
      </div>

      {footerLine ? (
        <p className="mt-3 text-[11px] leading-snug text-[var(--ah-text-muted)]">
          {footerLine}
        </p>
      ) : null}
    </div>
  );
}
