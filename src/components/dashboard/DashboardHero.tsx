"use client";

import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { NativeCounterUp } from "@/components/ui/native-counter-up";
import { cn } from "@/lib/utils";
import { AccountGlassSwitcher } from "./AccountGlassSwitcher";
import { HeroSparkline, type HeroSparklinePoint } from "./HeroSparkline";
import { krwFull } from "@/lib/dashboard-format";
import type { DashboardAccountGroupFilter } from "@/lib/accountGroups";

interface DashboardHeroProps {
  current: number;
  invested: number;
  profit: number;
  /** 수익률(%) */
  returnRate: number;
  hasData: boolean;
  loading: boolean;
  /** 보유 평가금이 있는지 (연금 등 N/A 판별) */
  hasHoldingsValue: boolean;
  lastSyncedCaption: string;
  group: DashboardAccountGroupFilter;
  onGroupChange: (g: DashboardAccountGroupFilter) => void;
  syncing: boolean;
  onSync: () => void;
  /** 스냅샷 기반 자산 추이 (표시용) */
  sparklinePoints: HeroSparklinePoint[];
  /** 연금 등 수동 입력 보유 안내 */
  manualInputNote?: string | null;
}

/**
 * 히어로 — 숫자 + 미니 스파크라인, 미니멀 톤.
 */
export function DashboardHero({
  current,
  invested,
  profit,
  returnRate,
  hasData,
  loading,
  hasHoldingsValue,
  lastSyncedCaption,
  group,
  onGroupChange,
  syncing,
  onSync,
  sparklinePoints,
  manualInputNote,
}: DashboardHeroProps) {
  const isUp = profit >= 0;
  const showValue = hasData && !loading;
  const heroLabel = hasHoldingsValue ? "Total Value" : "Total Invested";
  const heroValue = hasHoldingsValue ? current : invested;

  return (
    <section className="relative px-1 pt-2 pb-2 sm:px-2 sm:pt-4 sm:pb-4">
      {/* 상단: 좌측 숫자 · 우측 스파크라인 */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
        <div className="min-w-0 flex-1">
          <p className="text-lg text-muted-foreground">{heroLabel}</p>

          <div className="relative mt-2 sm:mt-2.5">
            {showValue ? (
              <NativeCounterUp
                key={`hero-${group}-${heroValue}`}
                value={heroValue}
                prefix="₩"
                duration={2}
                className="num-hero-md block font-semibold text-foreground"
                label={heroLabel}
              />
            ) : (
              <div className="h-[clamp(32px,5.5vw,56px)] w-3/4 max-w-sm animate-pulse rounded-xl bg-muted/40" />
            )}
          </div>

          {/* 수익금 · 수익률 — 큰 숫자 바로 아래 타이트 */}
          <motion.div
            className="mt-1.5 min-h-7"
            key={`profit-row-${group}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            {showValue && hasHoldingsValue ? (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-base font-semibold tabular-nums sm:text-lg",
                  isUp
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400",
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {isUp ? (
                    <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <NativeCounterUp
                    key={`profit-${group}-${profit}`}
                    value={Math.abs(profit)}
                    prefix={profit >= 0 ? "+₩" : "-₩"}
                    duration={1.4}
                    className="font-semibold"
                  />
                </span>
                <span aria-hidden className="text-foreground/25">
                  ·
                </span>
                <NativeCounterUp
                  key={`rate-${group}-${returnRate}`}
                  value={returnRate}
                  prefix={returnRate >= 0 ? "+" : ""}
                  suffix="%"
                  decimals={2}
                  duration={1.4}
                  className="font-semibold"
                />
              </div>
            ) : showValue && !hasHoldingsValue ? (
              <span className="inline-flex items-center rounded-full bg-muted/50 px-3 py-1 text-sm font-medium text-foreground/50">
                보유 종목 없음
              </span>
            ) : (
              <div className="h-5 w-36 animate-pulse rounded-md bg-muted/40" />
            )}
          </motion.div>

          {/* 보조 메타 — 작게 한 줄 */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-foreground/35 sm:text-[11px]">
            {hasHoldingsValue && (
              <span>
                총 납입액{" "}
                <span className="font-medium tabular-nums text-foreground/50">
                  {showValue ? krwFull(invested) : "—"}
                </span>
              </span>
            )}
            {hasHoldingsValue && (
              <span aria-hidden className="text-foreground/20">
                ·
              </span>
            )}
            <span>{lastSyncedCaption}</span>
            {manualInputNote ? (
              <>
                <span aria-hidden className="text-foreground/20">
                  ·
                </span>
                <span className="text-foreground/45">{manualInputNote}</span>
              </>
            ) : null}
            <span aria-hidden className="text-foreground/20">
              ·
            </span>
            <button
              type="button"
              disabled={syncing}
              onClick={onSync}
              className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-transparent px-2 py-0.5 font-medium text-foreground/40 transition hover:border-border/50 hover:text-foreground/60 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              새로고침
            </button>
          </div>
        </div>

        {/* 우측 스파크라인 */}
        <div className="w-full lg:w-[min(42%,360px)] lg:shrink-0 xl:w-[min(40%,380px)]">
          <HeroSparkline points={sparklinePoints} />
        </div>
      </div>

      {/* 계좌 스위처 — 풀폭 하단 */}
      <div className="mt-6 w-full sm:mt-7 sm:max-w-xl">
        <AccountGlassSwitcher
          value={group}
          onValueChange={onGroupChange}
          size="hero"
        />
      </div>
    </section>
  );
}
