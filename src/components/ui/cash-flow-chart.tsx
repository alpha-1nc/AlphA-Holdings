"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

type ChartView = "monthly" | "yearly";

interface CashFlowDatum {
  label: string;
  shortLabel: string;
  value: number;
  cashflow: number;
  inflow: number;
  dateRange: string;
}

export interface CashFlowChartProps {
  monthlyBars: { label: string; value: number }[];
  yearlyBars: { label: string; value: number }[];
  latestLabel: string | null;
  latestAmount: number;
  ytdSum: number;
  calendarYear: number;
  index?: number;
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function barsToMonthlyData(bars: { label: string; value: number }[]): CashFlowDatum[] {
  return bars.map((bar) => {
    const [y, m] = bar.label.includes("-") ? bar.label.split("-") : [bar.label, ""];
    const month = parseInt(m ?? "", 10);
    const shortLabel = Number.isNaN(month) ? bar.label : (MONTH_SHORT[month - 1] ?? bar.label);
    const dateRange = Number.isNaN(month) ? bar.label : `${y}년 ${month}월`;
    return {
      label: dateRange,
      shortLabel,
      value: bar.value,
      cashflow: bar.value,
      inflow: bar.value,
      dateRange,
    };
  });
}

function barsToYearlyData(bars: { label: string; value: number }[]): CashFlowDatum[] {
  return bars.map((bar) => ({
    label: bar.label,
    shortLabel: bar.label,
    value: bar.value,
    cashflow: bar.value,
    inflow: bar.value,
    dateRange: `${bar.label}년 누적`,
  }));
}

function getYAxisTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0];

  const maxMan = maxValue / 10_000;
  let stepMan: number;
  if (maxMan <= 10) stepMan = 2;
  else if (maxMan <= 50) stepMan = 10;
  else if (maxMan <= 100) stepMan = 20;
  else if (maxMan <= 500) stepMan = 50;
  else stepMan = Math.ceil(maxMan / 5 / 10) * 10;

  const niceMax = Math.ceil(maxMan / stepMan) * stepMan * 10_000;
  const step = stepMan * 10_000;
  const ticks: number[] = [];
  for (let v = niceMax; v >= 0; v -= step) {
    ticks.push(v);
  }
  return ticks;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);

const ease = [0.22, 1, 0.36, 1] as const;
const hoverTransition = { duration: 0.2 } as const;

