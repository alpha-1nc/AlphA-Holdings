"use client";

import { AccountType } from "@/generated/prisma";
import { getGroupKey, ACCOUNT_TYPE_LABEL } from "@/lib/accountGroups";
import { cn } from "@/lib/utils";
import type { TickerDeviationItem } from "@/lib/role-allocation";
import { motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";

type Tone = "ok" | "over" | "under";

function toneFrom(diff: number): Tone {
  if (Math.abs(diff) < 5) return "ok";
  return diff > 0 ? "over" : "under";
}

function toneColor(tone: Tone): string {
  if (tone === "ok") return "var(--ah-text-muted)";
  if (tone === "over") return "var(--dashboard-spark-success)";
  return "var(--dashboard-spark-negative)";
}

function tonePillBg(tone: Tone): string {
  if (tone === "ok") return "color-mix(in oklab, var(--ah-text-muted) 12%, transparent)";
  if (tone === "over") return "color-mix(in oklab, var(--dashboard-spark-success) 16%, transparent)";
  return "color-mix(in oklab, var(--dashboard-spark-negative) 16%, transparent)";
}

function compactAccountLabel(accountType: AccountType): string {
  const g = getGroupKey(accountType);
  if (g === "연금저축") return "연금";
  if (g) return g;
  return ACCOUNT_TYPE_LABEL[accountType];
}

function diffLabel(diff: number): string {
  const r = Math.round(diff);
  if (r === 0) return "±0%";
  return `${r >= 0 ? "+" : ""}${r}%`;
}

function usePortalTooltip(lines: string[]) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const updatePos = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.bottom + 8 });
  }, []);

  const show = useCallback(() => {
    updatePos();
    setOpen(true);
  }, [updatePos]);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, hide, updatePos]);

  const portal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed z-[400] w-[min(17rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border px-3 py-2 text-[11px] leading-snug shadow-2xl backdrop-blur-sm"
            style={{
              left: pos.x,
              top: pos.y,
              borderColor: "var(--ah-border)",
              background: "color-mix(in oklab, var(--ah-card) 94%, transparent)",
              color: "var(--ah-text-pri)",
            }}
            role="tooltip"
          >
            {lines.map((l, i) => (
              <p
                key={i}
                className={
                  i === 0 ? "font-semibold" : i === 1 ? "mt-1 text-[var(--ah-text-muted)]" : "mt-0.5"
                }
              >
                {l}
              </p>
            ))}
          </div>,
          document.body,
        )
      : null;

  return { anchorRef, show, hide, portal };
}

/** 같은 스케일에서 실제(막대)·목표(마커) 비교 */
function MicroScaleBar({
  item,
  tone,
  animDelay,
}: {
  item: TickerDeviationItem;
  tone: Tone;
  animDelay: number;
}) {
  const reduceMotion = useReducedMotion();
  const scaleMax = Math.max(item.actualWeight, item.targetWeight, 2.5);
  const targetPct = Math.min(100, (item.targetWeight / scaleMax) * 100);
  const actualPct = Math.min(100, (item.actualWeight / scaleMax) * 100);
  const fill = toneColor(tone);

  return (
    <div
      className="relative h-2 w-[4.25rem] shrink-0 overflow-hidden rounded-full"
      style={{ background: "color-mix(in oklab, var(--ah-border) 55%, transparent)" }}
      aria-hidden
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background:
            tone === "ok"
              ? "color-mix(in oklab, var(--ah-text-muted) 35%, var(--ah-border))"
              : fill,
        }}
        initial={{ width: reduceMotion ? `${actualPct}%` : 0 }}
        animate={{ width: `${actualPct}%` }}
        transition={{
          duration: reduceMotion ? 0 : 0.55,
          ease: [0.16, 1, 0.3, 1],
          delay: animDelay,
        }}
      />
      {/* 목표 눈금 */}
      <div
        className="pointer-events-none absolute top-0 z-[1] h-full w-px rounded-full bg-[var(--ah-text-pri)]/70 shadow-[0_0_0_1px_color-mix(in_oklab,var(--ah-card)_90%,transparent)]"
        style={{ left: `${targetPct}%`, transform: "translateX(-50%)" }}
      />
    </div>
  );
}

