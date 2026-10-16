"use client";

import { BarChart3, Coins, Layers, TrendingUp } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { krwSignedFull, pctSigned } from "@/lib/dashboard-format";

interface DashboardSideMetricsProps {
  profit: number;
  returnRate: number;
  dailyProfit: number;
  holdingCount: number;
  loading?: boolean;
  groupKey: string;
}

/** 히어로 아래 — 핵심 지표 4카드 그리드 (MetricCard 스타일) */
export function DashboardSideMetrics({
  profit,
  returnRate,
  dailyProfit,
  holdingCount,
  loading,
  groupKey,
}: DashboardSideMetricsProps) {
  const isUp = profit >= 0;
  const dailyUp = dailyProfit >= 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[148px] animate-pulse rounded-2xl border border-border/40 bg-background/60"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
      key={`metrics-${groupKey}`}
    >
      <MetricCard
        icon={TrendingUp}
        label="누적 수익률"
        trend={isUp ? "up" : "down"}
        trendLabel={pctSigned(returnRate)}
        index={0}
      >
        <span
          className={
            isUp
              ? "text-emerald-500 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"
          }
        >
          {pctSigned(returnRate)}
        </span>
      </MetricCard>

      <MetricCard
        icon={Coins}
        label="누적 수익금"
        trend={isUp ? "up" : "down"}
        index={1}
      >
        <span
          className={
            isUp
              ? "text-emerald-500 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"
          }
        >
          {krwSignedFull(profit)}
        </span>
      </MetricCard>

      <MetricCard
        icon={BarChart3}
        label="일일 손익"
        trend={dailyUp ? "up" : "down"}
        index={2}
      >
        <span
          className={
            dailyUp
              ? "text-emerald-500 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"
          }
        >
          {krwSignedFull(dailyProfit)}
        </span>
      </MetricCard>

      <MetricCard icon={Layers} label="보유 종목" index={3}>
        <span>
          {holdingCount}
          <span className="ml-1.5 text-base font-medium text-foreground/50">
            종목
          </span>
        </span>
      </MetricCard>
    </div>
  );
}
