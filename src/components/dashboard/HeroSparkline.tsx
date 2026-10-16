"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipValueType,
} from "recharts";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const hoverTransition = { duration: 0.2 } as const;

export type HeroSparklinePoint = { name: string; value: number; tooltipLabel?: string };

interface HeroSparklineProps {
  points: HeroSparklinePoint[];
  className?: string;
}

function formatKRWTooltip(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

/** 히어로 우측 주간 총자산 추이 — 축 없는 스파크라인 */
export function HeroSparkline({ points, className }: HeroSparklineProps) {
  const reduceMotion = useReducedMotion();

  const hasEnough = points.length >= 2;
  const chartData = useMemo(() => points, [points]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.42, ease, delay: 0.05 }
      }
      whileHover={reduceMotion ? undefined : { y: -4, transition: hoverTransition }}
      className={cn(
        "surface-card group relative flex min-h-[168px] flex-col overflow-hidden p-3 pl-4 transition-all hover:border-border/60 hover:shadow-lg sm:min-h-[180px] sm:p-4 sm:pl-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-foreground/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex flex-col">
        <div className="mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/35">
            Asset Trend
          </span>
        </div>

        {hasEnough ? (
          <div className="h-[120px] w-full sm:h-[140px]">
            <ResponsiveContainer width="100%" height="100%" debounce={32}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  labelFormatter={(_label, payload) => {
                    const row = payload?.[0]?.payload as HeroSparklinePoint | undefined;
                    return row?.tooltipLabel ?? row?.name ?? _label;
                  }}
                  separator=""
                  formatter={(value: TooltipValueType | undefined): [string, string] => {
                    const numericValue = typeof value === "number" ? value : Number(value);
                    return [formatKRWTooltip(numericValue), ""];
                  }}
                />
                <Line
                  type="natural"
                  dataKey="value"
                  stroke="var(--foreground)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  isAnimationActive
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[120px] items-center justify-center text-sm text-foreground/40 sm:h-[140px]">
            Data will appear as snapshots accumulate
          </div>
        )}
      </div>
    </motion.div>
  );
}
