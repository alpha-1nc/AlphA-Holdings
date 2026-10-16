"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Holding } from "@/generated/prisma";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockLogo } from "@/components/stock/stock-logo";
import {
  TickerSearchInput,
  type TickerSearchChangeMeta,
} from "@/components/dashboard/ticker-search-input";
import { krwFull } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils";

const SECTION_LABEL_CLASS =
  "mb-4 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-foreground/40";

const PRIMARY_ACTION_CLASS =
  "inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-foreground px-5 text-base font-semibold text-background transition hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 md:h-10 md:gap-2 md:px-4 md:text-[0.9375rem]";

const ICON_ACTION_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/80 bg-background/80 p-2 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:opacity-40 md:min-h-0 md:min-w-0";

type FormState = {
  ticker: string;
  name: string;
  marketValueKrw: string;
  quantity: string;
  avgPrice: string;
};

function emptyForm(): FormState {
  return { ticker: "", name: "", marketValueKrw: "", quantity: "", avgPrice: "" };
}

function holdingToForm(h: Holding): FormState {
  return {
    ticker: h.ticker,
    name: h.name?.trim() || h.ticker,
    marketValueKrw: String(Math.round(h.marketValueKrw)),
    quantity: h.quantity > 0 ? String(h.quantity) : "",
    avgPrice: h.avgPrice > 0 ? String(h.avgPrice) : "",
  };
}

function parseKrwInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function PensionManualHoldingsManager() {
  const [items, setItems] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Holding | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/holdings");
      if (!res.ok) throw new Error("불러오기 실패");
      const data = (await res.json()) as { holdings?: Holding[] };
      const pensionManual = (data.holdings ?? []).filter(
        (h) => h.source === "MANUAL" && h.accountType === "PENSION",
      );
      setItems(pensionManual);
    } catch {
      toast.error("연금 보유 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function resetForm() {
    setForm(emptyForm());
    setEditingTicker(null);
  }

  function handleEdit(h: Holding) {
    setEditingTicker(h.ticker);
    setForm(holdingToForm(h));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = form.ticker.trim().toUpperCase();
    const mvk = parseKrwInput(form.marketValueKrw);

    if (!ticker) {
      toast.error("티커를 입력해 주세요.");
      return;
    }
    if (mvk == null || mvk <= 0) {
      toast.error("평가금액(원화)을 입력해 주세요.");
      return;
    }

    const payload: Record<string, unknown> = {
      ticker,
      name: form.name.trim() || ticker,
      accountType: "PENSION",
      marketValueKrw: mvk,
    };
    if (form.quantity.trim()) payload.quantity = form.quantity.trim();
    if (form.avgPrice.trim()) payload.avgPrice = form.avgPrice.trim();

    startTransition(async () => {
      try {
        const res = await fetch("/api/holdings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error ?? "저장 실패");
        toast.success(editingTicker ? "연금 보유를 수정했습니다." : "연금 보유를 추가했습니다.");
        resetForm();
        await loadItems();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "저장 중 오류");
      }
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/holdings", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deleteTarget.id }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error ?? "삭제 실패");
        toast.success("연금 보유를 삭제했습니다.");
        setDeleteTarget(null);
        if (editingTicker === deleteTarget.ticker) resetForm();
        await loadItems();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "삭제 중 오류");
      }
    });
  }

  return (
    <section className="mb-10">
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setDeleteTarget(null);
        }}
        title="연금 보유 삭제"
        description={
          deleteTarget
            ? `${deleteTarget.ticker} (${deleteTarget.name ?? deleteTarget.ticker}) 항목을 삭제할까요?`
            : ""
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleConfirmDelete}
        loading={isPending}
        tone="destructive"
      />

      <p className={SECTION_LABEL_CLASS}>연금 보유 (수동 입력)</p>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5 text-sm leading-snug text-muted-foreground md:px-6 md:py-3 md:text-xs md:leading-normal">
          연금 계좌는 증권사 API 연동이 없어 Settings에서 직접 입력합니다. 평가금은
          수동 값이며 실시간 시세가 아닙니다.
        </div>

        <form onSubmit={handleSubmit} className="border-b border-border px-5 py-6 md:px-6 md:py-5">
          <p className="mb-4 text-[1.0625rem] font-medium text-foreground md:mb-3 md:text-base">
            {editingTicker ? "보유 수정" : "보유 추가"}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs font-normal text-muted-foreground">티커</Label>
              {editingTicker ? (
                <Input
                  value={form.ticker}
                  readOnly
                  className="h-11 font-mono text-base uppercase md:h-10 md:text-[0.9375rem]"
                />
              ) : (
                <TickerSearchInput
                  value={form.ticker}
                  onChange={(t, meta?: TickerSearchChangeMeta) => {
                    setForm((prev) => ({
                      ...prev,
                      ticker: t,
                      name:
                        meta?.source === "select"
                          ? meta.displayName?.trim() || prev.name
                          : prev.name,
                    }));
                  }}
                  accountType="PENSION"
                  placeholder="379810, 069500..."
                  inputClassName="h-11 text-base md:h-10 md:text-[0.9375rem] md:rounded-xl"
                />
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
              <Label className="text-xs font-normal text-muted-foreground">종목명</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="KODEX US NASDAQ100"
                className="h-11 text-base md:h-10 md:text-[0.9375rem]"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                평가금 (원화) <span className="text-foreground/50">*</span>
              </Label>
              <Input
                value={form.marketValueKrw}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, marketValueKrw: e.target.value }))
                }
                inputMode="numeric"
                placeholder="2500000"
                className="h-11 tabular-nums text-base md:h-10 md:text-[0.9375rem]"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                수량 <span className="text-foreground/40">(선택)</span>
              </Label>
              <Input
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                inputMode="decimal"
                placeholder="10"
                className="h-11 tabular-nums text-base md:h-10 md:text-[0.9375rem]"
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                평단 (원) <span className="text-foreground/40">(선택)</span>
              </Label>
              <Input
                value={form.avgPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, avgPrice: e.target.value }))}
                inputMode="decimal"
                placeholder="220000"
                className="h-11 tabular-nums text-base md:h-10 md:text-[0.9375rem]"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="submit" disabled={isPending} className={PRIMARY_ACTION_CLASS}>
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              {editingTicker ? "수정 저장" : "추가"}
            </button>
            {editingTicker && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isPending}
                className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 md:h-10"
              >
                취소
              </button>
            )}
          </div>
        </form>

        <div className="px-5 py-4 md:px-6 md:py-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              등록된 연금 보유가 없습니다. 위에서 종목을 추가해 주세요.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 md:gap-4"
                >
                  <StockLogo ticker={h.ticker} size={36} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {h.ticker}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        {h.name ?? h.ticker}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-medium tabular-nums text-foreground/80">
                        {krwFull(h.marketValueKrw)}
                      </span>
                      {h.quantity > 0 && h.avgPrice > 0 && (
                        <span className="tabular-nums">
                          · {h.quantity}주 @ {krwFull(h.avgPrice)}
                        </span>
                      )}
                      <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/45">
                        수동
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`${h.ticker} 수정`}
                      className={ICON_ACTION_CLASS}
                      onClick={() => handleEdit(h)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${h.ticker} 삭제`}
                      className={cn(ICON_ACTION_CLASS, "hover:text-destructive")}
                      onClick={() => setDeleteTarget(h)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
