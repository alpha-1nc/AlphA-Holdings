"use client";

import { type CSSProperties, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { donutPieRoundedProps, donutRadiiScaledToMinSidePx } from "@/lib/rounded-donut-chart";
import { collapseWeightPercentSegments } from "@/lib/portfolio-small-slice-collapse";
import { aggregateSegmentsBySector } from "@/lib/stock-sector";
import { DashboardSectionCard } from "./dashboard-section-card";
import "./account-glass-switcher.css";

export interface AssetCompositionSegment {
  name: string;
  weight: number;
  ticker?: string;
}

interface AssetCompositionProps {
  segments: AssetCompositionSegment[];
  loading?: boolean;
  groupKey?: string;
  index?: number;
}

type AllocationView = "stock" | "sector";

const SHADE_HI = 88;
const SHADE_LO = 24;

function monoShade(pct: number): string {
  return `color-mix(in srgb, var(--foreground) ${pct}%, transparent)`;
}

function monoShadeByIndex(index: number, count: number): string {
  const t = count <= 1 ? 0 : index / (count - 1);
  const pct = Math.round(SHADE_HI - t * (SHADE_HI - SHADE_LO));
  return monoShade(pct);
}

const BRIGHTEST_FILL = monoShade(SHADE_HI);
const DARKEST_FILL = monoShade(SHADE_LO);

function segmentFill(defaultFill: string, name: string, hovered: string | null): string {
  if (hovered == null) return defaultFill;
  return hovered === name ? BRIGHTEST_FILL : DARKEST_FILL;
}

const ALLOCATION_VIEW_TABS: { key: AllocationView; label: string }[] = [
  { key: "stock", label: "By Stock" },
  { key: "sector", label: "By Sector" },
];

function AllocationViewSwitcher({
  view,
  onChange,
}: {
  view: AllocationView;
  onChange: (next: AllocationView) => void;
}) {
  const activeIndex = Math.max(
    0,
    ALLOCATION_VIEW_TABS.findIndex((tab) => tab.key === view),
  );

  return (
    <div
      className="ag-switcher w-fit shrink-0"
      data-idx={activeIndex}
      role="tablist"
      aria-label="Allocation view"
      style={
        {
          "--ag-idx": activeIndex,
          "--ag-count": ALLOCATION_VIEW_TABS.length,
        } as CSSProperties
      }
    >
      <span className="ag-switcher__indicator" aria-hidden />
      {ALLOCATION_VIEW_TABS.map((tab) => {
        const active = tab.key === view;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            className="ag-switcher__option"
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function AssetComposition({
  segments,
  loading,
  groupKey = "all",
  index = 0,
}: AssetCompositionProps) {
  const [view, setView] = useState<AllocationView>("stock");
  const [hovered, setHovered] = useState<string | null>(null);
  const chartBoxRef = useRef<HTMLDivElement>(null);
  const [radii, setRadii] = useState(() => donutRadiiScaledToMinSidePx(192));

  const displaySegments = useMemo(() => {
    const positives = segments.filter((s) => s.weight > 0);
    if (view === "stock") return positives;
    return aggregateSegmentsBySector(positives);
  }, [segments, view]);

  const data = useMemo(() => {
    const collapsed = collapseWeightPercentSegments(displaySegments);
    return collapsed.map((s, i) => ({
      ...s,
      fill: monoShadeByIndex(i, collapsed.length),
    }));
  }, [displaySegments]);

  useLayoutEffect(() => {
    if (data.length === 0) return;
    const el = chartBoxRef.current;
    if (!el) return;

    function syncRadii() {
      const box = chartBoxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const side = Math.round(Math.min(rect.width, rect.height));
      if (side > 0) {
        const scaled = donutRadiiScaledToMinSidePx(side);
        setRadii({
          innerRadius: Math.round(scaled.innerRadius * 1.12),
          outerRadius: scaled.outerRadius,
        });
      }
    }

    syncRadii();
    const ro = new ResizeObserver(syncRadii);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data.length]);

  function handleViewChange(next: AllocationView) {
    setView(next);
    setHovered(null);
  }

  return (
    <DashboardSectionCard
      index={index}
      label="Asset Allocation"
      labelClassName="text-lg font-normal normal-case tracking-normal text-muted-foreground"
      meta={<AllocationViewSwitcher view={view} onChange={handleViewChange} />}
      className="h-full"
    >
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-foreground/[0.04]" />
      ) : data.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground/45">
          표시할 보유 종목이 없습니다
        </p>
      ) : (
        <LayoutGroup id={`asset-comp-${groupKey}-${view}`}>
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(168px,220px)_minmax(0,1fr)] lg:gap-8">
            <motion.div
              key={`donut-wrap-${groupKey}-${view}`}
              layout
              ref={chartBoxRef}
              className="relative mx-auto aspect-square w-full max-w-[220px]"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="weight"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={radii.innerRadius}
                    outerRadius={radii.outerRadius}
                    {...donutPieRoundedProps({
                      sliceCount: data.length,
                      weights: data.map((d) => d.weight),
                      innerRadius: radii.innerRadius,
                      outerRadius: radii.outerRadius,
                    })}
                    paddingAngle={data.length > 1 ? 2 : 0}
                    isAnimationActive
                    animationDuration={520}
                    animationEasing="ease-out"
                    onMouseEnter={(_, idx) => setHovered(data[idx]?.name ?? null)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {data.map((d) => (
                      <Cell
                        key={d.name}
                        fill={segmentFill(d.fill, d.name, hovered)}
                        style={{ transition: "fill 200ms ease" }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            <ul className="flex min-w-0 flex-col gap-0.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {data.map((d, i) => (
                  <motion.li
                    key={`${groupKey}-${view}-${d.name}`}
                    layout
                    layoutId={`asset-row-${groupKey}-${view}-${d.name}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{
                      duration: 0.34,
                      ease: [0.22, 1, 0.36, 1],
                      delay: i * 0.035,
                    }}
                    onMouseEnter={() => setHovered(d.name)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "flex cursor-default items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-150",
                      hovered === d.name && "bg-foreground/[0.06]",
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        background: segmentFill(d.fill, d.name, hovered),
                        transition: "background 200ms ease",
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/85">
                      {d.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {Math.round(d.weight)}%
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </LayoutGroup>
      )}
    </DashboardSectionCard>
  );
}
