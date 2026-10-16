"use client";

import { type CSSProperties, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPE_LABEL, type DashboardAccountGroupFilter } from "@/lib/accountGroups";
import { portfolioTickerAccountKey, type TickerDeviationItem } from "@/lib/role-allocation";
import { AnimatedAccordion } from "@/components/ui/animated-accordion";
import { DeviationProgressBar } from "@/components/ui/animated-progress";
import { DashboardSectionCard } from "./dashboard-section-card";

export interface RebalanceGroup {
  key: string;
  title: string;
  data: TickerDeviationItem[];
}

interface RebalanceInsightProps {
  groups: RebalanceGroup[];
  normalCount: number;
  overCount: number;
  underCount: number;
  configuredTargetKeys: ReadonlySet<string>;
  loading?: boolean;
  emptyMessage?: string | null;
  groupKey?: DashboardAccountGroupFilter;
  index?: number;
}

const DEVIATION_THRESHOLD = 5;

function deviationItemKey(item: TickerDeviationItem): string {
  return portfolioTickerAccountKey(item.ticker, item.accountType);
}

function isTargetConfigured(
  item: TickerDeviationItem,
  configuredKeys: ReadonlySet<string>,
): boolean {
  return configuredKeys.has(deviationItemKey(item));
}

function isNormal(diff: number) {
  return Math.abs(diff) < DEVIATION_THRESHOLD;
}

function actionIntensity(absDiff: number): number {
  if (absDiff >= 15) return 1;
  if (absDiff >= 10) return 0.78;
  return 0.55;
}

/** 매도=빨강, 매수=초록 */
function actionBadgeStyle(tone: "over" | "under", intensity: number): CSSProperties {
  const base =
    tone === "over"
      ? { background: "var(--down-soft)", color: "var(--down)" }
      : { background: "var(--up-soft)", color: "var(--up)" };
  return {
    ...base,
    opacity: 0.72 + intensity * 0.28,
    fontWeight: intensity >= 0.78 ? 700 : 600,
  };
}

function splitGroupData(
  data: TickerDeviationItem[],
  configuredKeys: ReadonlySet<string>,
) {
  const unset: TickerDeviationItem[] = [];
  const action: TickerDeviationItem[] = [];
  const normal: TickerDeviationItem[] = [];

  for (const d of data) {
    if (!isTargetConfigured(d, configuredKeys)) {
      unset.push(d);
      continue;
    }
    if (isNormal(d.diff)) normal.push(d);
    else action.push(d);
  }

  action.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return { unset, action, normal };
}

function AccountBadge({ accountType }: { accountType: TickerDeviationItem["accountType"] }) {
  if (!accountType) return null;
  return (
    <span className="shrink-0 rounded px-1 py-px text-[8px] font-medium uppercase tracking-wide text-foreground/40">
      {ACCOUNT_TYPE_LABEL[accountType]}
    </span>
  );
}

function ActionRow({
  item,
  maxAbs,
  animIndex,
}: {
  item: TickerDeviationItem;
  maxAbs: number;
  animIndex: number;
}) {
  const isOver = item.diff >= DEVIATION_THRESHOLD;
  const absD = Math.abs(item.diff);
  const intensity = actionIntensity(absD);
  const fillPercent = Math.min((absD / maxAbs) * 50, 50);
  const tone = isOver ? "over" : "under";
  const actionLabel = isOver ? "매도 고려" : "매수 고려";

  return (
    <div
      className="grid grid-cols-1 items-center gap-2 rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-foreground/[0.04] sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] sm:gap-3"
      title={`${item.displayLabel} · ${Math.round(item.actualWeight)}% → ${Math.round(item.targetWeight)}%`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-semibold text-foreground/90">
            {item.displayLabel}
          </span>
          <AccountBadge accountType={item.accountType} />
        </div>
        <p className="mt-0.5 text-[10px] tabular-nums text-foreground/45">
          현재 {Math.round(item.actualWeight)}% → 목표 {Math.round(item.targetWeight)}%
        </p>
      </div>

      <DeviationProgressBar
        fillPercent={fillPercent}
        tone={tone}
        intensity={intensity}
        animDelay={animIndex * 0.06}
      />

      <div className="flex sm:justify-end">
        <span
          className="inline-flex rounded-full px-2 py-0.5 text-[10px] tabular-nums tracking-tight"
          style={actionBadgeStyle(tone, intensity)}
        >
          {actionLabel}
        </span>
      </div>
    </div>
  );
}

function NormalRow({ item }: { item: TickerDeviationItem }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[11px] text-foreground/40">{item.displayLabel}</span>
        <AccountBadge accountType={item.accountType} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] text-foreground/30">유지</span>
        <span className="text-[10px] tabular-nums text-foreground/35">
          {Math.round(item.actualWeight)}%
        </span>
      </div>
    </div>
  );
}

function UnsetRow({ item }: { item: TickerDeviationItem }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[11px] text-foreground/45">{item.displayLabel}</span>
          <AccountBadge accountType={item.accountType} />
        </div>
        <p className="mt-0.5 text-[10px] tabular-nums text-foreground/30">
          현재 {Math.round(item.actualWeight)}% · 목표 미설정
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
          color: "color-mix(in oklab, var(--foreground) 45%, transparent)",
        }}
      >
        미설정
      </span>
    </div>
  );
}

