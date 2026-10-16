import type { AccountType } from "@/generated/prisma";
import {
  accountTypesForDashboardGroup,
  type DashboardAccountGroupFilter,
} from "@/lib/accountGroups";

/** profitLoss를 KRW로 환산 (브로커 제공 손익 기준) */
export type HoldingProfitInput = {
  marketValueKrw: number;
  marketValue: number;
  currency: string;
  profitLoss: number | null;
  quantity?: number;
  avgPrice?: number;
  accountType?: AccountType | string;
};

export function holdingProfitLossKrw(h: HoldingProfitInput): number {
  if (h.profitLoss == null) return 0;
  if (h.currency === "KRW") return h.profitLoss;
  const rate = h.marketValue > 0 ? h.marketValueKrw / h.marketValue : 1;
  return h.profitLoss * rate;
}

/** 평가금이 있는 보유종목 (총자산·비중 집계용) */
export function filterValuedHoldings<T extends { marketValueKrw: number }>(
  holdings: T[],
): T[] {
  return holdings.filter((h) => h.marketValueKrw > 0);
}

/** 매입원가(평단×수량) 또는 profitLoss가 있는 종목만 수익률 분모·분자에 포함 */
export function hasKnownCostBasis(h: {
  profitLoss?: number | null;
  quantity?: number;
  avgPrice?: number;
}): boolean {
  if (h.profitLoss != null) return true;
  const qty = h.quantity ?? 0;
  const avg = h.avgPrice ?? 0;
  return qty > 0 && avg > 0;
}

export function filterCostBasisHoldings<
  T extends { marketValueKrw: number; profitLoss?: number | null; quantity?: number; avgPrice?: number },
>(holdings: T[]): T[] {
  return filterValuedHoldings(holdings).filter(hasKnownCostBasis);
}

export type BrokerCostBasisMetrics = {
  totalValueKrw: number;
  totalProfitKrw: number;
  /** 매입원가 합 = 총 평가금 − 총 수익금 */
  totalPurchaseCostKrw: number;
  /** 소수 (0.0799 = 7.99%) */
  totalProfitRate: number;
};

/**
 * 실시간 수익률 통일 공식 (보유종목·대시보드 공통)
 * 총 수익금 = Σ holding.profitLoss(KRW)
 * 수익률 = 총 수익금 / (총 평가금 − 총 수익금)
 */
export function computeBrokerCostBasisMetrics(
  holdings: HoldingProfitInput[],
): BrokerCostBasisMetrics {
  const valued = filterValuedHoldings(holdings);
  const withCost = filterCostBasisHoldings(holdings);
  const totalValueKrw = valued.reduce((s, h) => s + h.marketValueKrw, 0);
  const costBasisValueKrw = withCost.reduce((s, h) => s + h.marketValueKrw, 0);
  const totalProfitKrw = withCost.reduce((s, h) => s + holdingProfitLossKrw(h), 0);
  const totalPurchaseCostKrw = costBasisValueKrw - totalProfitKrw;
  const totalProfitRate =
    totalPurchaseCostKrw > 0 ? totalProfitKrw / totalPurchaseCostKrw : 0;

  return { totalValueKrw, totalProfitKrw, totalPurchaseCostKrw, totalProfitRate };
}

export function filterHoldingsByDashboardGroup<T extends { accountType: AccountType }>(
  holdings: T[],
  group: DashboardAccountGroupFilter,
): T[] {
  if (group === "all") return holdings;
  const types = accountTypesForDashboardGroup(group);
  return holdings.filter((h) => types.includes(h.accountType));
}

export type SnapshotPositionProfitInput = {
  accountType: string;
  marketValueKrw: number;
  profitLoss?: number | null;
  profitLossKrw?: number | null;
  currency?: string;
  marketValue?: number;
};

/** 스냅샷 positions에서 매입원가·수익률 산출 (profitLossKrw 우선, 이미 KRW면 재환산 안 함) */
export function computeBrokerCostBasisFromSnapshotPositions(
  positions: SnapshotPositionProfitInput[],
  totalValueKrwFallback = 0,
): BrokerCostBasisMetrics {
  const valued = filterValuedHoldings(
    positions.map((p) => ({ ...p, marketValueKrw: p.marketValueKrw ?? 0 })),
  );
  const withCost = valued.filter((p) =>
    hasKnownCostBasis({
      profitLoss: p.profitLoss,
      quantity: undefined,
      avgPrice: undefined,
    }) || p.profitLossKrw != null || p.profitLoss != null,
  );

  if (valued.length === 0) {
    return {
      totalValueKrw: totalValueKrwFallback,
      totalProfitKrw: 0,
      totalPurchaseCostKrw: totalValueKrwFallback,
      totalProfitRate: 0,
    };
  }

  let totalValueKrw = 0;
  let totalProfitKrw = 0;

  for (const p of valued) {
    totalValueKrw += p.marketValueKrw;
  }

  for (const p of withCost) {
    if (p.profitLossKrw != null) {
      totalProfitKrw += p.profitLossKrw;
    } else if (p.profitLoss != null) {
      totalProfitKrw += holdingProfitLossKrw({
        marketValueKrw: p.marketValueKrw,
        marketValue: p.marketValue ?? p.marketValueKrw,
        currency: p.currency ?? "KRW",
        profitLoss: p.profitLoss,
      });
    }
  }

  const costBasisValueKrw = withCost.reduce((s, p) => s + p.marketValueKrw, 0);
  const totalPurchaseCostKrw = costBasisValueKrw - totalProfitKrw;
  const totalProfitRate =
    totalPurchaseCostKrw > 0 ? totalProfitKrw / totalPurchaseCostKrw : 0;

  return { totalValueKrw, totalProfitKrw, totalPurchaseCostKrw, totalProfitRate };
}

/**
 * 월별 구간 수익률(%)
 * (이번 달 말 평가 − (지난 달 말 평가 + 이번 달 신규납입)) / (지난 달 말 평가 + 이번 달 신규납입) × 100
 */
export function computeMonthlyIntervalReturnRatePercent(
  endValueKrw: number,
  prevEndValueKrw: number | null,
  monthNewDepositsKrw: number,
  fallbackMetrics?: BrokerCostBasisMetrics,
): { returnRate: number | null; isInterval: boolean } {
  if (prevEndValueKrw != null) {
    const basis = prevEndValueKrw + monthNewDepositsKrw;
    if (basis <= 0) return { returnRate: null, isInterval: true };
    const gain = endValueKrw - basis;
    return { returnRate: (gain / basis) * 100, isInterval: true };
  }

  if (fallbackMetrics && fallbackMetrics.totalPurchaseCostKrw > 0) {
    return {
      returnRate: fallbackMetrics.totalProfitRate * 100,
      isInterval: false,
    };
  }

  return { returnRate: null, isInterval: false };
}