function DeviationRow({ item, index }: { item: TickerDeviationItem; index: number }) {
  const reduceMotion = useReducedMotion();
  const tone = toneFrom(item.diff);
  const color = toneColor(tone);
  const animDelay = reduceMotion ? 0 : index * 0.035;

  const tooltipLines = [
    `${item.displayLabel}  ·  ${compactAccountLabel(item.accountType)}`,
    `실제 ${Math.round(item.actualWeight)}%  →  목표 ${Math.round(item.targetWeight)}%`,
    tone === "ok"
      ? `편차 ${diffLabel(item.diff)}p — 정상 범위`
      : tone === "over"
        ? `목표 대비 +${Math.round(item.diff)}%p 초과`
        : `목표 대비 ${Math.round(item.diff)}%p 부족`,
  ];

  const { anchorRef, show, hide, portal } = usePortalTooltip(tooltipLines);

  return (
    <div
      ref={anchorRef}
      tabIndex={0}
      aria-label={`${item.displayLabel}, 편차 ${diffLabel(item.diff)}p`}
      className={cn(
        "group/row flex flex-col gap-1.5 rounded-lg px-2 py-1.5 outline-none transition-colors sm:flex-row sm:items-center sm:gap-3",
        "hover:bg-[color-mix(in_oklab,var(--ah-text-pri)_4%,transparent)]",
        "focus-visible:bg-[color-mix(in_oklab,var(--ah-text-pri)_6%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--ah-text-muted)]/35",
      )}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.blur();
          hide();
        }
      }}
    >
      {portal}

      <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-start">
        <MicroScaleBar item={item} tone={tone} animDelay={animDelay} />
        <div className="sm:hidden">
          <span
            className="inline-block rounded-md px-1.5 py-px text-[11px] font-bold tabular-nums tracking-tight"
            style={{ color, background: tonePillBg(tone) }}
          >
            {diffLabel(item.diff)}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p
            className="truncate text-[11px] font-semibold tracking-tight"
            style={{ color: "var(--ah-text-pri)" }}
          >
            {item.displayLabel}
          </p>
          <span
            className="shrink-0 rounded px-1 py-px text-[9px] font-medium tabular-nums"
            style={{
              color: "var(--ah-text-subtle)",
              border: "1px solid color-mix(in oklab, var(--ah-border) 80%, transparent)",
              background: "color-mix(in oklab, var(--ah-card) 70%, transparent)",
            }}
          >
            {compactAccountLabel(item.accountType)}
          </span>
        </div>
        <p
          className="text-[10px] tabular-nums tracking-tight sm:ml-auto sm:text-right"
          style={{ color: "var(--ah-text-subtle)" }}
        >
          {Math.round(item.actualWeight)}% → {Math.round(item.targetWeight)}%
        </p>
      </div>

      <div
        className="hidden shrink-0 tabular-nums text-right text-[11px] font-bold tracking-tight sm:block sm:min-w-[3.25rem]"
        style={{ color }}
      >
        <span className="inline-block rounded-md px-1.5 py-px" style={{ background: tonePillBg(tone) }}>
          {diffLabel(item.diff)}
        </span>
      </div>
    </div>
  );
}

export interface RebalancingDeviationCardsProps {
  data: TickerDeviationItem[];
}

/** 목표 대비 괴리 — 컴팩트 리스트 (스케일 바 + 편차) */
export function RebalancingDeviationCards({ data }: RebalancingDeviationCardsProps) {
  if (!data.length) {
    return (
      <p className="py-3 text-center text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
        설정에서 목표 비중을 지정하면 표시됩니다.
      </p>
    );
  }

  const sorted = [...data].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return (
    <div
      className="overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--ah-border)_92%,transparent)] bg-[color-mix(in_oklab,var(--ah-card-soft)_88%,transparent)]"
      aria-label="종목별 목표 대비 괴리"
    >
      <ul className="divide-y divide-[color-mix(in_oklab,var(--ah-border)_65%,transparent)]">
        {sorted.map((item, i) => (
          <li key={`${item.ticker}|${item.accountType}`} className="list-none">
            <DeviationRow item={item} index={i} />
          </li>
        ))}
      </ul>
    </div>
  );
}
