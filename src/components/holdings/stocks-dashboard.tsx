"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AccountType } from "@/generated/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoldingsBadge,
  HoldingsCard,
  HoldingsCardContent,
  HoldingsCardHeader,
  HoldingsCardTitle,
} from "@/components/holdings/holdings-ui";
import { ACCOUNT_TYPE_LABEL } from "@/lib/accountGroups";
import { krwFull, krwSignedFull, pctSigned } from "@/lib/dashboard-format";
import {
  computeBrokerCostBasisMetrics,
  filterValuedHoldings,
  holdingProfitLossKrw,
} from "@/lib/profit";
import type { Holding } from "@/generated/prisma";
import { motion } from "framer-motion";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import {
  DEFAULT_HOLDING_SORT,
  HoldingSortSelect,
  type HoldingSortKey,
} from "@/components/holdings/holding-sort-select";
import { StockLogo } from "@/components/stock/stock-logo";
import { resolveStockSector } from "@/lib/stock-sector";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  ChevronRight,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import "@/components/dashboard/account-glass-switcher.css";

type ProfitViewMode = "cumulative" | "daily";
type CurrencyDisplayMode = "KRW" | "USD";
type AccountFilterKey = "all" | AccountType;
type StockLabelViewMode = "name" | "ticker";

const ACCOUNT_TYPE_ORDER: AccountType[] = [
  "US_DIRECT",
  "KR_DIRECT",
  "JP_DIRECT",
  "ISA",
  "PENSION",
  "CASH",
];

/** 리스트 계좌 뱃지 — 국기 이모지 없이 텍스트만 */
const ACCOUNT_BADGE_LABEL: Record<AccountType, string> = {
  US_DIRECT: "미국",
  KR_DIRECT: "한국",
  JP_DIRECT: "일본",
  ISA: "ISA",
  PENSION: "연금저축",
  CASH: "현금",
};

type RealtimeMetrics = {
  totalValueKrw: number;
  totalProfitKrw: number;
  totalProfitRate: number;
  dailyProfitKrw: number;
  holdingCount: number;
  lastSynced: string | null;
};

type HoldingRow = {
  id: string;
  ticker: string;
  name: string;
  lastPrice: number;
  avgPrice: number;
  currency: string;
  quantity: number;
  marketValue: number;
  marketValueKrw: number;
  profitLoss: number;
  dailyProfitLoss: number;
  dailyChangeKrw: number;
  dailyChangeRate: number;
  profitKrw: number;
  profitRate: number;
  accountType: Holding["accountType"];
  source: Holding["source"];
  syncedAt: string | null;
};

function impliedRate(h: { marketValue: number; marketValueKrw: number }): number {
  return h.marketValue > 0 ? h.marketValueKrw / h.marketValue : 1;
}

