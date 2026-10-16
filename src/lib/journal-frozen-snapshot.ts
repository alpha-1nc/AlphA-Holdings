import type { AccountType, Currency } from "@/generated/prisma";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";

export type JournalFrozenPosition = {
  ticker: string;
  name: string | null;
  accountType: AccountType;
  currency: Currency;
  marketValue: number;
  marketValueKrw: number;
  weightPct: number;
};

export type JournalFrozenSnapshot = {
  positions: JournalFrozenPosition[];
  usdRate: number | null;
  jpyRate: number | null;
  totalValueKrw: number;
  syncedAt: string;
  usedFallback: boolean;
};

type RawPosition = {
  ticker: string;
  name?: string | null;
  accountType: AccountType | string;
  currency: Currency | string;
  marketValue?: number;
  marketValueKrw?: number;
};

export function sortFrozenPositionsForDisplay(
  positions: JournalFrozenPosition[],
): JournalFrozenPosition[] {
  return [...positions].sort((a, b) => {
    const aCash = a.accountType === "CASH";
    const bCash = b.accountType === "CASH";
    if (aCash !== bCash) return aCash ? 1 : -1;
    return b.marketValueKrw - a.marketValueKrw;
  });
}

function computeWeights(
  rows: Omit<JournalFrozenPosition, "weightPct">[],
): JournalFrozenPosition[] {
  const total = rows.reduce(
    (s, r) => (r.marketValueKrw > 0 ? s + r.marketValueKrw : s),
    0,
  );
  return rows.map((r) => ({
    ...r,
    weightPct: total > 0 && r.marketValueKrw > 0 ? (r.marketValueKrw / total) * 100 : 0,
  }));
}

export function buildJournalFrozenSnapshotFromHoldings(
  holdings: Array<{
    ticker: string;
    name: string | null;
    accountType: AccountType;
    currency: Currency;
    marketValue: number;
    marketValueKrw: number;
  }>,
  options: {
    usdRate: number | null;
    jpyRate: number | null;
    syncedAt: Date;
    usedFallback: boolean;
  },
): JournalFrozenSnapshot {
  const baseRows = holdings.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    accountType: h.accountType,
    currency: h.currency,
    marketValue: h.marketValue,
    marketValueKrw: h.marketValueKrw,
  }));
  const positions = sortFrozenPositionsForDisplay(computeWeights(baseRows));
  const totalValueKrw = positions.reduce(
    (s, p) => (p.marketValueKrw > 0 ? s + p.marketValueKrw : s),
    0,
  );

  return {
    positions,
    usdRate: options.usdRate,
    jpyRate: options.jpyRate,
    totalValueKrw,
    syncedAt: options.syncedAt.toISOString(),
    usedFallback: options.usedFallback,
  };
}

export function buildJournalFrozenSnapshotFromRawPositions(
  rawPositions: RawPosition[],
  options: {
    usdRate: number | null;
    jpyRate: number | null;
    totalValueKrw?: number;
    syncedAt: Date;
    usedFallback: boolean;
  },
): JournalFrozenSnapshot {
  const baseRows = rawPositions.map((p) => ({
    ticker: p.ticker,
    name: p.name ?? null,
    accountType: p.accountType as AccountType,
    currency: p.currency as Currency,
    marketValue: p.marketValue ?? 0,
    marketValueKrw: p.marketValueKrw ?? 0,
  }));
  const positions = sortFrozenPositionsForDisplay(computeWeights(baseRows));
  const totalValueKrw =
    options.totalValueKrw != null && options.totalValueKrw > 0
      ? options.totalValueKrw
      : positions.reduce((s, p) => (p.marketValueKrw > 0 ? s + p.marketValueKrw : s), 0);

  return {
    positions,
    usdRate: options.usdRate,
    jpyRate: options.jpyRate,
    totalValueKrw,
    syncedAt: options.syncedAt.toISOString(),
    usedFallback: options.usedFallback,
  };
}

export function parseJournalFrozenSnapshot(value: unknown): JournalFrozenSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<JournalFrozenSnapshot>;
  if (!Array.isArray(v.positions)) return null;

  const positions = v.positions
    .filter(
      (p): p is JournalFrozenPosition =>
        !!p &&
        typeof p === "object" &&
        typeof (p as JournalFrozenPosition).ticker === "string" &&
        typeof (p as JournalFrozenPosition).marketValueKrw === "number",
    )
    .map((p) => ({
      ticker: p.ticker,
      name: p.name ?? null,
      accountType: p.accountType as AccountType,
      currency: p.currency as Currency,
      marketValue: p.marketValue ?? 0,
      marketValueKrw: p.marketValueKrw,
      weightPct: p.weightPct ?? 0,
    }));

  if (positions.length === 0 && v.totalValueKrw == null) return null;

  return {
    positions: sortFrozenPositionsForDisplay(positions),
    usdRate: v.usdRate ?? null,
    jpyRate: v.jpyRate ?? null,
    totalValueKrw: v.totalValueKrw ?? 0,
    syncedAt: typeof v.syncedAt === "string" ? v.syncedAt : new Date().toISOString(),
    usedFallback: !!v.usedFallback,
  };
}

export function frozenSnapshotToDonutData(snapshot: JournalFrozenSnapshot) {
  return snapshot.positions
    .filter((p) => p.marketValueKrw > 0)
    .map((p) => ({
      ticker: p.ticker,
      name: getPortfolioItemDisplayLabel({
        ticker: p.ticker,
        displayName: p.name,
      }),
      value: p.marketValueKrw,
    }));
}
