import type { JournalSnapshotSummary } from "@/lib/journal-snapshot";
import { cn } from "@/lib/utils";

const krwFmt = (n: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(n);

const krwFmtMan = (n: number) => {
  const man = Math.round(n / 10000);
  return `${man.toLocaleString("ko-KR")}만`;
};

type JournalSnapshotCardProps = {
  summary: JournalSnapshotSummary | null;
  snapshotDate?: Date | string | null;
};

export function JournalSnapshotCard({ summary, snapshotDate }: JournalSnapshotCardProps) {
  if (!summary) {
    return (
      <div className="shell-metric-card border-dashed text-center">
        <p className="text-sm font-medium text-foreground/70">이 기간 자산 데이터 없음</p>
        <p className="mt-1 text-xs text-muted-foreground">
          스냅샷이 없어도 글은 저장할 수 있습니다.
        </p>
      </div>
    );
  }

  const dateLabel = snapshotDate
    ? new Date(snapshotDate).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : new Date(summary.date).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

  const returnLabel =
    summary.returnRate != null
      ? `${summary.returnRate >= 0 ? "+" : ""}${summary.returnRate.toFixed(1)}%`
      : "—";

  const returnColor =
    summary.returnRate == null
      ? "text-muted-foreground"
      : summary.returnRate >= 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <div className="shell-metric-card">
      <div className="flex items-start justify-between gap-3">
        <p className="shell-label">자산 스냅샷</p>
        <span className="text-xs text-muted-foreground">{dateLabel} 기준</span>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="shell-label">총 평가금</p>
          <p className="shell-num-lg mt-1.5 tabular-nums">{krwFmtMan(summary.totalValueKrw)}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {krwFmt(summary.totalValueKrw)}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="shell-label sm:max-w-[220px] sm:ml-auto">
            {summary.isIntervalReturn ? "이 달 수익률" : "수익률 (구간 산출 불가·매입원가 기준)"}
          </p>
          <p className={cn("shell-num-lg mt-1.5 tabular-nums", returnColor)}>{returnLabel}</p>
        </div>
      </div>

      <div className="mt-6 space-y-2.5 border-t border-border/60 pt-5">
        <p className="shell-label">계좌별 비중</p>
        {summary.accountWeights.map((w) => (
          <div key={w.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground/80">{w.label}</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(w.pct)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div
                className="h-full rounded-full bg-foreground/70 transition-all dark:bg-foreground/50"
                style={{ width: `${Math.min(100, Math.max(0, w.pct))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