function usdFull(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function usdSignedFull(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${usdFull(Math.abs(n))}`;
}

function dailyProfitLossKrw(h: Holding): number {
  if (h.dailyProfitLoss == null) return 0;
  if (h.currency === "KRW") return h.dailyProfitLoss;
  const rate = h.marketValue > 0 ? h.marketValueKrw / h.marketValue : 1;
  return h.dailyProfitLoss * rate;
}

function dailyChangeRatePercent(h: Holding): number {
  const dailyKrw = dailyProfitLossKrw(h);
  const prevValue = h.marketValueKrw - dailyKrw;
  return prevValue > 0 ? (dailyKrw / prevValue) * 100 : 0;
}

function formatPrice(price: number, currency: string): string {
  if (currency === "USD") {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === "JPY") {
    return `¥${Math.round(price).toLocaleString("en-US")}`;
  }
  return krwFull(price);
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return num % 1 === 0 ? String(num) : num.toFixed(2);
}

function toHoldingRow(h: Holding): HoldingRow {
  const profitKrw = holdingProfitLossKrw(h);
  const costKrw = h.marketValueKrw - profitKrw;
  const rawSyncedAt = h.syncedAt as Date | string | null | undefined;
  return {
    id: h.id,
    ticker: h.ticker,
    name: h.name?.trim() || h.ticker,
    lastPrice: h.lastPrice,
    avgPrice: h.avgPrice,
    currency: h.currency,
    quantity: h.quantity,
    marketValue: h.marketValue,
    marketValueKrw: h.marketValueKrw,
    profitLoss: h.profitLoss ?? 0,
    dailyProfitLoss: h.dailyProfitLoss ?? 0,
    dailyChangeKrw: dailyProfitLossKrw(h),
    dailyChangeRate: dailyChangeRatePercent(h),
    profitKrw,
    profitRate: costKrw > 0 ? (profitKrw / costKrw) * 100 : 0,
    accountType: h.accountType,
    source: h.source,
    syncedAt:
      rawSyncedAt instanceof Date
        ? rawSyncedAt.toISOString()
        : (rawSyncedAt ?? null),
  };
}

function displayLastPrice(row: HoldingRow, currencyMode: CurrencyDisplayMode): string {
  if (row.currency === "USD" && currencyMode === "USD") {
    return formatPrice(row.lastPrice, "USD");
  }
  const price =
    row.currency === "USD" ? row.lastPrice * impliedRate(row) : row.lastPrice;
  return formatPrice(price, "KRW");
}

function displayAvgPrice(row: HoldingRow, currencyMode: CurrencyDisplayMode): string {
  if (row.currency === "USD" && currencyMode === "USD") {
    return formatPrice(row.avgPrice, "USD");
  }
  const price =
    row.currency === "USD" ? row.avgPrice * impliedRate(row) : row.avgPrice;
  return formatPrice(price, "KRW");
}

function displayMarketValue(row: HoldingRow, currencyMode: CurrencyDisplayMode): string {
  if (row.currency === "USD" && currencyMode === "USD") {
    return usdFull(row.marketValue);
  }
  return krwFull(row.marketValueKrw);
}

function displayProfitAmount(
  row: HoldingRow,
  profitViewMode: ProfitViewMode,
  currencyMode: CurrencyDisplayMode,
): string {
  if (row.currency === "USD" && currencyMode === "USD") {
    const amount =
      profitViewMode === "cumulative" ? row.profitLoss : row.dailyProfitLoss;
    return usdSignedFull(amount);
  }
  const { amountKrw } = rowProfitValues(row, profitViewMode);
  return krwSignedFull(amountKrw);
}

function profitLabel(mode: ProfitViewMode): string {
  return mode === "cumulative" ? "누적 손익" : "오늘 손익";
}

function AccountFilterToggle({
  value,
  options,
  onChange,
  disabled,
}: {
  value: AccountFilterKey;
  options: AccountType[];
  onChange: (next: AccountFilterKey) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) return null;

  const tabs: { key: AccountFilterKey; label: string }[] = [
    { key: "all", label: "전체" },
    ...options.map((type) => ({
      key: type,
      label: ACCOUNT_BADGE_LABEL[type],
    })),
  ];
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === value),
  );

  return (
    <div
      className={cn(
        "ag-switcher w-fit max-w-[min(100%,20rem)] shrink overflow-x-auto sm:max-w-none",
        disabled && "pointer-events-none opacity-50",
      )}
      data-idx={activeIndex}
      role="tablist"
      aria-label="계좌 필터"
      style={
        {
          "--ag-idx": activeIndex,
          "--ag-count": tabs.length,
        } as CSSProperties
      }
    >
      <span className="ag-switcher__indicator" aria-hidden />
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            disabled={disabled}
            aria-selected={active}
            data-active={active}
            className="ag-switcher__option"
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function CurrencyDisplayToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: CurrencyDisplayMode;
  onChange: (next: CurrencyDisplayMode) => void;
  disabled?: boolean;
}) {
  const displayMode = disabled ? "KRW" : mode;
  const tabs: { key: CurrencyDisplayMode; label: string }[] = [
    { key: "USD", label: "$" },
    { key: "KRW", label: "₩" },
  ];
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === displayMode),
  );

  return (
    <div
      className={cn(
        "ag-switcher w-fit shrink-0",
        disabled && "pointer-events-none opacity-50",
      )}
      data-idx={activeIndex}
      role="tablist"
      aria-label="표시 통화"
      aria-disabled={disabled}
      style={
        {
          "--ag-idx": activeIndex,
          "--ag-count": tabs.length,
        } as CSSProperties
      }
    >
      <span className="ag-switcher__indicator" aria-hidden />
      {tabs.map((tab) => {
        const active = tab.key === displayMode;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            disabled={disabled}
            aria-selected={active}
            data-active={active}
            className={cn(
              "ag-switcher__option",
              disabled && "cursor-not-allowed",
            )}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ProfitModeToggle({
  mode,
  onToggle,
  className,
}: {
  mode: ProfitViewMode;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className ?? ""}`}
      title={mode === "cumulative" ? "오늘 손익으로 전환" : "누적 손익으로 전환"}
      aria-label={mode === "cumulative" ? "오늘 손익으로 전환" : "누적 손익으로 전환"}
    >
      <ArrowLeftRight className="h-3.5 w-3.5" />
    </button>
  );
}

