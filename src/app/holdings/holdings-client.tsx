"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, RefreshCw, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageMainTitle } from "@/components/layout/page-main-title";
import { TickerAvatar } from "@/components/dashboard/ticker-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACCOUNT_TYPE_LABEL } from "@/lib/accountGroups";
import type { AccountType, Holding, HoldingSource } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type AccountFilter = "전체" | "직투" | "ISA" | "수동";

type HoldingRow = Holding;

const SOURCE_BADGE: Record<HoldingSource, string> = {
  TOSS: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  KIS: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  MANUAL: "bg-neutral-500/15 text-neutral-600 dark:text-neutral-400",
};

const SOURCE_LABEL: Record<HoldingSource, string> = {
  TOSS: "토스",
  KIS: "KIS",
  MANUAL: "수동",
};

const DIRECT_TYPES: AccountType[] = ["US_DIRECT", "KR_DIRECT", "JP_DIRECT"];

const krwFmt = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);

const pctFmt = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(2)}%`;
};

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl border border-[var(--ah-border)] bg-[var(--ah-card)] px-4 py-4 shadow-sm md:px-5 md:py-5"
    >
      <p className="text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums md:text-2xl" style={{ color: "var(--ah-text-pri)" }}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs tabular-nums" style={{ color: "var(--ah-text-subtle)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function matchesFilter(h: HoldingRow, filter: AccountFilter): boolean {
  if (filter === "전체") return true;
  if (filter === "직투") return DIRECT_TYPES.includes(h.accountType);
  if (filter === "ISA") return h.accountType === "ISA";
  if (filter === "수동") return h.source === "MANUAL";
  return true;
}

export function HoldingsClient() {
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<AccountFilter>("전체");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    ticker: "",
    name: "",
    accountType: "PENSION" as "PENSION" | "CASH",
    quantity: "",
    avgPrice: "",
    marketValueKrw: "",
    manualNote: "",
  });

  const fetchHoldings = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/holdings");
      if (!res.ok) throw new Error("보유종목을 불러오지 못했습니다.");
      const data = await res.json();
      setHoldings(data.holdings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHoldings();
  }, [fetchHoldings]);

  const filtered = useMemo(
    () => holdings.filter((h) => matchesFilter(h, filter)),
    [holdings, filter],
  );

  const summary = useMemo(() => {
    const totalValue = filtered.reduce((s, h) => s + h.marketValueKrw, 0);
    const totalProfit = filtered.reduce((s, h) => {
      if (h.profitLoss == null) return s;
      if (h.currency === "KRW") return s + h.profitLoss;
      const rate = h.marketValue > 0 ? h.marketValueKrw / h.marketValue : 1;
      return s + h.profitLoss * rate;
    }, 0);
    const totalCost = totalValue - totalProfit;
    const rate = totalCost > 0 ? totalProfit / totalCost : 0;
    return { totalValue, totalProfit, rate };
  }, [filtered]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "동기화 실패");
      toast.success(`동기화 완료 (토스 ${data.tossCount}종목, KIS ${data.kisCount}종목)`);
      await fetchHoldings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "동기화 중 오류");
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticker: form.ticker,
          name: form.name || form.ticker,
          accountType: form.accountType,
          quantity: parseFloat(form.quantity),
          avgPrice: form.avgPrice ? parseFloat(form.avgPrice) : undefined,
          marketValueKrw: parseFloat(form.marketValueKrw),
          manualNote: form.manualNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "저장 실패");
      toast.success("수동 항목이 추가되었습니다.");
      setModalOpen(false);
      setForm({ ticker: "", name: "", accountType: "PENSION", quantity: "", avgPrice: "", marketValueKrw: "", manualNote: "" });
      await fetchHoldings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류");
    } finally {
      setSubmitting(false);
    }
  };

  const filters: AccountFilter[] = ["전체", "직투", "ISA", "수동"];

  if (loading) {
    return (
      <div className="space-y-4 p-0">
        <div className="h-9 w-52 animate-pulse rounded-lg md:h-10 md:w-56" style={{ background: "var(--ah-card-soft)" }} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl" style={{ background: "var(--ah-card-soft)" }} />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl" style={{ background: "var(--ah-card-soft)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[100vw] space-y-6 overflow-hidden bg-[var(--ah-bg)] p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageMainTitle icon={Wallet}>보유종목</PageMainTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            수동 추가
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={syncing}
            onClick={() => void handleSync()}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            새로고침
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="총 평가금" value={krwFmt(summary.totalValue)} />
        <SummaryCard
          label="총 수익금"
          value={`${summary.totalProfit >= 0 ? "+" : ""}${krwFmt(summary.totalProfit)}`}
        />
        <SummaryCard label="수익률" value={pctFmt(summary.rate)} />
      </div>

      {/* Account filter tabs */}
      <div
        className="relative flex w-full flex-nowrap items-stretch gap-1 overflow-hidden rounded-full border border-[var(--ah-border)] bg-[var(--ah-card)] p-1 shadow-sm md:inline-flex md:w-auto"
        role="tablist"
        aria-label="계좌 필터"
      >
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "relative z-10 flex min-w-0 flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 md:flex-none md:px-4",
              filter === f
                ? "bg-[var(--ah-accent)] text-[var(--ah-accent-fg)] shadow-sm"
                : "text-[var(--ah-text-muted)] hover:text-[var(--ah-text-pri)]",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Holdings list */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed px-6 py-14 text-center"
          style={{ borderColor: "var(--ah-border)", background: "var(--ah-card-soft)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--ah-text-muted)" }}>
            {holdings.length === 0 ? "보유종목이 없습니다. 새로고침으로 동기화하세요." : "해당 필터에 맞는 종목이 없습니다."}
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border border-[var(--ah-border)] bg-[var(--ah-card)] shadow-sm"
        >
          {/* Desktop header */}
          <div
            className="hidden grid-cols-[2.5rem_1fr_5rem_5rem_5rem_6rem_6rem_5rem] gap-3 border-b px-4 py-2.5 text-xs font-semibold md:grid"
            style={{ borderColor: "var(--ah-border)", color: "var(--ah-text-subtle)" }}
          >
            <span />
            <span>종목</span>
            <span className="text-right">수량</span>
            <span className="text-right">평단</span>
            <span className="text-right">현재가</span>
            <span className="text-right">평가금</span>
            <span className="text-right">손익률</span>
            <span />
          </div>

          <div className="divide-y" style={{ borderColor: "var(--ah-border)" }}>
            {filtered.map((h) => {
              const profitPositive = (h.profitLossRate ?? 0) >= 0;
              return (
                <div
                  key={h.id}
                  className="flex flex-col gap-2 px-4 py-3 md:grid md:grid-cols-[2.5rem_1fr_5rem_5rem_5rem_6rem_6rem_5rem] md:items-center md:gap-3 md:py-2.5"
                >
                  <TickerAvatar ticker={h.ticker} autoFmpLogo size={36} />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold" style={{ color: "var(--ah-text-pri)" }}>
                        {h.ticker}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_BADGE[h.source]}`}>
                        {SOURCE_LABEL[h.source]}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: "var(--ah-card-soft)", color: "var(--ah-text-subtle)" }}
                      >
                        {ACCOUNT_TYPE_LABEL[h.accountType]}
                      </span>
                    </div>
                    {h.name && (
                      <p className="truncate text-xs" style={{ color: "var(--ah-text-muted)" }}>
                        {h.name}
                      </p>
                    )}
                    {h.manualNote && (
                      <p className="truncate text-[11px] italic" style={{ color: "var(--ah-text-subtle)" }}>
                        {h.manualNote}
                      </p>
                    )}
                  </div>

                  <span className="text-right text-sm tabular-nums md:block" style={{ color: "var(--ah-text-pri)" }}>
                    <span className="mr-1 text-xs md:hidden" style={{ color: "var(--ah-text-subtle)" }}>수량</span>
                    {h.quantity.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-right text-sm tabular-nums md:block" style={{ color: "var(--ah-text-muted)" }}>
                    <span className="mr-1 text-xs md:hidden" style={{ color: "var(--ah-text-subtle)" }}>평단</span>
                    {h.avgPrice.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-right text-sm tabular-nums md:block" style={{ color: "var(--ah-text-pri)" }}>
                    <span className="mr-1 text-xs md:hidden" style={{ color: "var(--ah-text-subtle)" }}>현재가</span>
                    {h.lastPrice.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums md:block" style={{ color: "var(--ah-text-pri)" }}>
                    <span className="mr-1 text-xs font-normal md:hidden" style={{ color: "var(--ah-text-subtle)" }}>평가금</span>
                    {krwFmt(h.marketValueKrw)}
                  </span>
                  <span
                    className={cn(
                      "text-right text-sm font-semibold tabular-nums md:block",
                      profitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                    )}
                  >
                    <span className="mr-1 text-xs font-normal text-[var(--ah-text-subtle)] md:hidden">손익률</span>
                    {pctFmt(h.profitLossRate)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual add modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>수동 보유 항목 추가</DialogTitle>
            <DialogDescription>
              연금저축·현금성 자산 등 API 동기화 대상이 아닌 항목을 직접 입력합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmitManual(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>티커</label>
                <Input
                  required
                  placeholder="예: PENSION-FUND"
                  value={form.ticker}
                  onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>종목명</label>
                <Input
                  placeholder="표시명"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>계좌 유형</label>
              <div className="flex gap-2">
                {(["PENSION", "CASH"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, accountType: t }))}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      form.accountType === t
                        ? "border-[var(--ah-accent)] bg-[var(--ah-accent)]/10 text-[var(--ah-text-pri)]"
                        : "border-[var(--ah-border)] text-[var(--ah-text-muted)]",
                    )}
                  >
                    {ACCOUNT_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>보유수량</label>
                <Input
                  required
                  type="number"
                  step="any"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>평단 (원)</label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="선택"
                  value={form.avgPrice}
                  onChange={(e) => setForm((f) => ({ ...f, avgPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>평가금 (원)</label>
                <Input
                  required
                  type="number"
                  step="any"
                  min="0"
                  value={form.marketValueKrw}
                  onChange={(e) => setForm((f) => ({ ...f, marketValueKrw: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>메모</label>
              <Input
                placeholder="선택 사항"
                value={form.manualNote}
                onChange={(e) => setForm((f) => ({ ...f, manualNote: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "추가"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
