import * as React from "react";
import { cn } from "@/lib/utils";

// --- StatisticCard Components ---

interface StatisticCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function StatisticCard({ className, ...props }: StatisticCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card text-card-foreground",
        className
      )}
      {...props}
    />
  );
}

export function StatisticCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between px-4 pb-1 pt-4", className)}
      {...props}
    />
  );
}

export function StatisticCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function StatisticCardToolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  );
}

export function StatisticCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-4 pb-4", className)} {...props} />
  );
}

// --- Portfolio Segment Bar ---

export interface SegmentItem {
  ticker: string;
  weight: number;
  color: string;
}

interface PortfolioSegmentBarProps {
  items: SegmentItem[];
  className?: string;
  barHeight?: string;
  /** false이면 세그먼트 바만 렌더 (범례는 상위에서 구성) */
  showLegend?: boolean;
}

export function PortfolioSegmentBar({
  items,
  className,
  barHeight = "h-3",
  showLegend = true,
}: PortfolioSegmentBarProps) {
  const total = items.reduce((s, i) => s + i.weight, 0);

  if (!items.length) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">보유 종목 없음</p>
      </div>
    );
  }

  return (
    <div className={cn(showLegend ? "space-y-2" : undefined, className)}>
      <div className={cn("flex w-full overflow-hidden rounded-full", barHeight)}>
        {items.map((item, idx) => (
          <div
            key={`${item.ticker}-${idx}`}
            style={{
              width: `${total > 0 ? (item.weight / total) * 100 : 0}%`,
              backgroundColor: item.color,
            }}
            title={`${item.ticker}: ${Math.round(item.weight)}%`}
          />
        ))}
      </div>
      {showLegend ? (
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {items.map((item, idx) => (
            <div
              key={`${item.ticker}-${idx}`}
              className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.ticker}</span>
              <span className="text-neutral-400 dark:text-neutral-500">
                {Math.round(item.weight)}%
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
