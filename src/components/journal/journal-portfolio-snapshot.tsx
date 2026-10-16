"use client";

import { Globe, Wallet } from "lucide-react";
import type { JournalFrozenSnapshot } from "@/lib/journal-frozen-snapshot";
import {
  frozenSnapshotToDonutData,
  sortFrozenPositionsForDisplay,
} from "@/lib/journal-frozen-snapshot";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";
import { ReportDonutChart } from "@/components/dashboard/portfolio-donut-chart";
import { PortfolioSnapshotAvatar } from "@/components/reports/portfolio-snapshot-avatar";

const krw = (n: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(n);

const ACCOUNT_LABELS: Record<string, string> = {
  US_DIRECT: "미국 직투",
  KR_DIRECT: "한국 직투",
  JP_DIRECT: "일본 직투",
  ISA: "ISA",
  PENSION: "연금저축",
  CASH: "현금",
};

const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
  US_DIRECT: <Globe className="h-3.5 w-3.5" />,
  KR_DIRECT: <Globe className="h-3.5 w-3.5" />,
  JP_DIRECT: <Globe className="h-3.5 w-3.5" />,
  ISA: <Globe className="h-3.5 w-3.5" />,
  PENSION: <Wallet className="h-3.5 w-3.5" />,
  CASH: <Wallet className="h-3.5 w-3.5" />,
};

type JournalPortfolioSnapshotProps = {
  snapshot: JournalFrozenSnapshot | null;
  syncWarning?: string | null;
};

export function JournalPortfolioSnapshot({
  snapshot,
  syncWarning,
}: JournalPortfolioSnapshotProps) {
  if (!snapshot || snapshot.positions.length === 0) {
    return (
      <div className="shell-metric-card border-dashed text-center">
        <p className="text-sm font-medium text-foreground/70">저장된 포트폴리오 스냅샷 없음</p>
        <p className="mt-1 text-xs text-muted-foreground">
          동기화 데이터가 없어도 글은 저장할 수 있습니다.
        </p>
      </div>
    );
  }

  const positions = sortFrozenPositionsForDisplay(snapshot.positions);
  const donutData = frozenSnapshotToDonutData(snapshot);
  const syncedLabel = new Date(snapshot.syncedAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="space-y-3">
      {(syncWarning || snapshot.usedFallback) && (
        <p className="text-xs text-muted-foreground">
          {syncWarning ?? "최신 동기화 실패 · 최근 데이터로 저장됨"}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface-card p-6 lg:col-span-2">
          <p className="shell-label">Portfolio Snapshot</p>
          <p className="mt-1 text-xs text-muted-foreground">{syncedLabel} 기준 · 저장 시점 박제</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
            <div className="grid grid-cols-[2fr_1.4fr_1.6fr_1fr] border-b border-border/60 bg-muted/30 px-3 py-2.5 text-sm font-medium text-muted-foreground">
              <div>종목</div>
              <div>계좌</div>
              <div className="text-right">원화 평가금</div>
              <div className="text-right">통화</div>
            </div>
            <div className="divide-y divide-border/60 text-sm">
              {positions.map((item) => {
                const displayLabel = getPortfolioItemDisplayLabel({
                  ticker: item.ticker,
                  displayName: item.name,
                });
                return (
                  <div
                    key={`${item.ticker}-${item.accountType}`}
                    className="grid grid-cols-[2fr_1.4fr_1.6fr_1fr] items-center gap-2 px-3 py-3 transition hover:bg-muted/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <PortfolioSnapshotAvatar
                        accountType={item.accountType}
                        ticker={item.ticker}
                        displayName={item.name}
                        size={44}
                      />
                      <div>
                        <p className="text-sm font-semibold leading-snug text-foreground/90">
                          {displayLabel}
                          {displayLabel.trim().toUpperCase() !== item.ticker.trim().toUpperCase() && (
                            <span className="ml-1 font-mono text-xs font-normal uppercase text-muted-foreground">
                              ({item.ticker})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {ACCOUNT_ICONS[item.accountType]}
                      {ACCOUNT_LABELS[item.accountType] ?? item.accountType}
                    </div>
                    <div className="text-right text-sm font-medium tabular-nums text-foreground/90">
                      {krw(item.marketValueKrw)}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">{item.currency}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {(snapshot.usdRate != null || snapshot.jpyRate != null) && (
            <div className="mt-4 flex gap-3">
              {snapshot.usdRate != null && (
                <div className="flex-1 rounded-xl bg-muted/30 px-4 py-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    USD/KRW
                  </p>
                  <p className="mt-1 font-semibold tabular-nums text-foreground/90" suppressHydrationWarning>
                    ₩{snapshot.usdRate.toLocaleString()}
                  </p>
                </div>
              )}
              {snapshot.jpyRate != null && (
                <div className="flex-1 rounded-xl bg-muted/30 px-4 py-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    100 JPY/KRW
                  </p>
                  <p className="mt-1 font-semibold tabular-nums text-foreground/90" suppressHydrationWarning>
                    ₩{snapshot.jpyRate.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="surface-card p-6">
          <p className="shell-label">Weight by Position</p>
          <div className="mt-4">
            <ReportDonutChart snapshots={donutData} />
          </div>
        </div>
      </div>
    </div>
  );
}