function StockLabelToggle({
  mode,
  onToggle,
  className,
}: {
  mode: StockLabelViewMode;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className ?? ""}`}
      title={mode === "name" ? "티커로 전환" : "종목명으로 전환"}
      aria-label={mode === "name" ? "티커로 전환" : "종목명으로 전환"}
    >
      <ArrowLeftRight className="h-3.5 w-3.5" />
    </button>
  );
}

function rowProfitValues(row: HoldingRow, mode: ProfitViewMode) {
  if (mode === "cumulative") {
    return { amountKrw: row.profitKrw, ratePercent: row.profitRate };
  }
  return { amountKrw: row.dailyChangeKrw, ratePercent: row.dailyChangeRate };
}

function sortHoldingRows(rows: HoldingRow[], sortKey: HoldingSortKey): HoldingRow[] {
  const sorted = [...rows];
  switch (sortKey) {
    case "profit-rate-desc":
      return sorted.sort((a, b) => b.profitRate - a.profitRate);
    case "profit-rate-asc":
      return sorted.sort((a, b) => a.profitRate - b.profitRate);
    case "value-desc":
      return sorted.sort((a, b) => b.marketValueKrw - a.marketValueKrw);
    case "value-asc":
      return sorted.sort((a, b) => a.marketValueKrw - b.marketValueKrw);
    case "daily-rate-desc":
      return sorted.sort((a, b) => b.dailyChangeRate - a.dailyChangeRate);
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
    default:
      return sorted;
  }
}

function StatusSection({
  totalValueKrw,
  cumulativeProfitKrw,
  cumulativeProfitRate,
  dailyProfitKrw,
  dailyProfitRate,
  profitViewMode,
  onToggleProfitView,
  positionCount,
  loading,
}: {
  totalValueKrw: number;
  cumulativeProfitKrw: number;
  cumulativeProfitRate: number;
  dailyProfitKrw: number;
  dailyProfitRate: number;
  profitViewMode: ProfitViewMode;
  onToggleProfitView: () => void;
  positionCount: number;
  loading: boolean;
}) {
  const profitKrw = profitViewMode === "cumulative" ? cumulativeProfitKrw : dailyProfitKrw;
  const profitRate =
    profitViewMode === "cumulative" ? cumulativeProfitRate : dailyProfitRate;
  const isUp = profitKrw >= 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 items-stretch gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-[132px] rounded-lg border border-border shadow-sm"
          />
        ))}
      </div>
    );
  }

  const statusCardClassName = "relative flex h-full min-h-[132px] flex-col overflow-hidden";
  const statusHeaderClassName = "flex flex-row items-center justify-between gap-2 pb-2";

  return (
    <div className="grid grid-cols-1 items-stretch gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <motion.div
        className="h-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <HoldingsCard className={statusCardClassName}>
          <HoldingsCardHeader className={statusHeaderClassName}>
            <HoldingsCardTitle className="truncate text-xs sm:text-sm font-medium text-muted-foreground">
              총 평가금액
            </HoldingsCardTitle>
            <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
          </HoldingsCardHeader>
          <HoldingsCardContent>
            <div className="text-xl sm:text-2xl font-bold tabular-nums">{krwFull(totalValueKrw)}</div>
            <p className="text-xs text-muted-foreground mt-1">현재가 기준</p>
          </HoldingsCardContent>
        </HoldingsCard>
      </motion.div>

      <motion.div
        className="h-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <HoldingsCard className={statusCardClassName}>
          <HoldingsCardHeader className={statusHeaderClassName}>
            <div className="flex min-w-0 items-center gap-1.5">
              <HoldingsCardTitle className="truncate text-xs sm:text-sm font-medium text-muted-foreground">
                {profitLabel(profitViewMode)}
              </HoldingsCardTitle>
              <ProfitModeToggle mode={profitViewMode} onToggle={onToggleProfitView} />
            </div>
            {isUp ? (
              <TrendingUp className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 shrink-0 text-red-500" />
            )}
          </HoldingsCardHeader>
          <HoldingsCardContent>
            <div
              className={`text-xl sm:text-2xl font-bold tabular-nums ${isUp ? "text-green-500" : "text-red-500"}`}
            >
              {krwSignedFull(profitKrw)}
            </div>
            <p className={`text-xs mt-1 ${isUp ? "text-green-500" : "text-red-500"}`}>
              {pctSigned(profitRate)}
            </p>
          </HoldingsCardContent>
        </HoldingsCard>
      </motion.div>

      <motion.div
        className="h-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <HoldingsCard className={statusCardClassName}>
          <HoldingsCardHeader className={statusHeaderClassName}>
            <HoldingsCardTitle className="truncate text-xs sm:text-sm font-medium text-muted-foreground">
              보유 종목
            </HoldingsCardTitle>
            <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
          </HoldingsCardHeader>
          <HoldingsCardContent>
            <div className="text-xl sm:text-2xl font-bold">{positionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">평가금 있는 포지션</p>
          </HoldingsCardContent>
        </HoldingsCard>
      </motion.div>
    </div>
  );
}

function HoldingDetails({
  holding,
  isOpen,
  onClose,
  profitViewMode,
  onToggleProfitView,
  currencyDisplayMode,
  allRows,
}: {
  holding: HoldingRow | null;
  isOpen: boolean;
  onClose: () => void;
  profitViewMode: ProfitViewMode;
  onToggleProfitView: () => void;
  currencyDisplayMode: CurrencyDisplayMode;
  allRows: HoldingRow[];
}) {
  if (!holding) return null;

  const { amountKrw, ratePercent } = rowProfitValues(holding, profitViewMode);
  const isProfitUp = amountKrw >= 0;

  // ISA/KR/JP은 항상 원화 표시
  const effectiveCurrencyMode: CurrencyDisplayMode =
    holding.currency !== "USD" ? "KRW" : currencyDisplayMode;

  // 비중: 이 종목 평가금액 / 전체 보유 평가금액 합
  const totalMarketValueKrw = allRows.reduce((sum, r) => sum + r.marketValueKrw, 0);
  const weight = totalMarketValueKrw > 0 ? (holding.marketValueKrw / totalMarketValueKrw) * 100 : 0;

  // 섹터 — ticker-metadata(GICS) + resolveStockSector (도넛과 동일 출처)
  const sectorResolved = resolveStockSector(holding.ticker, holding.name);
  const sectorText = sectorResolved === "Other" ? "—" : sectorResolved;

  // 동기화 시각 / 수동 입력 표시
  const syncedAtText =
    holding.source === "MANUAL"
      ? "수동 입력 · 실시간 아님"
      : holding.syncedAt
        ? `마지막 동기화 ${new Date(holding.syncedAt).toLocaleString("ko-KR", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : null;

  const profitColor = isProfitUp ? "text-green-500" : "text-red-500";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="z-[70] mx-4 max-w-2xl gap-3 overflow-hidden border border-border bg-background p-4 shadow-lg ring-0 max-h-[90vh] sm:mx-auto sm:max-w-2xl sm:rounded-lg sm:p-5"
        showCloseButton
      >
        <DialogHeader className="space-y-0 text-center sm:text-left">
          <div className="flex items-center gap-2.5 pr-8">
            <StockLogo ticker={holding.ticker} size={40} className="flex-shrink-0" />
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                {holding.ticker}
              </DialogTitle>
              <DialogDescription className="truncate text-xs sm:text-sm">
                {holding.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2.5">
          {/* 주요 지표 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground sm:text-xs">현재가</p>
              <p className="text-lg font-bold tabular-nums sm:text-xl">
                {displayLastPrice(holding, effectiveCurrencyMode)}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="mb-1 flex items-center gap-1">
                <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {profitLabel(profitViewMode)}
                </p>
                <ProfitModeToggle mode={profitViewMode} onToggle={onToggleProfitView} />
              </div>
              <p className={cn("text-lg font-bold tabular-nums sm:text-xl", profitColor)}>
                {displayProfitAmount(holding, profitViewMode, effectiveCurrencyMode)}
              </p>
              <p className={cn("text-[11px] tabular-nums sm:text-xs", profitColor)}>
                {pctSigned(ratePercent)}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground sm:text-xs">평가금액</p>
              <p className="text-base font-semibold tabular-nums sm:text-lg">
                {displayMarketValue(holding, effectiveCurrencyMode)}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground sm:text-xs">평단가</p>
              <p className="text-base font-semibold tabular-nums sm:text-lg">
                {displayAvgPrice(holding, effectiveCurrencyMode)}
              </p>
            </div>
          </div>

          {/* 보조 지표 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-card px-2.5 py-2 shadow-sm">
              <p className="mb-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">보유 수량</p>
              <p className="text-sm font-semibold tabular-nums sm:text-base">
                {formatNumber(holding.quantity)}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card px-2.5 py-2 shadow-sm">
              <p className="mb-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">비중</p>
              <p className="text-sm font-semibold tabular-nums sm:text-base">
                {weight.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card px-2.5 py-2 shadow-sm">
              <p className="mb-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">섹터</p>
              <p className="truncate text-sm font-medium text-foreground/80 sm:text-base" title={sectorText}>
                {sectorText}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground sm:text-xs">
          <HoldingsBadge className="text-[10px] sm:text-[11px]">
            {ACCOUNT_BADGE_LABEL[holding.accountType]}
          </HoldingsBadge>
          {syncedAtText ? (
            <span className="ml-auto text-right text-muted-foreground/70">
              {syncedAtText}
              {holding.source !== "MANUAL" ? " · 실시간 아님" : ""}
            </span>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ListCardHeaderControls({
  accountFilter,
  accountFilterOptions,
  onAccountFilterChange,
  currencyDisplayMode,
  onCurrencyDisplayChange,
  currencyToggleDisabled,
  controlsDisabled,
}: {
  accountFilter: AccountFilterKey;
  accountFilterOptions: AccountType[];
  onAccountFilterChange: (value: AccountFilterKey) => void;
  currencyDisplayMode: CurrencyDisplayMode;
  onCurrencyDisplayChange: (mode: CurrencyDisplayMode) => void;
  currencyToggleDisabled: boolean;
  controlsDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
      <AccountFilterToggle
        value={accountFilter}
        options={accountFilterOptions}
        onChange={onAccountFilterChange}
        disabled={controlsDisabled}
      />
      <CurrencyDisplayToggle
        mode={currencyDisplayMode}
        onChange={onCurrencyDisplayChange}
        disabled={currencyToggleDisabled || controlsDisabled}
      />
    </div>
  );
}

function DataTable({
  rows,
  allRowsCount,
  loading,
  profitViewMode,
  currencyDisplayMode,
  onCurrencyDisplayChange,
  currencyToggleDisabled,
  accountFilter,
  accountFilterOptions,
  onAccountFilterChange,
  sortKey,
  onSortChange,
  onToggleProfitView,
  onRowClick,
}: {
  rows: HoldingRow[];
  allRowsCount: number;
  loading: boolean;
  profitViewMode: ProfitViewMode;
  currencyDisplayMode: CurrencyDisplayMode;
  onCurrencyDisplayChange: (mode: CurrencyDisplayMode) => void;
  currencyToggleDisabled: boolean;
  accountFilter: AccountFilterKey;
  accountFilterOptions: AccountType[];
  onAccountFilterChange: (value: AccountFilterKey) => void;
  sortKey: HoldingSortKey;
  onSortChange: (value: HoldingSortKey) => void;
  onToggleProfitView: () => void;
  onRowClick: (holding: HoldingRow) => void;
}) {
  const [labelViewMode, setLabelViewMode] = useState<StockLabelViewMode>("name");
  const toggleLabelView = useCallback(() => {
    setLabelViewMode((prev) => (prev === "name" ? "ticker" : "name"));
  }, []);
  const effectiveCurrencyMode: CurrencyDisplayMode =
    currencyToggleDisabled ? "KRW" : currencyDisplayMode;
  if (loading) {
    return (
      <HoldingsCard>
        <HoldingsCardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-28" />
        </HoldingsCardHeader>
        <HoldingsCardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </HoldingsCardContent>
      </HoldingsCard>
    );
  }

  if (rows.length === 0 && allRowsCount === 0) {
    return (
      <HoldingsCard>
        <HoldingsCardHeader className="flex flex-col items-stretch gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <HoldingsCardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            보유 종목
          </HoldingsCardTitle>
          <ListCardHeaderControls
            accountFilter={accountFilter}
            accountFilterOptions={accountFilterOptions}
            onAccountFilterChange={onAccountFilterChange}
            currencyDisplayMode={currencyDisplayMode}
            onCurrencyDisplayChange={onCurrencyDisplayChange}
            currencyToggleDisabled={currencyToggleDisabled}
            controlsDisabled
          />
        </HoldingsCardHeader>
        <HoldingsCardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            표시할 보유 종목이 없습니다. 대시보드에서 새로고침으로 동기화해 주세요.
          </p>
        </HoldingsCardContent>
      </HoldingsCard>
    );
  }

  const tableHeader = (
    <thead>
      <tr className="border-b border-border">
        <th className="min-w-[160px] max-w-[240px] sm:max-w-[280px] text-left py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
          <div className="inline-flex items-center gap-1.5">
            <span>{labelViewMode === "name" ? "종목명" : "티커"}</span>
            <StockLabelToggle mode={labelViewMode} onToggle={toggleLabelView} />
          </div>
        </th>
        <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
          현재가
        </th>
        <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
          <div className="inline-flex items-center justify-end gap-1.5">
            <span>{profitLabel(profitViewMode)}</span>
            <ProfitModeToggle mode={profitViewMode} onToggle={onToggleProfitView} />
          </div>
        </th>
        <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">
          수량
        </th>
        <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">
          평가금액
        </th>
        <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">
          계좌
        </th>
        <th className="py-3 px-3 sm:px-4 text-right align-middle whitespace-nowrap">
          <HoldingSortSelect sortKey={sortKey} onSortChange={onSortChange} />
        </th>
      </tr>
    </thead>
  );

  return (
    <HoldingsCard>
      <HoldingsCardHeader className="flex flex-col items-stretch gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <HoldingsCardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
          보유 종목
        </HoldingsCardTitle>
        <ListCardHeaderControls
          accountFilter={accountFilter}
          accountFilterOptions={accountFilterOptions}
          onAccountFilterChange={onAccountFilterChange}
          currencyDisplayMode={currencyDisplayMode}
          onCurrencyDisplayChange={onCurrencyDisplayChange}
          currencyToggleDisabled={currencyToggleDisabled}
        />
      </HoldingsCardHeader>
      <HoldingsCardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full min-w-[720px]">
              {tableHeader}
              {rows.length > 0 && (
              <tbody>
                {rows.map((row, index) => {
                  const { amountKrw, ratePercent } = rowProfitValues(row, profitViewMode);
                  const profitAmountUsd =
                    profitViewMode === "cumulative" ? row.profitLoss : row.dailyProfitLoss;
                  const isUp =
                    row.currency === "USD" && effectiveCurrencyMode === "USD"
                      ? profitAmountUsd >= 0
                      : amountKrw >= 0;
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onRowClick(row)}
                    >
                      <td className="py-3 px-3 sm:px-4 max-w-[240px] sm:max-w-[280px]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StockLogo ticker={row.ticker} size={36} />
                          <div className="min-w-0 truncate font-semibold text-sm sm:text-base">
                            {labelViewMode === "name" ? row.name : row.ticker}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <motion.div
                          key={`price-${row.id}-${effectiveCurrencyMode}`}
                          initial={{ opacity: 0.65 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="font-semibold text-sm sm:text-base tabular-nums"
                        >
                          {displayLastPrice(row, effectiveCurrencyMode)}
                        </motion.div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <div
                          className={`font-semibold flex items-center justify-end gap-1 text-sm sm:text-base ${isUp ? "text-green-500" : "text-red-500"}`}
                        >
                          {isUp ? (
                            <TrendingUp className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <TrendingDown className="h-3 w-3 flex-shrink-0" />
                          )}
                          <motion.span
                            key={`profit-${row.id}-${effectiveCurrencyMode}-${profitViewMode}`}
                            initial={{ opacity: 0.65 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="whitespace-nowrap"
                          >
                            {displayProfitAmount(row, profitViewMode, effectiveCurrencyMode)}
                          </motion.span>
                        </div>
                        <div className={`text-xs ${isUp ? "text-green-500" : "text-red-500"}`}>
                          {pctSigned(ratePercent)}
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right hidden md:table-cell">
                        <div className="text-xs sm:text-sm tabular-nums">{formatNumber(row.quantity)}</div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right hidden lg:table-cell">
                        <motion.div
                          key={`value-${row.id}-${effectiveCurrencyMode}`}
                          initial={{ opacity: 0.65 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="text-xs sm:text-sm tabular-nums"
                        >
                          {displayMarketValue(row, effectiveCurrencyMode)}
                        </motion.div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right hidden lg:table-cell">
                        <HoldingsBadge>
                          {ACCOUNT_BADGE_LABEL[row.accountType]}
                        </HoldingsBadge>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
              )}
            </table>
          </div>
        </div>
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            선택한 계좌에 표시할 종목이 없습니다.
          </p>
        )}
      </HoldingsCardContent>
    </HoldingsCard>
  );
}

export function StocksDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [realtime, setRealtime] = useState<RealtimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [profitViewMode, setProfitViewMode] = useState<ProfitViewMode>("cumulative");
  const [currencyDisplayMode, setCurrencyDisplayMode] =
    useState<CurrencyDisplayMode>("KRW");
  const [accountFilter, setAccountFilter] = useState<AccountFilterKey>("all");
  const [sortKey, setSortKey] = useState<HoldingSortKey>(DEFAULT_HOLDING_SORT);
  const [selectedHolding, setSelectedHolding] = useState<HoldingRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const toggleProfitView = useCallback(() => {
    setProfitViewMode((prev) => (prev === "cumulative" ? "daily" : "cumulative"));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [holdRes, rtRes] = await Promise.all([
        fetch("/api/holdings"),
        fetch("/api/dashboard/realtime"),
      ]);
      if (holdRes.ok) {
        const data = await holdRes.json();
        setHoldings(data.holdings ?? []);
      }
      if (rtRes.ok) {
        const data = await rtRes.json();
        setRealtime({
          totalValueKrw: data.totalValueKrw ?? 0,
          totalProfitKrw: data.totalProfitKrw ?? 0,
          totalProfitRate: data.totalProfitRate ?? 0,
          dailyProfitKrw: data.dailyProfitKrw ?? 0,
          holdingCount: data.holdingCount ?? 0,
          lastSynced: data.lastSynced ?? null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const allRows = useMemo(
    () => filterValuedHoldings(holdings).map(toHoldingRow),
    [holdings],
  );

  const accountFilterOptions = useMemo(() => {
    const types = new Set<AccountType>();
    for (const row of allRows) {
      types.add(row.accountType);
    }
    return ACCOUNT_TYPE_ORDER.filter((type) => types.has(type));
  }, [allRows]);

  useEffect(() => {
    if (
      accountFilter !== "all" &&
      !accountFilterOptions.includes(accountFilter)
    ) {
      setAccountFilter("all");
    }
  }, [accountFilter, accountFilterOptions]);

  const filteredRows = useMemo(() => {
    const filtered =
      accountFilter === "all"
        ? allRows
        : allRows.filter((row) => row.accountType === accountFilter);
    return sortHoldingRows(filtered, sortKey);
  }, [allRows, accountFilter, sortKey]);

  const currencyToggleDisabled = useMemo(() => {
    const visible =
      accountFilter === "all"
        ? allRows
        : allRows.filter((row) => row.accountType === accountFilter);
    return visible.length > 0 && visible.every((row) => row.currency !== "USD");
  }, [allRows, accountFilter]);

  const metrics = useMemo(() => {
    const computed = computeBrokerCostBasisMetrics(holdings);
    const dailyProfitKrw = holdings.reduce((sum, h) => sum + dailyProfitLossKrw(h), 0);
    const dailyProfitRate =
      computed.totalValueKrw - dailyProfitKrw > 0
        ? (dailyProfitKrw / (computed.totalValueKrw - dailyProfitKrw)) * 100
        : 0;

    if (realtime) {
      return {
        totalValueKrw: realtime.totalValueKrw,
        cumulativeProfitKrw: realtime.totalProfitKrw,
        cumulativeProfitRate: realtime.totalProfitRate * 100,
        dailyProfitKrw: realtime.dailyProfitKrw,
        dailyProfitRate,
        positionCount: allRows.length,
      };
    }

    return {
      totalValueKrw: computed.totalValueKrw,
      cumulativeProfitKrw: computed.totalProfitKrw,
      cumulativeProfitRate: computed.totalProfitRate * 100,
      dailyProfitKrw,
      dailyProfitRate,
      positionCount: allRows.length,
    };
  }, [holdings, realtime, allRows.length]);

  const lastSyncedCaption = useMemo(() => {
    if (loading) return "불러오는 중…";
    if (!realtime?.lastSynced) return "동기화 기록 없음";
    const date = new Date(realtime.lastSynced);
    return `마지막 동기화 ${date.toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [loading, realtime?.lastSynced]);

  const handleRowClick = (holding: HoldingRow) => {
    setSelectedHolding(holding);
    setIsDetailsOpen(true);
    router.replace(`/holdings?open=${encodeURIComponent(holding.id)}`, { scroll: false });
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    if (searchParams.get("open")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("open");
      const qs = params.toString();
      router.replace(qs ? `/holdings?${qs}` : "/holdings", { scroll: false });
    }
  };

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || loading || allRows.length === 0) return;
    const match = allRows.find((row) => row.id === openId);
    if (match) {
      setSelectedHolding(match);
      setIsDetailsOpen(true);
    }
  }, [searchParams, loading, allRows]);

  return (
    <PageContainer>
        <PageHeader
          title="Holdings"
          subtitle={`포트폴리오 평가와 손익을 확인합니다 · ${lastSyncedCaption}`}
        />

        <div className="space-y-8 md:space-y-10">
          <StatusSection
            totalValueKrw={metrics.totalValueKrw}
            cumulativeProfitKrw={metrics.cumulativeProfitKrw}
            cumulativeProfitRate={metrics.cumulativeProfitRate}
            dailyProfitKrw={metrics.dailyProfitKrw}
            dailyProfitRate={metrics.dailyProfitRate}
            profitViewMode={profitViewMode}
            onToggleProfitView={toggleProfitView}
            positionCount={metrics.positionCount}
            loading={loading}
          />
          <DataTable
            rows={filteredRows}
            allRowsCount={allRows.length}
            loading={loading}
            profitViewMode={profitViewMode}
            currencyDisplayMode={currencyDisplayMode}
            onCurrencyDisplayChange={setCurrencyDisplayMode}
            currencyToggleDisabled={currencyToggleDisabled}
            accountFilter={accountFilter}
            accountFilterOptions={accountFilterOptions}
            onAccountFilterChange={setAccountFilter}
            sortKey={sortKey}
            onSortChange={setSortKey}
            onToggleProfitView={toggleProfitView}
            onRowClick={handleRowClick}
          />
        </div>
        <HoldingDetails
          holding={selectedHolding}
          isOpen={isDetailsOpen}
          onClose={handleCloseDetails}
          profitViewMode={profitViewMode}
          onToggleProfitView={toggleProfitView}
          currencyDisplayMode={currencyDisplayMode}
          allRows={allRows}
        />
    </PageContainer>
  );
}
