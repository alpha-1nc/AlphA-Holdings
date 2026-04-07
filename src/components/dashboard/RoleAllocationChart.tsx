"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { RoleAllocationItem } from "@/lib/role-allocation";
import { ROLE_COLORS } from "@/lib/role-allocation";

const krwFmt = (n: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(n);

function RoleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { color: string; holdingLabels: string[]; krwAmount: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center gap-2 text-xs">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: item.payload.color }}
        />
        <span className="font-semibold text-neutral-800 dark:text-neutral-100">
          {item.name}
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {krwFmt(item.payload.krwAmount)}
      </p>
      {item.payload.holdingLabels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.payload.holdingLabels.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface RoleAllocationChartProps {
  data: RoleAllocationItem[];
  /** 좁은 화면에서 도넛·라벨 축소 */
  compactChart?: boolean;
}

export function RoleAllocationChart({ data, compactChart }: RoleAllocationChartProps) {
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

  const chartData = activeData.map((d) => ({
    name: d.label,
    value: d.krwAmount,
    color: ROLE_COLORS[d.role],
    holdingLabels: d.holdingLabels,
    krwAmount: d.krwAmount,
  }));

  const totalKrw = activeData.reduce((s, d) => s + d.krwAmount, 0);
  const ir = compactChart ? 52 : 60;
  const or = compactChart ? 76 : 88;

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-4">
      <div className={`relative w-full min-w-0 ${compactChart ? "h-44" : "h-52"}`}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={ir}
              outerRadius={or}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive
            >
              {chartData.map((entry, i) => (
                <Cell key={`${entry.name}-${i}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<RoleTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p
            className={`font-medium uppercase tracking-widest text-neutral-400 ${compactChart ? "text-[9px]" : "text-[10px]"}`}
          >
            역할군
          </p>
          <p
            className={`mt-0.5 font-bold tracking-tight text-neutral-900 dark:text-white ${compactChart ? "text-sm" : "text-base"}`}
          >
            {activeData.length}개 역할
          </p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1.5 md:gap-x-3">
        {activeData.map((d) => {
          const pct =
            totalKrw > 0 ? ((d.krwAmount / totalKrw) * 100).toFixed(1) : "0";
          return (
            <div
              key={d.role}
              className={`flex min-w-0 max-w-full items-center gap-1.5 text-neutral-600 dark:text-neutral-400 ${compactChart ? "text-[10px]" : "text-xs"}`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: ROLE_COLORS[d.role] }}
              />
              <span>{d.label}</span>
              <span className="text-neutral-400 dark:text-neutral-500">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