export function CashFlowChart({
  monthlyBars,
  yearlyBars,
}: CashFlowChartProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<ChartView>("monthly");
  const prefersReducedMotion = useReducedMotion();

  const monthlyData = useMemo(() => barsToMonthlyData(monthlyBars), [monthlyBars]);
  const yearlyData = useMemo(() => barsToYearlyData(yearlyBars), [yearlyBars]);

  const displayData = useMemo(
    () => (activeView === "monthly" ? monthlyData : yearlyData),
    [activeView, monthlyData, yearlyData],
  );

  const maxValue = useMemo(
    () => Math.max(...displayData.map((d) => d.value), 1),
    [displayData],
  );

  const yAxisTicks = useMemo(() => getYAxisTicks(maxValue), [maxValue]);

  const handleViewChange = (view: ChartView) => {
    setActiveView(view);
    setHoveredBar(null);
  };

  const shouldAnimate = !prefersReducedMotion;

  if (displayData.length === 0) {
    return (
      <motion.section
        initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldAnimate ? { duration: 0.42, ease } : { duration: 0 }}
        whileHover={shouldAnimate ? { y: -4, transition: hoverTransition } : undefined}
        className="surface-card group relative w-full overflow-hidden p-8 transition-all hover:border-border/60 hover:shadow-lg"
        role="group"
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-foreground/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative">
        <p className="mb-2 text-lg text-muted-foreground">Cash Flow</p>
        <p className="mt-8 text-center text-sm text-muted-foreground">납입 데이터 없음</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldAnimate ? { duration: 0.42, ease } : { duration: 0 }}
      whileHover={shouldAnimate ? { y: -4, transition: hoverTransition } : undefined}
      className="surface-card group relative w-full overflow-hidden p-8 transition-all hover:border-border/60 hover:shadow-lg"
      role="group"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-foreground/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
      <div className="mb-8 grid grid-cols-1 items-start justify-between gap-6 md:flex">
        <div>
          <p className="mb-2 text-lg text-muted-foreground">Cash Flow</p>
          <motion.h2
            initial={shouldAnimate ? { scale: 0.95 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={shouldAnimate ? { duration: 0.4 } : { duration: 0 }}
            className="text-3xl font-bold text-foreground md:text-5xl"
          >
            {formatCurrency(displayData.reduce((total, d) => total + d.cashflow, 0))}
          </motion.h2>
        </div>

        <div
          className="flex w-fit rounded-full bg-secondary p-1"
          role="radiogroup"
          aria-label="Chart view"
        >
          <button
            type="button"
            onClick={() => handleViewChange("monthly")}
            className={cn(
              "rounded-full px-6 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-secondary",
              activeView === "monthly"
                ? "bg-foreground text-background shadow-lg"
                : "text-foreground hover:text-foreground/70",
            )}
            aria-pressed={activeView === "monthly"}
            aria-controls="cashflow-chart-bars"
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("yearly")}
            className={cn(
              "rounded-full px-6 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-secondary",
              activeView === "yearly"
                ? "bg-foreground text-background shadow-lg"
                : "text-foreground hover:text-foreground/70",
            )}
            aria-pressed={activeView === "yearly"}
            aria-controls="cashflow-chart-bars"
          >
            Yearly
          </button>
        </div>
      </div>

      <figure className="relative h-auto overflow-x-auto overflow-y-hidden pt-10 md:overflow-x-visible md:overflow-y-visible md:pt-0">
        <div className="relative h-[24rem] min-w-[640px] md:min-w-0">
          <div
            className="absolute bottom-12 left-0 top-0 flex flex-col justify-between text-sm text-muted-foreground"
            aria-hidden="true"
          >
            {yAxisTicks.map((value) => (
              <div key={value}>{value === 0 ? "0" : `${value / 10_000}만`}</div>
            ))}
          </div>

          <div
            id="cashflow-chart-bars"
            className="absolute bottom-12 left-16 right-0 top-0 flex items-end justify-between gap-4"
            role="list"
          >
            {displayData.map((data, index) => {
              const heightPercentage = maxValue
                ? Math.max((data.value / maxValue) * 100, 4)
                : 0;
              const tooltipBase = Math.min(heightPercentage + 8, 88);
              const tooltipVisible = hoveredBar === index;

              return (
                <div
                  key={`${data.shortLabel}-${data.label}`}
                  className="relative flex h-full flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setHoveredBar(index)}
                  onMouseLeave={() => setHoveredBar(null)}
                  role="listitem"
                >
                  <AnimatePresence>
                    {tooltipVisible && (
                      <motion.div
                        initial={
                          shouldAnimate
                            ? { opacity: 0, y: 10, scale: 0.95 }
                            : { opacity: 1, y: 0, scale: 1 }
                        }
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={
                          shouldAnimate
                            ? { opacity: 0, y: 10, scale: 0.95 }
                            : { opacity: 0, y: 10, scale: 0.95 }
                        }
                        transition={shouldAnimate ? { duration: 0.2 } : { duration: 0 }}
                        className="absolute z-10 mx-auto min-w-[200px] rounded-2xl border border-border bg-popover p-4 text-left shadow-xl"
                        role="status"
                        aria-live="polite"
                        style={{ bottom: `${tooltipBase}%` }}
                      >
                        <div className="mb-2 text-xs text-muted-foreground">{data.dateRange}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-foreground">납입액</span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(data.cashflow)}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="button"
                    initial={shouldAnimate ? { height: 0 } : false}
                    animate={{ height: `${heightPercentage}%` }}
                    transition={
                      shouldAnimate
                        ? {
                            duration: 0.8,
                            delay: index * 0.08,
                            ease: "easeOut",
                          }
                        : { duration: 0 }
                    }
                    onFocus={() => setHoveredBar(index)}
                    onBlur={() => setHoveredBar(null)}
                    className={cn(
                      "relative min-h-[0.5rem] w-full cursor-pointer overflow-hidden rounded-t-2xl transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      tooltipVisible
                        ? "bg-gradient-to-b from-foreground to-foreground/20"
                        : "bg-foreground/30",
                    )}
                    aria-label={`${data.label} ${formatCurrency(data.cashflow)}`}
                  />

                  <div className="mt-3 text-sm text-muted-foreground" aria-hidden="true">
                    {data.shortLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </figure>
      </div>
    </motion.section>
  );
}