function GroupContent({
  group,
  configuredKeys,
}: {
  group: RebalanceGroup;
  configuredKeys: ReadonlySet<string>;
}) {
  const { action, normal } = useMemo(
    () => splitGroupData(group.data, configuredKeys),
    [group.data, configuredKeys],
  );

  if (!action.length && !normal.length) return null;

  const maxAbs = Math.max(
    ...action.map((d) => Math.abs(d.diff)),
    DEVIATION_THRESHOLD,
  );

  return (
    <>
      {action.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {action.map((item, i) => (
            <ActionRow
              key={`${item.ticker}-${item.accountType}-${i}`}
              item={item}
              maxAbs={maxAbs}
              animIndex={i}
            />
          ))}
        </div>
      )}

      {normal.length > 0 && (
        <AnimatedAccordion
          title={`정상 ${normal.length}개 보기`}
          className={cn(action.length > 0 && "mt-2.5")}
        >
          <div className="flex flex-col divide-y divide-border/20">
            {normal.map((item, i) => (
              <NormalRow key={`${item.ticker}-${item.accountType}-${i}`} item={item} />
            ))}
          </div>
        </AnimatedAccordion>
      )}
    </>
  );
}

function UnsetSection({
  items,
  className,
}: {
  items: TickerDeviationItem[];
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <AnimatedAccordion title={`미설정 ${items.length}개`} className={className}>
      <div className="flex flex-col divide-y divide-border/15">
        {items.map((item, i) => (
          <UnsetRow key={`${item.ticker}-${item.accountType}-${i}`} item={item} />
        ))}
      </div>
    </AnimatedAccordion>
  );
}

export function RebalanceInsight({
  groups,
  configuredTargetKeys,
  loading,
  emptyMessage,
  groupKey = "all",
  index = 1,
}: RebalanceInsightProps) {
  const isAllAccounts = groupKey === "all";

  const { adjustCount, normalCount, overCount, underCount, allUnset } = useMemo(() => {
    let normal = 0;
    let over = 0;
    let under = 0;
    const unset: TickerDeviationItem[] = [];

    for (const g of groups) {
      const split = splitGroupData(g.data, configuredTargetKeys);
      normal += split.normal.length;
      over += split.action.filter((d) => d.diff >= DEVIATION_THRESHOLD).length;
      under += split.action.filter((d) => d.diff <= -DEVIATION_THRESHOLD).length;
      unset.push(...split.unset);
    }

    return {
      adjustCount: over + under,
      normalCount: normal,
      overCount: over,
      underCount: under,
      allUnset: unset,
    };
  }, [groups, configuredTargetKeys]);

  const scrollableBody = isAllAccounts;

  return (
    <DashboardSectionCard
      index={index}
      label="Rebalancing"
      labelClassName="text-lg font-normal normal-case tracking-normal text-muted-foreground"
      className="h-full"
    >
      {loading ? (
        <div className="h-full min-h-[14rem] animate-pulse rounded-xl bg-foreground/[0.04]" />
      ) : emptyMessage ? (
        <p className="py-8 text-center text-sm text-foreground/45">{emptyMessage}</p>
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex shrink-0 items-baseline justify-between gap-3">
            <p className="text-sm text-foreground/70">
              {adjustCount > 0 ? (
                <>
                  <span className="font-semibold tabular-nums text-foreground">{adjustCount}</span>
                  {" "}개 종목 조정 권장
                </>
              ) : (
                "모든 종목이 목표 범위 내입니다"
              )}
            </p>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[10px] text-foreground/45">
              <span>
                Normal{" "}
                <span className="font-semibold tabular-nums text-foreground/75">{normalCount}</span>
              </span>
              <span aria-hidden>·</span>
              <span>
                Over{" "}
                <span className="font-semibold tabular-nums text-red-500 dark:text-red-400">
                  {overCount}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>
                Under{" "}
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {underCount}
                </span>
              </span>
            </div>
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-2",
              scrollableBody && "overflow-y-auto pr-0.5",
              !scrollableBody && "overflow-y-auto",
            )}
          >
            {isAllAccounts ? (
              <>
                {groups.map((g) => {
                  const hasContent = splitGroupData(g.data, configuredTargetKeys);
                  if (
                    !hasContent.action.length &&
                    !hasContent.normal.length
                  ) {
                    return null;
                  }

                  return (
                    <AnimatedAccordion
                      key={g.key}
                      title={g.title}
                    >
                      <GroupContent group={g} configuredKeys={configuredTargetKeys} />
                    </AnimatedAccordion>
                  );
                })}
                <UnsetSection items={allUnset} className="mt-0.5" />
              </>
            ) : (
              <>
                {groups.map((g) => (
                  <GroupContent
                    key={g.key}
                    group={g}
                    configuredKeys={configuredTargetKeys}
                  />
                ))}
                <UnsetSection items={allUnset} className="mt-0.5" />
              </>
            )}
          </div>
        </div>
      )}
    </DashboardSectionCard>
  );
}
