import type { JournalSnapshotSummary } from "@/lib/journal-snapshot";

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
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/80 px-5 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          이 기간 자산 데이터 없음
        </p>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
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
      ? "text-neutral-500 dark:text-neutral-400"
      : summary.returnRate >= 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-white/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-500">
          자산 스냅샷
        </p>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">{dateLabel} 기준</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">총 평가금</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-900 dark:text-white">
            {krwFmtMan(summary.totalValueKrw)}
          </p>
          <p className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
            {krwFmt(summary.totalValueKrw)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">수익률</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${returnColor}`}>{returnLabel}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">계좌별 비중</p>
        {summary.accountWeights.map((w) => (
          <div key={w.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{w.label}</span>
              <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                {Math.round(w.pct)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-neutral-700 transition-all dark:bg-neutral-300"
                style={{ width: `${Math.min(100, Math.max(0, w.pct))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
