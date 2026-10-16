"use client";

import { useMemo } from "react";
import { CashFlowChart } from "@/components/ui/cash-flow-chart";

interface ContributionStatusProps {
  latestLabel: string | null;
  latestAmount: number;
  ytdSum: number;
  calendarYear: number;
  monthlyBars: { label: string; value: number }[];
  index?: number;
}

export function ContributionStatus({
  latestLabel,
  latestAmount,
  ytdSum,
  calendarYear,
  monthlyBars,
  index = 2,
}: ContributionStatusProps) {
  const yearlyBars = useMemo(() => {
    const byYear = new Map<string, number>();
    for (const bar of monthlyBars) {
      const year = bar.label.includes("-") ? bar.label.split("-")[0]! : bar.label;
      byYear.set(year, (byYear.get(year) ?? 0) + bar.value);
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }, [monthlyBars]);

  return (
    <CashFlowChart
      index={index}
      monthlyBars={monthlyBars}
      yearlyBars={yearlyBars}
      latestLabel={latestLabel}
      latestAmount={latestAmount}
      ytdSum={ytdSum}
      calendarYear={calendarYear}
    />
  );
}
