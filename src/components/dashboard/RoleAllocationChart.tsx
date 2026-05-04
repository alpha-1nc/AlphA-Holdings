"use client";

import type { RoleAllocationItem } from "@/lib/role-allocation";
import { fillForPortfolioOrdinalSlice } from "@/lib/rounded-donut-chart";

interface RoleAllocationChartProps {
  data: RoleAllocationItem[];
  compactChart?: boolean;
}

export function RoleAllocationChart({
  data,
  compactChart = false,
}: RoleAllocationChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          설정에서 종목별 역할을 지정하면
        </p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          차트가 표시됩니다
        </p>
      </div>
    );
  }

  const activeData = data.filter((item) => item.krwAmount > 0);
  const totalKrw = activeData.reduce((s, d) => s + d.krwAmount, 0);

  const textSize = compactChart ? "text-[10px]" : "text-xs";

  return (
    <div className="flex w-full min-w-0 flex-col justify-center gap-4">
      {activeData.map((d, i) => {
        const pct = totalKrw > 0 ? (d.krwAmount / totalKrw) * 100 : 0;
        const fill = fillForPortfolioOrdinalSlice(i);
        return (
          <div key={d.role} className="min-w-0 space-y-1.5">
            <div
              className={`flex items-baseline justify-between gap-2 ${textSize} text-neutral-400 dark:text-neutral-500`}
            >
              <span className="min-w-0 truncate font-medium text-neutral-700 dark:text-neutral-200">
                {d.label}
              </span>
              <span className="shrink-0 tabular-nums">{Math.round(pct)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, Math.max(0, pct))}%`,
                  background: fill,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
