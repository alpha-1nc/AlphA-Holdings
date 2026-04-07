// ── AI 분석 입력용 규칙 엔진 ─────────────────────────────────────────────
// 리포트·전략 데이터를 기반으로 Boolean 플래그 객체를 생성하여 AI 프롬프트에 전달

import {
  computeTickerDeviation,
  type RoleKey,
} from "./role-allocation";
import type {
  AccountType,
  NewInvestment,
  PortfolioItem,
  PortfolioStrategy,
  Report,
} from "@/generated/prisma";

function strategyCompositeKey(ticker: string, accountType: AccountType): string {
  return `${ticker.trim().toUpperCase()}|${accountType}`;
}

export interface ReportWithItems extends Report {
  portfolioItems: PortfolioItem[];
  newInvestments?: NewInvestment[];
}

export interface AiAnalysisFlags {
  /** 포트폴리오 종목 데이터가 존재하는지 여부 */
  hasPortfolioData: boolean;
  /** 코어 역할군 실제 비중이 목표보다 낮음 */
  isCoreUnderweight: boolean;
  /** 부스터 역할군 실제 비중이 목표보다 높음 */
  isBoosterOverweight: boolean;
  /** 최대 보유 종목 비중이 30% 초과 (집중도 높음) */
  isTopHoldingConcentrated: boolean;
  /** 수익률이 이전 대비 하락 */
  isReturnRateDropped: boolean;
  /** 성장 역할군 실제 비중이 목표보다 낮음 */
  isGrowthUnderweight?: boolean;
  /** 방어 역할군 실제 비중이 목표보다 낮음 */
  isDefensiveUnderweight?: boolean;
  /** 미지정 종목이 존재함 */
  hasUnassignedHoldings?: boolean;
}

/** 허용 오차 (%) - 이 범위 내면 underweight/overweight로 판단하지 않음 */
const WEIGHT_TOLERANCE = 2;

/**
 * 현재 리포트, 이전 리포트, 목표 포트폴리오를 입력받아
 * AI 분석용 Boolean 플래그 객체를 반환합니다.
 */
