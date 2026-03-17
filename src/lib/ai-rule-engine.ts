// ── AI 분석 입력용 규칙 엔진 ─────────────────────────────────────────────
// 리포트·전략 데이터를 기반으로 Boolean 플래그 객체를 생성하여 AI 프롬프트에 전달

import { computeRoleAllocation } from "./role-allocation";
import type { PortfolioItem, PortfolioStrategy, Report } from "@/generated/prisma";

export interface ReportWithItems extends Report {
  portfolioItems: PortfolioItem[];
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
 * 현재 리포트, 이전 리포트, 포트폴리오 전략을 입력받아
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
    if (previousReport && previousReport.totalInvestedKrw > 0 && currentReport.totalInvestedKrw > 0) {
      const prevReturn = previousReport.totalCurrentKrw / previousReport.totalInvestedKrw;
      const currReturn = currentReport.totalCurrentKrw / currentReport.totalInvestedKrw;
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

  const allocation = computeRoleAllocation(
    currentReport.portfolioItems,
    strategies
  );

  const totalKrw = currentReport.portfolioItems
    .filter((i) => i.accountType !== "CASH" && i.krwAmount > 0)
    .reduce((s, i) => s + i.krwAmount, 0);

  // 역할군별 underweight/overweight 판단
  const core = allocation.find((a) => a.role === "CORE");
  const booster = allocation.find((a) => a.role === "BOOSTER");
  const growth = allocation.find((a) => a.role === "GROWTH");
  const defensive = allocation.find((a) => a.role === "DEFENSIVE");

  const isCoreUnderweight =
    !!core &&
    core.targetWeight > 0 &&
    core.actualWeight < core.targetWeight - WEIGHT_TOLERANCE;

  const isBoosterOverweight =
    !!booster &&
    booster.targetWeight > 0 &&
    booster.actualWeight > booster.targetWeight + WEIGHT_TOLERANCE;

  const isGrowthUnderweight =
    !!growth &&
    growth.targetWeight > 0 &&
    growth.actualWeight < growth.targetWeight - WEIGHT_TOLERANCE;

  const isDefensiveUnderweight =
    !!defensive &&
    defensive.targetWeight > 0 &&
    defensive.actualWeight < defensive.targetWeight - WEIGHT_TOLERANCE;

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

  // 전략이 하나도 없으면 비교 기준이 없으므로 미분류 판정 불가 → false
  const validStrategyTickers = strategies
    .map((s) => ((s as { ticker?: string }).ticker ?? "").trim().toUpperCase())
    .filter((t) => t.length > 0);

  const hasUnassignedHoldings =
    validStrategyTickers.length > 0 &&
    realHoldings.some((item) => {
      const itemTicker = ((item as { ticker?: string }).ticker ?? "").trim().toUpperCase();
      const itemStr =
        `${itemTicker} ${(item as { symbol?: string }).symbol ?? ""} ${(item as { name?: string }).name ?? ""}`.toUpperCase();
      const isAssigned = validStrategyTickers.some(
        (sTicker) => itemStr.includes(sTicker) || sTicker.includes(itemTicker)
      );
      return !isAssigned;
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
  if (previousReport && previousReport.totalInvestedKrw > 0 && currentReport.totalInvestedKrw > 0) {
    const prevReturn =
      previousReport.totalCurrentKrw / previousReport.totalInvestedKrw;
    const currReturn =
      currentReport.totalCurrentKrw / currentReport.totalInvestedKrw;
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
