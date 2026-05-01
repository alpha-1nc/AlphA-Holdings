"use client";

import type { TickerDeviationItem } from "@/lib/role-allocation";
import { getTickerColor } from "@/constants/brandColors";
import { ACCOUNT_TYPE_LABEL } from "@/lib/accountGroups";

interface TargetVsActualBarProps {
  data: TickerDeviationItem[];
  /** 직투 그룹 등 — 종목 행에 계좌 뱃지(🇺🇸/🇰🇷/🇯🇵) 표시 */
  showAccountBadges?: boolean;
}

function getDiffColor(diff: number): string {
  const abs = Math.abs(diff);
  if (abs < 5) return "text-[var(--neutral-state)]";
  if (diff > 0) return "text-[var(--positive)]"; // 초과 / 과대
  return "text-[var(--negative)]"; // 부족 / 과소
}

function getBarAccentColor(diff: number): string {
  const abs = Math.abs(diff);
  if (abs < 5) return "var(--neutral-state)";
  if (diff > 0) return "var(--positive)";
  return "var(--negative)";
}

function getDiffLabel(diff: number): string {
  const abs = Math.abs(diff);
  if (abs < 5) return "정상";
  if (diff > 0) return `+${Math.round(diff)}% 초과`;
  return `${Math.round(diff)}% 부족`;
}

interface TickerRowProps {
  item: TickerDeviationItem;
  index: number;
  showAccountBadge?: boolean;
}

function TickerRow({ item, index, showAccountBadge }: TickerRowProps) {
  const diff = item.diff;
  const diffColor = getDiffColor(diff);
  const accentColor = getBarAccentColor(diff);
  const tickerColor = getTickerColor(item.ticker, index);

  const actualPct = Math.min(
    100,
    Math.max(0, Number(item.actualWeight) || 0),
  );
  const targetPct = Math.min(
    100,
    Math.max(0, Number(item.targetWeight) || 0),
  );

  const hasTarget = (Number(item.targetWeight) || 0) > 0;

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: tickerColor }}
          />
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            {item.displayLabel}
            {item.displayLabel.trim().toUpperCase() !== item.ticker.trim().toUpperCase() && (
              <span className="ml-1 font-mono text-[10px] font-normal text-neutral-500 dark:text-neutral-400">
                ({item.ticker})
              </span>
            )}
            {showAccountBadge && (
              <span className="ml-1.5 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                {ACCOUNT_TYPE_LABEL[item.accountType]}
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 sm:justify-end">
          {hasTarget && (
            <span className={`text-[10px] font-medium ${diffColor}`}>
              {getDiffLabel(diff)}
            </span>
          )}
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
            현재 {Math.round(item.actualWeight)}%
            {hasTarget && ` / 목표 ${Math.round(item.targetWeight)}%`}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-4 w-full overflow-visible rounded-full bg-neutral-100 dark:bg-neutral-800">
        {/* Actual weight fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${actualPct}%`,
            background: accentColor,
            opacity: 0.85,
          }}
        />

        {/* Target marker */}
        {hasTarget && targetPct > 0 && (
          <div
            className="absolute inset-y-[-3px] w-[2px] rounded-full bg-neutral-600 dark:bg-neutral-300 z-10"
            style={{ left: `calc(${targetPct}% - 1px)` }}
            title={`목표 ${Math.round(item.targetWeight)}%`}
          />
        )}
      </div>

      {/* Sub-legend */}
      {hasTarget && (
        <div className="flex items-center gap-3 pl-0.5">
          <div className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-3 rounded-sm opacity-85"
              style={{ background: accentColor }}
            />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              현재 {Math.round(item.actualWeight)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-[2px] rounded-full bg-neutral-500 dark:bg-neutral-400" />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              목표 {Math.round(item.targetWeight)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function TargetVsActualBar({ data, showAccountBadges }: TargetVsActualBarProps) {
  if (!data.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          설정에서 종목별 목표 비중을 지정하면
        </p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          리밸런싱 힌트가 표시됩니다
        </p>
      </div>
    );
  }

  const totalTarget = data.reduce((s, d) => s + d.targetWeight, 0);

  return (
    <div className="flex flex-col gap-4">
      {data.map((item, idx) => (
        <TickerRow
          key={`${item.ticker}-${item.accountType}-${idx}`}
          item={item}
          index={idx}
          showAccountBadge={showAccountBadges}
        />
      ))}

      {/* Total target weight hint */}
      {totalTarget > 0 && (
        <div className="mt-1 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
            목표 비중 합계
          </span>
          <span
            className={`text-[10px] font-semibold ${
              Math.abs(totalTarget - 100) < 1
                ? "text-[var(--positive)]"
                : "text-[var(--negative)]"
            }`}
          >
            {Math.round(totalTarget)}%
            {Math.abs(totalTarget - 100) >= 1 && " (100% 아님)"}
          </span>
        </div>
      )}
    </div>
  );
}