export function buildAiAnalysisInput(
  currentReport: ReportWithItems,
  previousReport: ReportWithItems | null,
  strategies: PortfolioStrategy[]
): AiAnalysisFlags & { hasPortfolioData: boolean } {
  // 포트폴리오 데이터 존재 여부 — 현금 전용 항목만 있거나 빈 배열이면 비중 관련 플래그 무효화
  const nonCashPortfolioItems = (currentReport.portfolioItems ?? []).filter(
    (i) =>
      i.accountType !== "CASH" &&
      !(i.ticker ?? "").includes("현금") &&
      !(i.ticker ?? "").includes("💵") &&
      !/^(KRW|USD|JPY|EUR|GBP|CNY|CASH|현금)$/i.test((i.ticker ?? "").trim()) &&
      i.krwAmount > 0
  );
  const hasPortfolioData = nonCashPortfolioItems.length > 0;

  // 데이터가 없으면 비중 관련 플래그를 전부 null/false로 단락 반환
  if (!hasPortfolioData) {
    let isReturnRateDropped = false;
    const prevInv = previousReport?.totalInvestedKrw ?? 0;
    const curInv = currentReport.totalInvestedKrw ?? 0;
    if (previousReport && prevInv > 0 && curInv > 0) {
      const prevReturn = (previousReport.totalCurrentKrw ?? 0) / prevInv;
      const currReturn = (currentReport.totalCurrentKrw ?? 0) / curInv;
      isReturnRateDropped = currReturn < prevReturn;
    }
    return {
      hasPortfolioData: false,
      isCoreUnderweight: false,
      isBoosterOverweight: false,
      isTopHoldingConcentrated: false,
      isReturnRateDropped,
      isGrowthUnderweight: null as unknown as undefined,
      isDefensiveUnderweight: null as unknown as undefined,
      hasUnassignedHoldings: null as unknown as undefined,
    };
  }

  const deviation = computeTickerDeviation(
    currentReport.portfolioItems,
    strategies,
  );

  const totalKrw = currentReport.portfolioItems
    .filter((i) => i.accountType !== "CASH" && i.krwAmount > 0)
    .reduce((s, i) => s + i.krwAmount, 0);

  const tickerToRole = new Map<string, RoleKey>();
  for (const s of strategies) {
    tickerToRole.set(
      strategyCompositeKey(s.ticker, s.accountType),
      ((s as { role?: string }).role ?? "UNASSIGNED") as RoleKey,
    );
  }

  const roleTarget = new Map<RoleKey, number>();
  const roleActual = new Map<RoleKey, number>();
  for (const s of strategies) {
    const role = ((s as { role?: string }).role ?? "UNASSIGNED") as RoleKey;
    roleTarget.set(
      role,
      (roleTarget.get(role) ?? 0) + ((s as { targetWeight?: number }).targetWeight ?? 0),
    );
  }
  for (const d of deviation) {
    const role =
      tickerToRole.get(strategyCompositeKey(d.ticker, d.accountType)) ??
      ("UNASSIGNED" as RoleKey);
    roleActual.set(role, (roleActual.get(role) ?? 0) + d.actualWeight);
  }

  const coreTarget = roleTarget.get("CORE") ?? 0;
  const coreActual = roleActual.get("CORE") ?? 0;
  const boosterTarget = roleTarget.get("BOOSTER") ?? 0;
  const boosterActual = roleActual.get("BOOSTER") ?? 0;
  const growthTarget = roleTarget.get("GROWTH") ?? 0;
  const growthActual = roleActual.get("GROWTH") ?? 0;
  const defensiveTarget = roleTarget.get("DEFENSIVE") ?? 0;
  const defensiveActual = roleActual.get("DEFENSIVE") ?? 0;

  const isCoreUnderweight =
    coreTarget > 0 &&
    coreActual < coreTarget - WEIGHT_TOLERANCE;

  const isBoosterOverweight =
    boosterTarget > 0 &&
    boosterActual > boosterTarget + WEIGHT_TOLERANCE;

  const isGrowthUnderweight =
    growthTarget > 0 &&
    growthActual < growthTarget - WEIGHT_TOLERANCE;

  const isDefensiveUnderweight =
    defensiveTarget > 0 &&
    defensiveActual < defensiveTarget - WEIGHT_TOLERANCE;

  // 미분류 종목: ticker/symbol/name을 합쳐 전략 티커가 포함되는지 대소문자 무시 검사
  const isCashLike = (item: PortfolioItem): boolean =>
    item.accountType === "CASH" ||
    !(item.ticker ?? "").trim() ||
    (item.ticker ?? "").includes("현금") ||
    (item.ticker ?? "").includes("💵") ||
    /^(KRW|USD|JPY|EUR|GBP|CNY|CASH|현금)$/i.test((item.ticker ?? "").trim());

  const realHoldings = currentReport.portfolioItems.filter(
    (i) => !isCashLike(i) && i.krwAmount > 0
  );

  const hasUnassignedHoldings =
    strategies.length > 0 &&
    realHoldings.some((item) => {
      const itemTicker = ((item as { ticker?: string }).ticker ?? "").trim().toUpperCase();
      const assigned = strategies.some(
        (s) =>
          s.ticker.trim().toUpperCase() === itemTicker &&
          s.accountType === item.accountType,
      );
      return !assigned;
    });

  // 최대 보유 종목 비중 (30% 초과 시 집중)
  let maxHoldingWeight = 0;
  if (totalKrw > 0) {
    const nonCash = currentReport.portfolioItems.filter(
      (i) => i.accountType !== "CASH" && i.krwAmount > 0
    );
    for (const item of nonCash) {
      const w = (item.krwAmount / totalKrw) * 100;
      if (w > maxHoldingWeight) maxHoldingWeight = w;
    }
  }
  const isTopHoldingConcentrated = maxHoldingWeight > 30;

  // 수익률 하락 여부 (이전 리포트와 비교)
  let isReturnRateDropped = false;
  const prevInvQ = previousReport?.totalInvestedKrw ?? 0;
  const curInvQ = currentReport.totalInvestedKrw ?? 0;
  if (previousReport && prevInvQ > 0 && curInvQ > 0) {
    const prevReturn = (previousReport.totalCurrentKrw ?? 0) / prevInvQ;
    const currReturn = (currentReport.totalCurrentKrw ?? 0) / curInvQ;
    isReturnRateDropped = currReturn < prevReturn;
  }

  return {
    hasPortfolioData: true,
    isCoreUnderweight,
    isBoosterOverweight,
    isTopHoldingConcentrated,
    isReturnRateDropped,
    isGrowthUnderweight,
    isDefensiveUnderweight,
    hasUnassignedHoldings,
  };
}
