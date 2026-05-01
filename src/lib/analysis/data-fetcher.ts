/**
 * src/lib/analysis/data-fetcher.ts
 * AlphA Holdings — 주식 분석 리포트 데이터 수집 모듈
 *
 * 수집 소스:
 *  1. yahoo-finance2  → 재무제표, 주가, 밸류에이션
 *  2. FMP (선택)     → 애널리스트 추정·연간 손익 보완 (FMP_API_KEY)
 *  3. FRED API        → 거시경제 지표 (금리, CPI, 실업률 등)
 *  4. NewsAPI         → 최근 뉴스 헤드라인
 */

import yahooFinance from "yahoo-finance2";

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

export interface FinancialData {
  ticker: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  exchangeName: string | null;
  website: string | null;
  description: string | null;
  employees: number | null;

  currentPrice: number | null;
  previousClose: number | null;
  open: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  volume: number | null;
  averageVolume: number | null;
  marketCap: number | null;

  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  enterpriseValue: number | null;
  evToRevenue: number | null;
  evToEbitda: number | null;

  revenueGrowth: number | null;
  /** 3년 매출 CAGR(연간 시계열 우선) 또는 추정/TTM 대체 */
  revenueCAGR3Y: number | null;
  earningsGrowth: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  returnOnAssets: number | null;
  returnOnEquity: number | null;

  totalCash: number | null;
  totalDebt: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;

  dividendRate: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;

  targetHighPrice: number | null;
  targetLowPrice: number | null;
  targetMeanPrice: number | null;
  recommendationMean: number | null;
  recommendationKey: string | null;
  numberOfAnalystOpinions: number | null;

  priceHistory: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;

  earningsHistory: Array<{
    period: string;
    revenue: number | null;
    earnings: number | null;
    epsActual: number | null;
    epsEstimate: number | null;
    epsDiff: number | null;
    surprisePercent: number | null;
  }>;

  roic: number | null;
  operatingIncome: number | null;
  operatingIncomeGrowth: number | null;
  operatingLeverage: number | null;
  ebit: number | null;
  interestExpense: number | null;
  interestCoverage: number | null;
  dividendGrowthYears: number | null;
  shareRepurchase: number | null;
  trailingEps: number | null;
  epsEstimateNextYear: number | null;
  forwardEpsCAGR: number | null;
  /** +1y만으로 산출한 1년 성장률일 때 true (2년 CAGR이 아님) */
  forwardEpsCagrIsOneYear: boolean;
  fiveYearAvgPE: number | null;
  /** 현재 Trailing P/E가 5년 평균 Trailing P/E 대비 괴리율
   * 계산식: (trailingPE - fiveYearAvgPE) / fiveYearAvgPE
   * 양수 = 할증, 음수 = 할인
   * trailingPE나 fiveYearAvgPE가 null이면 null */
  peRatioVs5YearAvg: number | null;

  /** FMP 애널리스트 컨센서스 기반 순전진 EPS CAGR (Yahoo trailing EPS 대비) */
  fmpForwardEpsCAGR3Y: number | null;
  /** 위 CAGR 산출에 사용한 연수 (1~3), FMP 미사용 시 null */
  fmpEpsCagrYears: number | null;
  /** FMP 연간 매출 시계열 기준 3년 매출 CAGR */
  fmpRevenueCAGR3Y: number | null;
  fmpHistoricalEps: Array<{ year: number; eps: number }> | null;
  /** FMP cash-flow-statement 기반 TTM FCF (OCF − |CapEx| 분기 합) */
  fmpFreeCashflow: number | null;
  /** FMP cash-flow-statement 최신 분기 |CapEx| */
  fmpCapex: number | null;

  stockBasedCompensation: number | null;
  netDilutionRate: number | null;
  netDilutionDetail: string | null;
  peersMedian: {
    grossMargin: number | null;
    evToFcf: number | null;
    evToGrossProfit: number | null;
    peersUsed: string[];
  } | null;

  /** Model B — Rule of 40: 매출성장률(%) + FCF마진(%) */
  ruleOf40: number | null;
  /** Model B — 주식기반보상 / 매출 */
  sbcToRevenue: number | null;
  /** Model B — 연 현금 런웨이 (FCF<0일 때만; FCF>0이면 null) */
  cashRunwayYears: number | null;
  /** Model B — FCF>0이면 현금 소진 없음으로 간주 */
  isCashRunwayInfinite: boolean;
  /** Model B — EV / 매출총이익 (기업 자체) */
  evToGrossProfit: number | null;
  /** Model B — EV/Sales ÷ (성장률×100), 성장률은 소수(예: 0.05) */
  evToSalesGrowthRatio: number | null;
  /** Model B — 분기 YoY 매출성장률 표준편차(%p) */
  revenueGrowthStdDev: number | null;
  /** Model B — FMP 애널리스트 차기 연도 대비 매출 성장률(소수) */
  fmpForwardRevenueGrowth: number | null;
  /** Model B — 분기별 YoY 매출성장률(소수) */
  quarterlyRevenueGrowthRates: number[] | null;

  /** Model C — 음수 분기 OCF 평균 절대값(FMP 분기 현금흐름표) */
  quarterlyBurnRate: number | null;
  /** Model C — 총현금 ÷ 분기 소진율 */
  cashRunwayQuarters: number | null;
  /** Model C — 희석주식수 YoY(연간 시계열 최근 2년) */
  sharesOutstandingYoY: number | null;
  /** Model C — 프리매출 추정 */
  isPreRevenue: boolean;
  /** Model C — EV ÷ EV/Revenue 역산 매출 */
  revenueAbsolute: number | null;
  /** Model C — P/B와 동일(priceToBook) */
  marketCapToBookRatio: number | null;

  /** Model D — 재고회전율 YoY (연간 시계열, 최신 대비 전년) */
  inventoryTurnoverYoY: number | null;
  /** Model D — FCF ÷ 총 배당지급액 (dividendRate·무배당 시 null) */
  dividendCoverageRatio: number | null;

  /** Model E — 베타 (Yahoo defaultKeyStatistics) */
  beta: number | null;
  /** Model E — 정당 P/B (ROE ÷ CoE), collectAllData에서 산출 */
  justifiedPB: number | null;
  /** Model E — 자기자본비용 CoE */
  costOfEquity: number | null;
  /** Model E — NIM 근사 (gross/operating margin 기반, 참고용) */
  netInterestMarginProxy: number | null;

  /** Model F — FFO/주 (FMP OCF TTM → Yahoo 영업현금흐름 → 순이익+D&A) */
  ffoPerShare: number | null;
  /** Model F — FFO 산출 방식 (추적용) */
  ffoCalculationMethod:
    | "fmpOperatingCashflowTtm"
    | "operatingCF"
    | "netIncomePlusDA"
    | null;
  /** Model F — 배당률 ÷ FFO/주 */
  ffoPayoutRatio: number | null;
  /** Model F — 연간 FFO YoY (최근 2년 시계열) */
  ffoGrowthRate: number | null;
  /** Model F — 장기부채 ÷ 총부채 */
  longTermDebtRatio: number | null;
  /** Model F — 배당수익률 − 10년 국채(소수, 예: 0.02 = 200bps) */
  dividendToTreasurySpread: number | null;
  /** Model F — 주가 ÷ FFO/주 */
  priceToFfo: number | null;
}

export interface FredSeries {
  seriesId: string;
  name: string;
  latestValue: number | null;
  latestDate: string | null;
  previousValue: number | null;
  change: number | null;
  changePercent: number | null;
  unit: string;
}

export interface MacroData {
  federalFundsRate: FredSeries | null;
  tenYearTreasury: FredSeries | null;
  twoYearTreasury: FredSeries | null;
  cpiYoY: FredSeries | null;
  pce: FredSeries | null;
  unemploymentRate: FredSeries | null;
  nonfarmPayrolls: FredSeries | null;
  gdpGrowth: FredSeries | null;
  ismManufacturing: FredSeries | null;
  dxy: FredSeries | null;
  fetchedAt: string;
}

export interface NewsItem {
  title: string;
  description: string | null;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface NewsData {
  companyNews: NewsItem[];
  marketNews: NewsItem[];
  fetchedAt: string;
}

export interface CollectedData {
  financial: FinancialData;
  macro: MacroData;
  news: NewsData;
  collectedAt: string;
}

// ─────────────────────────────────────────────
// 1. Yahoo Finance 데이터 수집
// ─────────────────────────────────────────────

const DEFAULT_TAX_RATE = 0.21;

/** fundamentalsTimeSeries(annual, module all) 병합 행 */
type FundamentalsAnnualRow = Record<string, unknown> & { date: Date };

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

/** fundamentalsTimeSeries 행의 date (unix 초·Date·ISO 문자열) → Date */
function normalizeFundamentalsDate(d: unknown): Date {
  if (d instanceof Date) return d;
  if (typeof d === "number") {
    const ms = d < 1e12 ? d * 1000 : d;
    return new Date(ms);
  }
  if (typeof d === "string") {
    const t = Date.parse(d);
    return Number.isFinite(t) ? new Date(t) : new Date(0);
  }
  return new Date(0);
}

function ebitFromFundamentalsRow(row: Record<string, unknown>): number | null {
  return toNumber(row.EBIT) ?? toNumber(row.ebit);
}

/** historical 배당 이벤트(연도별 합계)로 최근 연도부터 역순 YoY 증가 연수 (없으면 0) */
function computeDividendGrowthYearsFromDividendHistory(
  rows: Array<{ date: Date; dividends: number }>
): number {
  try {
    if (!rows.length) return 0;
    const currentYear = new Date().getFullYear();
    const byYear = new Map<number, number>();
    for (const r of rows) {
      const y = new Date(r.date).getFullYear();
      if (y === currentYear) continue;
      const d =
        typeof r.dividends === "number" && Number.isFinite(r.dividends)
          ? r.dividends
          : 0;
      byYear.set(y, (byYear.get(y) ?? 0) + d);
    }
    const yearsDesc = [...byYear.keys()].sort((a, b) => b - a);
    if (yearsDesc.length < 2) return 0;
    let count = 0;
    for (let i = 0; i < yearsDesc.length - 1; i++) {
      const yCur = yearsDesc[i]!;
      const yPrev = yearsDesc[i + 1]!;
      if ((byYear.get(yCur) ?? 0) > (byYear.get(yPrev) ?? 0)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

/** earningsTrend 행에서 EPS 추정(avg 우선, 없으면 current) */
function earningsEstimateAvgOrCurrent(t: {
  earningsEstimate?: { avg?: number | null; current?: number | null } | null;
}): number | null {
  const e = t.earningsEstimate;
  if (!e) return null;
  return toNumber(e.avg) ?? toNumber(e.current) ?? null;
}

function computeForwardEpsCagr(
  trailingEps: number | null,
  epsTwoYear: number | null,
  epsNextYear: number | null
): { cagr: number | null; isOneYear: boolean } {
  try {
    if (trailingEps === null || trailingEps <= 0) {
      return { cagr: null, isOneYear: false };
    }
    if (epsTwoYear !== null && epsTwoYear > 0) {
      const cagr = Math.pow(epsTwoYear / trailingEps, 1 / 2) - 1;
      return {
        cagr: Number.isFinite(cagr) ? cagr : null,
        isOneYear: false,
      };
    }
    if (epsNextYear !== null && epsNextYear > 0) {
      return { cagr: epsNextYear / trailingEps - 1, isOneYear: true };
    }
    return { cagr: null, isOneYear: false };
  } catch {
    return { cagr: null, isOneYear: false };
  }
}

/** 연간 fundamentals 행에서 순이익·희석 주식수로 EPS (연도 = date 연도) */
function epsFromAnnualFundamentalsRow(row: FundamentalsAnnualRow): number | null {
  const r = row as Record<string, unknown>;
  const netIncome =
    toNumber(r.netIncome) ?? toNumber(r.annualNetIncome) ?? null;
  const shares =
    toNumber(r.annualDilutedAverageShares) ??
    toNumber(r.dilutedAverageShares) ??
    toNumber(r.annualOrdinarySharesNumber) ??
    toNumber(r.ordinarySharesNumber) ??
    null;
  if (netIncome === null || shares === null || shares <= 0) return null;
  const eps = netIncome / shares;
  return Number.isFinite(eps) && eps > 0 ? eps : null;
}

function computeFiveYearAvgPE(
  historical5y: Array<{ date: Date; close?: number }>,
  fundamentalsAnnualRows: FundamentalsAnnualRow[]
): number | null {
  try {
    if (!historical5y.length) return null;

    const epsByYear = new Map<number, number>();
    for (const row of fundamentalsAnnualRows) {
      const y = row.date.getFullYear();
      const eps = epsFromAnnualFundamentalsRow(row);
      if (eps === null) continue;
      epsByYear.set(y, eps);
    }

    const currentYear = new Date().getFullYear();
    const peValues: number[] = [];
    for (let i = 0; i < 5; i++) {
      const year = currentYear - i;
      const closes = historical5y
        .filter((h) => h.date.getFullYear() === year)
        .map((h) => toNumber(h.close))
        .filter((c): c is number => c !== null && c > 0);
      if (closes.length === 0) continue;
      const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;

      const eps = epsByYear.get(year);
      if (eps === undefined || eps <= 0) continue;
      const pe = avgPrice / eps;
      if (Number.isFinite(pe) && pe > 0) {
        peValues.push(pe);
      }
    }
    if (peValues.length < 3) return null;
    const avg = peValues.reduce((a, b) => a + b, 0) / peValues.length;
    if (!Number.isFinite(avg) || avg < 5 || avg > 100) return null;
    return avg;
  } catch {
    return null;
  }
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** Peer EV/FCF용: OCF − |CapEx| (둘 다 있을 때), 아니면 Yahoo freeCashflow */
function peerFcfForEvToFcf(
  fd: { operatingCashflow?: number; freeCashflow?: number } | null | undefined
): number | null {
  if (!fd) return null;
  const ocf = toNumber(fd.operatingCashflow);
  const capex = toNumber((fd as Record<string, unknown>).capitalExpenditures);
  if (ocf !== null && capex !== null) {
    return ocf - Math.abs(capex);
  }
  return toNumber(fd.freeCashflow);
}

type YahooFinanceClient = InstanceType<typeof yahooFinance>;

/**
 * Yahoo recommendations peers 기반 grossMargin / EV/FCF / EV/GrossProfit 중앙값.
 * EV/GP·매출총이익률 중앙값은 전통 기업이 섞여 왜곡될 수 있어 하한 미만이면 null (비교군 부적절).
 */
async function fetchPeersMedian(
  yf: YahooFinanceClient,
  upperTicker: string
): Promise<FinancialData["peersMedian"]> {
  try {
    const recResponse = await yf.recommendationsBySymbol(upperTicker);
    const peerCandidates = (recResponse.recommendedSymbols ?? [])
      .map((x) => x.symbol)
      .filter((s): s is string => typeof s === "string" && s.length > 0 && !s.includes("."))
      .slice(0, 6);
    if (peerCandidates.length < 3) return null;

    const settled = await Promise.all(
      peerCandidates.map(async (peer) => {
        try {
          const qs = await yf.quoteSummary(peer, {
            modules: ["financialData", "defaultKeyStatistics"],
          });
          return { peer, qs };
        } catch {
          return null;
        }
      })
    );
    const ok = settled.filter((r): r is NonNullable<typeof r> => r !== null);
    if (ok.length === 0) return null;

    const grossMarginValues: number[] = [];
    const evToFcfValues: number[] = [];
    const evToGrossProfitValues: number[] = [];
    for (const { qs } of ok) {
      const gm = qs.financialData?.grossMargins;
      if (typeof gm === "number" && Number.isFinite(gm)) {
        grossMarginValues.push(gm);
      }
      const peerFcf = peerFcfForEvToFcf(qs.financialData);
      const ev = qs.defaultKeyStatistics?.enterpriseValue;
      if (
        peerFcf !== null &&
        peerFcf > 0 &&
        typeof ev === "number" &&
        Number.isFinite(ev)
      ) {
        evToFcfValues.push(ev / peerFcf);
      }
      const evToRev = qs.defaultKeyStatistics?.enterpriseToRevenue;
      if (
        typeof gm === "number" &&
        Number.isFinite(gm) &&
        typeof evToRev === "number" &&
        Number.isFinite(evToRev) &&
        evToRev !== 0 &&
        typeof ev === "number" &&
        Number.isFinite(ev)
      ) {
        const grossProfit = gm * (ev / evToRev);
        if (Number.isFinite(grossProfit) && grossProfit > 0) {
          evToGrossProfitValues.push(ev / grossProfit);
        }
      }
    }

    const grossMarginMed = median(grossMarginValues);
    const evToFcfMed = median(evToFcfValues);
    const evToGrossProfitMed = median(evToGrossProfitValues);

    return {
      grossMargin:
        grossMarginMed != null && grossMarginMed < 0.3 ? null : grossMarginMed,
      evToFcf: evToFcfMed,
      evToGrossProfit:
        evToGrossProfitMed != null && evToGrossProfitMed < 8
          ? null
          : evToGrossProfitMed,
      peersUsed: ok.map((r) => r.peer),
    };
  } catch {
    return null;
  }
}

function formatUsdDilutionLabel(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** fundamentals / cashflow 행에서 키 순서대로 첫 유효 숫자를 절대값으로 반환 */
function firstAbsNumberFromKeys(
  row: Record<string, unknown> | undefined,
  keys: readonly string[]
): number | null {
  if (!row) return null;
  for (const k of keys) {
    const v = toNumber(row[k]);
    if (v !== null) return Math.abs(v);
  }
  return null;
}

/** fundamentals 연간 행에서 매출(여러 키 시도) */
function annualTotalRevenueFromRow(row: Record<string, unknown>): number | null {
  const r =
    toNumber(row.annualTotalRevenue) ??
    toNumber(row.totalRevenue) ??
    toNumber(row.annualRevenue);
  return r !== null && r > 0 ? r : null;
}

/** 연도 오름차순 연간 매출로 최근 3년 CAGR: (latest/oldest)^(1/3)-1, 최소 4개 연도 */
/** 연간 fundamentals에서 희석주식수 YoY: (최신 − 전년) ÷ 전년 */
function computeSharesOutstandingYoYFromAnnualRows(
  rows: FundamentalsAnnualRow[]
): number | null {
  try {
    const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const points: { shares: number }[] = [];
    for (const row of sorted) {
      const r = row as Record<string, unknown>;
      const sh =
        toNumber(r.annualDilutedAverageShares) ?? toNumber(r.dilutedAverageShares) ?? null;
      if (sh !== null && sh > 0) {
        points.push({ shares: sh });
      }
    }
    if (points.length < 2) return null;
    const latest = points[points.length - 1]!.shares;
    const prev = points[points.length - 2]!.shares;
    if (prev === 0) return null;
    const yoy = (latest - prev) / prev;
    return Number.isFinite(yoy) ? yoy : null;
  } catch {
    return null;
  }
}

function computeRevenueCagr3YFromAnnualRows(
  rows: FundamentalsAnnualRow[]
): number | null {
  try {
    const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const revenues: number[] = [];
    for (const row of sorted) {
      const r = annualTotalRevenueFromRow(row as Record<string, unknown>);
      if (r !== null) {
        revenues.push(r);
      }
    }
    if (revenues.length < 4) return null;
    const oldest = revenues[revenues.length - 4]!;
    const latest = revenues[revenues.length - 1]!;
    if (oldest <= 0) return null;
    const cagr = Math.pow(latest / oldest, 1 / 3) - 1;
    return Number.isFinite(cagr) ? cagr : null;
  } catch {
    return null;
  }
}

/** Model D — 재고회전율 YoY: (최신연도 회전율 − 전년 회전율) ÷ 전년, annualCostOfRevenue 우선 */
function computeInventoryTurnoverYoYFromAnnualRows(
  rows: FundamentalsAnnualRow[]
): number | null {
  try {
    const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
    if (sorted.length < 3) return null;

    const r0 = sorted[sorted.length - 3]! as Record<string, unknown>;
    const r1 = sorted[sorted.length - 2]! as Record<string, unknown>;
    const r2 = sorted[sorted.length - 1]! as Record<string, unknown>;

    const inv0 =
      toNumber(r0.annualInventory) ?? toNumber(r0.inventory);
    const inv1 =
      toNumber(r1.annualInventory) ?? toNumber(r1.inventory);
    const inv2 =
      toNumber(r2.annualInventory) ?? toNumber(r2.inventory);
    if (inv0 === null || inv1 === null || inv2 === null) return null;
    if (inv0 < 0 || inv1 < 0 || inv2 < 0) return null;

    const cost1 =
      toNumber(r1.annualCostOfRevenue) ??
      toNumber(r1.costOfRevenue) ??
      toNumber(r1.annualCostOfGoodsAndServicesSold) ??
      toNumber(r1.costOfGoodsAndServicesSold) ??
      null;
    const cost2 =
      toNumber(r2.annualCostOfRevenue) ??
      toNumber(r2.costOfRevenue) ??
      toNumber(r2.annualCostOfGoodsAndServicesSold) ??
      toNumber(r2.costOfGoodsAndServicesSold) ??
      null;
    if (cost1 === null || cost2 === null || cost1 <= 0 || cost2 <= 0) return null;

    const avgInv1 = (inv1 + inv0) / 2;
    const avgInv2 = (inv2 + inv1) / 2;
    if (avgInv1 <= 0 || avgInv2 <= 0) return null;

    const turnover1 = cost1 / avgInv1;
    const turnover2 = cost2 / avgInv2;
    if (!Number.isFinite(turnover1) || !Number.isFinite(turnover2) || turnover1 === 0) {
      return null;
    }
    const yoy = (turnover2 - turnover1) / turnover1;
    return Number.isFinite(yoy) ? yoy : null;
  } catch {
    return null;
  }
}

const EARNINGS_TREND_EXCLUDE_PERIODS = new Set(["0q", "-1q", "-2q", "-3q"]);

/** "0y", "-1y" 등 → 정렬용 연도 오프셋 (미래 +1y 등은 null) */
function parseEarningsTrendYearPeriod(period: string): number | null {
  const m = /^([+-]?\d+)y$/i.exec(period.trim());
  if (!m) return null;
  return Number.parseInt(m[1], 10);
}

type EarningsTrendRow = {
  period?: string;
  revenueEstimate?: { avg?: number | null };
};

/**
 * earningsTrend.trend: 분기 행 제외, 연간 추정(0y, -1y, …)으로 CAGR 또는 1년 성장률.
 * 미래 연도(+1y 등)는 제외.
 */
function computeRevenueCagr3YFromEarningsTrend(trend: EarningsTrendRow[]): number | null {
  try {
    const items: { order: number; rev: number }[] = [];
    for (const t of trend) {
      const p = t.period ?? "";
      if (EARNINGS_TREND_EXCLUDE_PERIODS.has(p)) continue;
      const order = parseEarningsTrendYearPeriod(p);
      if (order === null || order > 0) continue;
      const rev = toNumber(t.revenueEstimate?.avg);
      if (rev === null || rev <= 0) continue;
      items.push({ order, rev });
    }
    if (items.length === 0) return null;
    items.sort((a, b) => a.order - b.order);
    const revenues = items.map((x) => x.rev);

    if (revenues.length >= 4) {
      const oldest = revenues[revenues.length - 4]!;
      const latest = revenues[revenues.length - 1]!;
      if (oldest <= 0) return null;
      const cagr = Math.pow(latest / oldest, 1 / 3) - 1;
      return Number.isFinite(cagr) ? cagr : null;
    }
    if (revenues.length === 2) {
      const [oldest, latest] = revenues;
      if (oldest <= 0) return null;
      return latest / oldest - 1;
    }
    if (revenues.length === 3) {
      const oldest = revenues[0]!;
      const latest = revenues[2]!;
      if (oldest <= 0) return null;
      const cagr = Math.pow(latest / oldest, 1 / 2) - 1;
      return Number.isFinite(cagr) ? cagr : null;
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 1b. FMP 보완 (선택)
// ─────────────────────────────────────────────

function parseFmpForwardRevenueGrowthFromEstimates(
  estimatesRaw: unknown,
  currentYear: number
): number | null {
  try {
    if (!Array.isArray(estimatesRaw)) return null;
    type EstRevRow = {
      date: string;
      estimatedRevenueAvg?: number;
      revenueAvg?: number;
    };
    const byYear = new Map<number, number>();
    for (const r of estimatesRaw as EstRevRow[]) {
      if (!r || typeof r.date !== "string") continue;
      const raw = r.estimatedRevenueAvg ?? r.revenueAvg;
      const rev = typeof raw === "number" ? raw : raw != null ? Number(raw) : NaN;
      if (!Number.isFinite(rev) || rev <= 0) continue;
      const y = new Date(r.date).getFullYear();
      byYear.set(y, rev);
    }
    const currentRev = byYear.get(currentYear);
    const futureYears = [...byYear.keys()]
      .filter((y) => y > currentYear)
      .sort((a, b) => a - b);
    if (currentRev === undefined || futureYears.length === 0) return null;
    const nextRev = byYear.get(futureYears[0]!);
    if (nextRev === undefined || currentRev <= 0) return null;
    const g = (nextRev - currentRev) / currentRev;
    return Number.isFinite(g) ? g : null;
  } catch {
    return null;
  }
}

function computeQuarterlyRevenueYoYStats(incomeRaw: unknown): {
  revenueGrowthStdDev: number | null;
  quarterlyRevenueGrowthRates: number[] | null;
} {
  try {
    if (!Array.isArray(incomeRaw)) {
      return { revenueGrowthStdDev: null, quarterlyRevenueGrowthRates: null };
    }
    type QRow = { date: string; revenue: number };
    const sorted = (incomeRaw as QRow[])
      .filter((r) => r && typeof r.date === "string")
      .map((r) => ({
        date: r.date,
        revenue: typeof r.revenue === "number" ? r.revenue : Number(r.revenue),
      }))
      .filter((r) => Number.isFinite(r.revenue))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const n = sorted.length;
    if (n < 5) {
      return { revenueGrowthStdDev: null, quarterlyRevenueGrowthRates: null };
    }
    const maxI = n >= 12 ? 11 : n - 1;
    const yoyRates: number[] = [];
    for (let i = 4; i <= maxI; i++) {
      const cur = sorted[i]!.revenue;
      const prev = sorted[i - 4]!.revenue;
      if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) continue;
      yoyRates.push((cur - prev) / prev);
    }
    if (yoyRates.length < 4) {
      return { revenueGrowthStdDev: null, quarterlyRevenueGrowthRates: null };
    }
    const mean = yoyRates.reduce((a, b) => a + b, 0) / yoyRates.length;
    const variance = yoyRates.reduce((s, x) => s + (x - mean) ** 2, 0) / yoyRates.length;
    const sd = Math.sqrt(variance);
    const revenueGrowthStdDev = Number.isFinite(sd) ? sd * 100 : null;
    return {
      revenueGrowthStdDev,
      quarterlyRevenueGrowthRates: yoyRates,
    };
  } catch {
    return { revenueGrowthStdDev: null, quarterlyRevenueGrowthRates: null };
  }
}

export interface FmpDataResult {
  fmpForwardEpsCAGR3Y: number | null;
  fmpEpsCagrYears: number | null;
  fmpRevenueCAGR3Y: number | null;
  fmpHistoricalEps: Array<{ year: number; eps: number }> | null;
  fmpForwardRevenueGrowth: number | null;
  revenueGrowthStdDev: number | null;
  quarterlyRevenueGrowthRates: number[] | null;
  fmpFreeCashflow: number | null;
  fmpCapex: number | null;
  /** 분기 현금흐름표 최근 4분기 operatingCashFlow 합 (TTM) */
  fmpOperatingCashflowTtm: number | null;
  quarterlyBurnRate: number | null;
}

/**
 * Yahoo trailing EPS를 기준으로 FMP 컨센서스 EPS·매출 CAGR을 산출합니다.
 * FMP_API_KEY가 없거나 요청 실패 시 null.
 */
export async function fetchFmpData(
  ticker: string,
  trailingEps: number | null
): Promise<FmpDataResult | null> {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const sym = encodeURIComponent(ticker.toUpperCase().trim());
    /** FMP는 2025년 하반기부터 v3 레거시 URL을 신규 키에서 403 처리 — stable API 사용 */
    const base = "https://financialmodelingprep.com/stable";
    const keyQ = `apikey=${encodeURIComponent(apiKey)}`;
    const [estRes, incRes, cfsRes] = await Promise.all([
      fetch(`${base}/analyst-estimates?symbol=${sym}&period=annual&limit=10&${keyQ}`, {
        next: { revalidate: 3600 },
      }),
      fetch(`${base}/income-statement?symbol=${sym}&period=annual&limit=4&${keyQ}`, {
        next: { revalidate: 3600 },
      }),
      fetch(`${base}/cash-flow-statement?symbol=${sym}&period=quarter&limit=4&${keyQ}`, {
        next: { revalidate: 3600 },
      }),
    ]);

    /** 추정·연간 손익 실패 시에도 cash-flow-statement(FFO·FCF 등)는 파싱 */
    const estimatesJson = estRes.ok ? ((await estRes.json()) as unknown) : [];
    const incomeJson = incRes.ok ? ((await incRes.json()) as unknown) : [];
    const estimatesRaw = Array.isArray(estimatesJson) ? estimatesJson : [];
    const incomeRaw = Array.isArray(incomeJson) ? incomeJson : [];

    const currentYear = new Date().getFullYear();

    /** stable: epsAvg / v3 호환: estimatedEpsAvg */
    type EstRow = {
      date: string;
      epsAvg?: number;
      estimatedEpsAvg?: number;
    };
    const estimates = (estimatesRaw as EstRow[])
      .filter((r) => r && typeof r.date === "string")
      .map((r) => {
        const raw = r.epsAvg ?? r.estimatedEpsAvg;
        const estimatedEpsAvg =
          typeof raw === "number" ? raw : raw != null ? Number(raw) : NaN;
        return { date: r.date, estimatedEpsAvg };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const futureEst = estimates.filter(
      (item) => new Date(item.date).getFullYear() >= currentYear
    );

    let fmpEps1Y: number | undefined;
    let fmpEps2Y: number | undefined;
    let fmpEps3Y: number | undefined;
    if (futureEst.length > 0) {
      const e0 = futureEst[0];
      if (e0 && Number.isFinite(e0.estimatedEpsAvg)) fmpEps1Y = e0.estimatedEpsAvg;
    }
    if (futureEst.length > 1) {
      const e1 = futureEst[1];
      if (e1 && Number.isFinite(e1.estimatedEpsAvg)) fmpEps2Y = e1.estimatedEpsAvg;
    }
    if (futureEst.length > 2) {
      const e2 = futureEst[2];
      if (e2 && Number.isFinite(e2.estimatedEpsAvg)) fmpEps3Y = e2.estimatedEpsAvg;
    }

    let fmpForwardEpsCAGR3Y: number | null = null;
    let fmpEpsCagrYears: number | null = null;
    const te = trailingEps;
    if (te != null && te > 0) {
      if (fmpEps3Y != null && Number.isFinite(fmpEps3Y)) {
        fmpForwardEpsCAGR3Y = Math.pow(fmpEps3Y / te, 1 / 3) - 1;
        fmpEpsCagrYears = 3;
      } else if (fmpEps2Y != null && Number.isFinite(fmpEps2Y)) {
        fmpForwardEpsCAGR3Y = Math.pow(fmpEps2Y / te, 1 / 2) - 1;
        fmpEpsCagrYears = 2;
      } else if (fmpEps1Y != null && Number.isFinite(fmpEps1Y)) {
        fmpForwardEpsCAGR3Y = fmpEps1Y / te - 1;
        fmpEpsCagrYears = 1;
      }
    }
    if (fmpForwardEpsCAGR3Y != null && !Number.isFinite(fmpForwardEpsCAGR3Y)) {
      fmpForwardEpsCAGR3Y = null;
      fmpEpsCagrYears = null;
    }

    /** stable: epsDiluted / v3: epsdiluted */
    type IncRow = {
      date: string;
      revenue: number;
      operatingIncome: number;
      netIncome: number;
      epsdiluted?: number;
      epsDiluted?: number;
    };
    const income = (incomeRaw as IncRow[])
      .filter((r) => r && typeof r.date === "string")
      .map((r) => {
        const dil = r.epsDiluted ?? r.epsdiluted;
        return {
          date: r.date,
          revenue: typeof r.revenue === "number" ? r.revenue : Number(r.revenue),
          operatingIncome:
            typeof r.operatingIncome === "number" ? r.operatingIncome : Number(r.operatingIncome),
          netIncome: typeof r.netIncome === "number" ? r.netIncome : Number(r.netIncome),
          epsdiluted: typeof dil === "number" ? dil : Number(dil),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let fmpRevenueCAGR3Y: number | null = null;
    if (income.length >= 4) {
      const oldest = income[0]!.revenue;
      const latest = income[3]!.revenue;
      if (typeof oldest === "number" && typeof latest === "number" && oldest > 0 && latest > 0) {
        const cagr = Math.pow(latest / oldest, 1 / 3) - 1;
        fmpRevenueCAGR3Y = Number.isFinite(cagr) ? cagr : null;
      }
    }

    const fmpHistoricalEps: Array<{ year: number; eps: number }> = income
      .slice(-4)
      .map((row) => ({
        year: new Date(row.date).getFullYear(),
        eps: row.epsdiluted,
      }))
      .filter((x) => Number.isFinite(x.year) && Number.isFinite(x.eps));

    let fmpForwardRevenueGrowth: number | null = null;
    try {
      fmpForwardRevenueGrowth = parseFmpForwardRevenueGrowthFromEstimates(
        estimatesRaw,
        currentYear
      );
    } catch {
      fmpForwardRevenueGrowth = null;
    }

    let fmpFreeCashflow: number | null = null;
    let fmpCapex: number | null = null;
    let fmpOperatingCashflowTtm: number | null = null;
    let quarterlyBurnRate: number | null = null;
    if (cfsRes.ok) {
      try {
        const cfsRaw = (await cfsRes.json()) as unknown;
        if (Array.isArray(cfsRaw) && cfsRaw.length > 0) {
          type CfsRow = {
            date: string;
            capitalExpenditure?: number;
            freeCashFlow?: number;
            operatingCashFlow?: number;
          };
          const rows = (cfsRaw as CfsRow[])
            .filter((r) => r && typeof r.date === "string")
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const latest = rows[0];
          if (latest) {
            const capexRaw = toNumber(latest.capitalExpenditure);
            fmpCapex = capexRaw != null ? Math.abs(capexRaw) : null;
          }
          const ttmRows = rows.slice(0, 4);
          let ttmOcfSum = 0;
          let ocfQuarterCount = 0;
          for (const row of ttmRows) {
            const ocf = toNumber(row.operatingCashFlow);
            if (ocf != null) {
              ttmOcfSum += ocf;
              ocfQuarterCount++;
            }
          }
          if (ocfQuarterCount === 4) {
            fmpOperatingCashflowTtm = Number.isFinite(ttmOcfSum) ? ttmOcfSum : null;
          }
          let ttmFcf = 0;
          let n = 0;
          for (const row of ttmRows) {
            const ocf = toNumber(row.operatingCashFlow);
            const capexRaw = toNumber(row.capitalExpenditure);
            if (ocf != null && capexRaw != null) {
              ttmFcf += ocf - Math.abs(capexRaw);
              n++;
            } else {
              const fcf = toNumber(row.freeCashFlow);
              if (fcf != null) {
                ttmFcf += fcf;
                n++;
              }
            }
          }
          if (n > 0) fmpFreeCashflow = ttmFcf;

          const ocfSeries = rows
            .map((r) => toNumber(r.operatingCashFlow))
            .filter((ocf): ocf is number => ocf !== null);
          const negative = ocfSeries.filter((ocf) => ocf < 0);
          if (negative.length > 0) {
            const sum = negative.reduce((a, ocf) => a + ocf, 0);
            const avg = sum / negative.length;
            const absBurn = Math.abs(avg);
            quarterlyBurnRate =
              Number.isFinite(absBurn) && absBurn > 0 ? absBurn : null;
          }
        }
      } catch {
        fmpFreeCashflow = null;
        fmpCapex = null;
        fmpOperatingCashflowTtm = null;
        quarterlyBurnRate = null;
      }
    }

    let revenueGrowthStdDev: number | null = null;
    let quarterlyRevenueGrowthRates: number[] | null = null;
    try {
      const qRes = await fetch(
        `${base}/income-statement?symbol=${sym}&period=quarterly&limit=12&${keyQ}`,
        { next: { revalidate: 3600 } }
      );
      if (qRes.ok) {
        const qRaw = (await qRes.json()) as unknown;
        const qStats = computeQuarterlyRevenueYoYStats(qRaw);
        revenueGrowthStdDev = qStats.revenueGrowthStdDev;
        quarterlyRevenueGrowthRates = qStats.quarterlyRevenueGrowthRates;
      }
    } catch {
      revenueGrowthStdDev = null;
      quarterlyRevenueGrowthRates = null;
    }

    return {
      fmpForwardEpsCAGR3Y,
      fmpEpsCagrYears,
      fmpRevenueCAGR3Y,
      fmpHistoricalEps: fmpHistoricalEps.length > 0 ? fmpHistoricalEps : null,
      fmpForwardRevenueGrowth,
      revenueGrowthStdDev,
      quarterlyRevenueGrowthRates,
      fmpFreeCashflow,
      fmpCapex,
      fmpOperatingCashflowTtm,
      quarterlyBurnRate,
    };
  } catch {
    return null;
  }
}

export async function fetchFinancialData(ticker: string): Promise<FinancialData> {
  const upperTicker = ticker.toUpperCase().trim();

  try {
    const yf = new yahooFinance();
    const [quoteSummary, historical, historical5y, fundamentalsRaw, dividendHistory] = await Promise.all([
      yf.quoteSummary(upperTicker, {
        modules: [
          "summaryDetail",
          "summaryProfile",
          "financialData",
          "defaultKeyStatistics",
          "earningsHistory",
          "earningsTrend",
          "price",
        ],
      }),
      yf.historical(upperTicker, {
        period1: getDateNDaysAgo(90),
        period2: new Date(),
        interval: "1d",
      }),
      yf.historical(upperTicker, {
        period1: getDateNDaysAgo(1825),
        period2: new Date(),
        interval: "1d",
      }),
      // quoteSummary 재무 히스토리 모듈 대체 — type은 quarterly|annual|trailing, 필드는 module로 선택됨
      yf.fundamentalsTimeSeries(upperTicker, {
        period1: getDateNDaysAgo(365 * 12),
        type: "annual",
        module: "all",
      }),
      yf.historical(upperTicker, {
        period1: getDateNDaysAgo(365 * 12),
        period2: new Date(),
        events: "dividends",
      }),
    ]);

    const price        = quoteSummary.price;
    const summary      = quoteSummary.summaryDetail;
    const profile      = quoteSummary.summaryProfile;
    const yfFinancial = quoteSummary.financialData;
    const keyStats     = quoteSummary.defaultKeyStatistics;

    // 분기 실적 — earningsHistory 우선, 없으면 earningsTrend로 fallback
    const rawHistory = quoteSummary.earningsHistory?.history ?? [];
    const processedEarnings = rawHistory.slice(0, 4).map((h) => ({
      period:          h.period          ?? "",
      revenue:         null,
      earnings:        null,
      epsActual:       h.epsActual       ?? null,
      epsEstimate:     h.epsEstimate     ?? null,
      epsDiff:         h.epsDifference   ?? null,
      surprisePercent: h.surprisePercent ?? null,
    }));

    const trendFallback = (quoteSummary.earningsTrend?.trend ?? [])
      .slice(0, 4)
      .map((t) => ({
        period:          t.period                  ?? "",
        revenue:         t.revenueEstimate?.avg    ?? null,
        earnings:        t.earningsEstimate?.avg   ?? null,
        epsActual:       null,
        epsEstimate:     t.earningsEstimate?.avg   ?? null,
        epsDiff:         null,
        surprisePercent: null,
      }));

    const priceHistory = historical.map((h) => ({
      date:   h.date.toISOString().split("T")[0],
      open:   h.open   ?? 0,
      high:   h.high   ?? 0,
      low:    h.low    ?? 0,
      close:  h.close  ?? 0,
      volume: h.volume ?? 0,
    }));

    const fundamentalsAnnual: FundamentalsAnnualRow[] = (
      fundamentalsRaw as unknown as Array<Record<string, unknown>>
    )
      .map(
        (row): FundamentalsAnnualRow => ({
          ...row,
          date: normalizeFundamentalsDate(row.date),
        })
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const latestF = fundamentalsAnnual[0];
    const prevF = fundamentalsAnnual[1];

    const revenueGrowthTtm = yfFinancial?.revenueGrowth ?? null;
    let revenueCAGR3Y: number | null = computeRevenueCagr3YFromAnnualRows(
      fundamentalsAnnual
    );
    if (revenueCAGR3Y == null) {
      revenueCAGR3Y = computeRevenueCagr3YFromEarningsTrend(
        quoteSummary.earningsTrend?.trend ?? []
      );
    }
    if (revenueCAGR3Y == null && revenueGrowthTtm != null) {
      revenueCAGR3Y = revenueGrowthTtm;
    }

    let roic: number | null = null;
    try {
      if (latestF) {
        const ebit = ebitFromFundamentalsRow(latestF);
        const totalAssets = toNumber(latestF.totalAssets);
        const currentLiabilities = toNumber(latestF.currentLiabilities);
        const taxExpense = toNumber(latestF.taxProvision);
        const interestExp = toNumber(latestF.interestExpense);
        if (ebit !== null && totalAssets !== null && currentLiabilities !== null) {
          const investedCapital = totalAssets - currentLiabilities;
          if (investedCapital > 0) {
            let taxRate = DEFAULT_TAX_RATE;
            if (
              taxExpense !== null &&
              interestExp !== null &&
              ebit - interestExp !== 0
            ) {
              const computed = taxExpense / (ebit - interestExp);
              if (Number.isFinite(computed) && computed >= 0 && computed <= 0.6) {
                taxRate = computed;
              }
            }
            roic = (ebit * (1 - taxRate)) / investedCapital;
          }
        }
      }
    } catch {
      roic = null;
    }

    let operatingIncome: number | null = null;
    let operatingIncomeGrowth: number | null = null;
    let operatingLeverage: number | null = null;
    try {
      if (latestF) {
        operatingIncome = toNumber(latestF.operatingIncome);
        if (prevF) {
          const oiPrev = toNumber(prevF.operatingIncome);
          if (operatingIncome !== null && oiPrev !== null && oiPrev !== 0) {
            operatingIncomeGrowth = operatingIncome / oiPrev - 1;
          }
        }
        const revGrowth = yfFinancial?.revenueGrowth ?? null;
        if (
          operatingIncomeGrowth !== null &&
          revGrowth !== null &&
          revGrowth !== 0
        ) {
          operatingLeverage = operatingIncomeGrowth / revGrowth;
        }
      }
    } catch {
      operatingIncome = null;
      operatingIncomeGrowth = null;
      operatingLeverage = null;
    }

    let ebit: number | null = null;
    let interestExpense: number | null = null;
    let interestCoverage: number | null = null;
    try {
      if (latestF) {
        ebit = ebitFromFundamentalsRow(latestF);
        const rawInt = toNumber(latestF.interestExpense);
        if (rawInt !== null) {
          interestExpense = Math.abs(rawInt);
        }
        if (ebit !== null && interestExpense !== null && interestExpense !== 0) {
          interestCoverage = ebit / interestExpense;
        }
      }
    } catch {
      ebit = null;
      interestExpense = null;
      interestCoverage = null;
    }

    let dividendGrowthYears: number | null = null;
    try {
      dividendGrowthYears = computeDividendGrowthYearsFromDividendHistory(dividendHistory);
    } catch {
      dividendGrowthYears = 0;
    }

    let shareRepurchase: number | null = null;
    try {
      const lf = latestF as Record<string, unknown> | undefined;
      shareRepurchase = firstAbsNumberFromKeys(lf, [
        "annualRepurchaseOfCapitalStock",
        "annualCommonStockRepurchased",
        "annualPurchaseOfBusiness",
        "repurchaseOfCapitalStock",
        "purchaseOfBusiness",
      ]);
      if (shareRepurchase === null) {
        try {
          const cfQ = await yf.quoteSummary(upperTicker, {
            modules: ["cashflowStatementHistory"],
          });
          const stmts = [...(cfQ.cashflowStatementHistory?.cashflowStatements ?? [])].sort(
            (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          );
          const latestStmt = stmts[0] as unknown as Record<string, unknown> | undefined;
          shareRepurchase = firstAbsNumberFromKeys(latestStmt, [
            "repurchaseOfStock",
            "repurchaseOfCapitalStock",
          ]);
        } catch {
          /* 3순위: null 유지 */
        }
      }
    } catch {
      shareRepurchase = null;
    }

    const trailingEps = keyStats?.trailingEps ?? null;
    const trend = quoteSummary.earningsTrend?.trend ?? [];
    const trendPlus1y = trend.find((t) => t.period === "+1y");
    const trendPlus2y = trend.find((t) => t.period === "+2y");
    const epsEstimateNextYear = trendPlus1y
      ? earningsEstimateAvgOrCurrent(trendPlus1y)
      : null;
    const epsEstimateTwoYear = trendPlus2y
      ? earningsEstimateAvgOrCurrent(trendPlus2y)
      : null;

    let forwardRevenueGrowth: number | null = null;
    try {
      forwardRevenueGrowth = trendPlus1y?.revenueEstimate?.growth ?? null;
    } catch {
      forwardRevenueGrowth = null;
    }

    let forwardEpsCAGR: number | null = null;
    let forwardEpsCagrIsOneYear = false;
    try {
      const fwd = computeForwardEpsCagr(
        trailingEps,
        epsEstimateTwoYear,
        epsEstimateNextYear
      );
      forwardEpsCAGR = fwd.cagr;
      forwardEpsCagrIsOneYear = fwd.isOneYear;
    } catch {
      forwardEpsCAGR = null;
      forwardEpsCagrIsOneYear = false;
    }

    let fiveYearAvgPE: number | null = null;
    try {
      fiveYearAvgPE = computeFiveYearAvgPE(historical5y, fundamentalsAnnual);
    } catch {
      fiveYearAvgPE = null;
    }

    let peRatioVs5YearAvg: number | null = null;
    try {
      const trailingPE = summary?.trailingPE ?? null;
      if (trailingPE != null && fiveYearAvgPE != null && fiveYearAvgPE > 0) {
        peRatioVs5YearAvg = (trailingPE - fiveYearAvgPE) / fiveYearAvgPE;
      }
    } catch {
      peRatioVs5YearAvg = null;
    }

    let stockBasedCompensation: number | null = null;
    let netDilutionRate: number | null = null;
    let netDilutionDetail: string | null = null;
    try {
      if (latestF) {
        const lf = latestF as Record<string, unknown>;
        stockBasedCompensation =
          toNumber(lf.annualStockBasedCompensation) ?? toNumber(lf.stockBasedCompensation);
      }
      if (stockBasedCompensation === null) {
        try {
          const cfQ = await yf.quoteSummary(upperTicker, {
            modules: ["cashflowStatementHistory"],
          });
          const stmts = [...(cfQ.cashflowStatementHistory?.cashflowStatements ?? [])].sort(
            (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          );
          const latestStmt = stmts[0] as unknown as Record<string, unknown> | undefined;
          if (latestStmt) {
            stockBasedCompensation = toNumber(latestStmt.stockBasedCompensation);
          }
        } catch {
          /* fallback 실패 시 fundamentals 값 유지 */
        }
      }
      const marketCapValue =
        price?.marketCap ??
        quoteSummary.summaryDetail?.marketCap ??
        null;
      const cap = toNumber(marketCapValue);
      if (
        shareRepurchase !== null &&
        stockBasedCompensation !== null &&
        cap !== null &&
        cap > 0
      ) {
        netDilutionRate = (shareRepurchase - stockBasedCompensation) / cap;
        const netFlow = shareRepurchase - stockBasedCompensation;
        netDilutionDetail = `자사주 ${formatUsdDilutionLabel(shareRepurchase)} - SBC ${formatUsdDilutionLabel(stockBasedCompensation)} = 순환원/희석 ${formatUsdDilutionLabel(netFlow)} (시총 대비 ${Math.round(netDilutionRate * 100)}%)`;
      }
    } catch {
      stockBasedCompensation = null;
      netDilutionRate = null;
      netDilutionDetail = null;
    }

    const peersMedian = await fetchPeersMedian(yf, upperTicker);

    let revenueAbsoluteModelC: number | null = null;
    try {
      const ev = keyStats?.enterpriseValue ?? null;
      const evr = keyStats?.enterpriseToRevenue ?? null;
      const en = toNumber(ev);
      const evrn = toNumber(evr);
      if (en !== null && evrn !== null && evrn !== 0) {
        revenueAbsoluteModelC = en / evrn;
      }
    } catch {
      revenueAbsoluteModelC = null;
    }

    let sharesOutstandingYoY: number | null = null;
    try {
      sharesOutstandingYoY = computeSharesOutstandingYoYFromAnnualRows(fundamentalsAnnual);
    } catch {
      sharesOutstandingYoY = null;
    }

    let isPreRevenueModelC = false;
    try {
      const rg = revenueGrowthTtm;
      const evr = keyStats?.enterpriseToRevenue ?? null;
      const evrN = toNumber(evr);
      if (rg === null && evrN === null) {
        isPreRevenueModelC = true;
      } else if (revenueAbsoluteModelC !== null && revenueAbsoluteModelC < 100_000_000) {
        isPreRevenueModelC = true;
      } else {
        isPreRevenueModelC = false;
      }
    } catch {
      isPreRevenueModelC = false;
    }

    let marketCapToBookRatioModelC: number | null = null;
    try {
      marketCapToBookRatioModelC = keyStats?.priceToBook ?? null;
    } catch {
      marketCapToBookRatioModelC = null;
    }

    let inventoryTurnoverYoYModelD: number | null = null;
    try {
      inventoryTurnoverYoYModelD =
        computeInventoryTurnoverYoYFromAnnualRows(fundamentalsAnnual);
    } catch {
      inventoryTurnoverYoYModelD = null;
    }

    const financial: FinancialData = {
      ticker:       upperTicker,
      companyName:  price?.longName ?? price?.shortName ?? upperTicker,
      sector:       profile?.sector              ?? null,
      industry:     profile?.industry            ?? null,
      country:      profile?.country             ?? null,
      currency:     price?.currency              ?? null,
      exchangeName: price?.exchangeName          ?? null,
      website:      profile?.website             ?? null,
      description:  profile?.longBusinessSummary ?? null,
      employees:    profile?.fullTimeEmployees   ?? null,

      currentPrice:    price?.regularMarketPrice         ?? null,
      previousClose:   price?.regularMarketPreviousClose ?? null,
      open:            price?.regularMarketOpen          ?? null,
      dayLow:          price?.regularMarketDayLow        ?? null,
      dayHigh:         price?.regularMarketDayHigh       ?? null,
      fiftyTwoWeekLow: summary?.fiftyTwoWeekLow          ?? null,
      fiftyTwoWeekHigh:summary?.fiftyTwoWeekHigh         ?? null,
      volume:          price?.regularMarketVolume        ?? null,
      averageVolume:   summary?.averageVolume            ?? null,
      marketCap:       price?.marketCap                  ?? null,

      trailingPE:      summary?.trailingPE                       ?? null,
      forwardPE:       summary?.forwardPE                        ?? null,
      priceToBook:     keyStats?.priceToBook                     ?? null,
      priceToSales:
        typeof keyStats?.priceToSalesTrailing12Months === "number"
          ? keyStats.priceToSalesTrailing12Months
          : null,
      enterpriseValue: keyStats?.enterpriseValue                 ?? null,
      evToRevenue:     keyStats?.enterpriseToRevenue             ?? null,
      evToEbitda:      keyStats?.enterpriseToEbitda              ?? null,

      revenueGrowth:    revenueGrowthTtm,
      revenueCAGR3Y,
      earningsGrowth:   yfFinancial?.earningsGrowth   ?? null,
      grossMargins:     yfFinancial?.grossMargins      ?? null,
      operatingMargins: yfFinancial?.operatingMargins  ?? null,
      profitMargins:    yfFinancial?.profitMargins     ?? null,
      returnOnAssets:   yfFinancial?.returnOnAssets    ?? null,
      returnOnEquity:   yfFinancial?.returnOnEquity    ?? null,

      totalCash:        yfFinancial?.totalCash        ?? null,
      totalDebt:        yfFinancial?.totalDebt        ?? null,
      debtToEquity:     yfFinancial?.debtToEquity     ?? null,
      currentRatio:     yfFinancial?.currentRatio     ?? null,
      quickRatio:       yfFinancial?.quickRatio       ?? null,
      freeCashflow:     yfFinancial?.freeCashflow     ?? null,
      operatingCashflow: yfFinancial?.operatingCashflow ?? null,

      dividendRate:  summary?.dividendRate  ?? null,
      dividendYield: summary?.dividendYield ?? null,
      payoutRatio:   summary?.payoutRatio   ?? null,

      targetHighPrice:          yfFinancial?.targetHighPrice          ?? null,
      targetLowPrice:           yfFinancial?.targetLowPrice           ?? null,
      targetMeanPrice:          yfFinancial?.targetMeanPrice          ?? null,
      recommendationMean:       yfFinancial?.recommendationMean       ?? null,
      recommendationKey:        yfFinancial?.recommendationKey        ?? null,
      numberOfAnalystOpinions:  yfFinancial?.numberOfAnalystOpinions  ?? null,

      priceHistory,
      earningsHistory: processedEarnings.length > 0 ? processedEarnings : trendFallback,

      roic,
      operatingIncome,
      operatingIncomeGrowth,
      operatingLeverage,
      ebit,
      interestExpense,
      interestCoverage,
      dividendGrowthYears,
      shareRepurchase,
      trailingEps,
      epsEstimateNextYear,
      forwardEpsCAGR,
      forwardEpsCagrIsOneYear,
      fiveYearAvgPE,
      peRatioVs5YearAvg,

      fmpForwardEpsCAGR3Y: null,
      fmpEpsCagrYears: null,
      fmpRevenueCAGR3Y: null,
      fmpHistoricalEps: null,
      fmpFreeCashflow: null,
      fmpCapex: null,

      stockBasedCompensation,
      netDilutionRate,
      netDilutionDetail,
      peersMedian,

      ruleOf40: null,
      sbcToRevenue: null,
      cashRunwayYears: null,
      isCashRunwayInfinite: false,
      evToGrossProfit: null,
      evToSalesGrowthRatio: null,
      revenueGrowthStdDev: null,
      fmpForwardRevenueGrowth: null,
      quarterlyRevenueGrowthRates: null,

      quarterlyBurnRate: null,
      cashRunwayQuarters: null,
      sharesOutstandingYoY,
      isPreRevenue: isPreRevenueModelC,
      revenueAbsolute: revenueAbsoluteModelC,
      marketCapToBookRatio: marketCapToBookRatioModelC,

      inventoryTurnoverYoY: inventoryTurnoverYoYModelD,
      dividendCoverageRatio: null,

      beta: keyStats?.beta ?? null,
      justifiedPB: null,
      costOfEquity: null,
      netInterestMarginProxy: null,

      ffoPerShare: null,
      ffoCalculationMethod: null,
      ffoPayoutRatio: null,
      ffoGrowthRate: null,
      longTermDebtRatio: null,
      dividendToTreasurySpread: null,
      priceToFfo: null,
    };

    const fmpData = await fetchFmpData(upperTicker, trailingEps).catch(() => null);
    if (fmpData) {
      if (fmpData.fmpRevenueCAGR3Y !== null) {
        financial.revenueCAGR3Y = fmpData.fmpRevenueCAGR3Y;
      }
      if (fmpData.fmpForwardEpsCAGR3Y !== null) {
        financial.forwardEpsCAGR = fmpData.fmpForwardEpsCAGR3Y;
        financial.forwardEpsCagrIsOneYear = fmpData.fmpEpsCagrYears === 1;
      }
      financial.fmpForwardEpsCAGR3Y = fmpData.fmpForwardEpsCAGR3Y;
      financial.fmpEpsCagrYears = fmpData.fmpEpsCagrYears;
      financial.fmpRevenueCAGR3Y = fmpData.fmpRevenueCAGR3Y;
      financial.fmpHistoricalEps = fmpData.fmpHistoricalEps;
      financial.fmpForwardRevenueGrowth = fmpData.fmpForwardRevenueGrowth;
      financial.revenueGrowthStdDev = fmpData.revenueGrowthStdDev;
      financial.quarterlyRevenueGrowthRates = fmpData.quarterlyRevenueGrowthRates;
      if (fmpData.fmpFreeCashflow != null) {
        financial.freeCashflow = fmpData.fmpFreeCashflow;
        financial.fmpFreeCashflow = fmpData.fmpFreeCashflow;
      }
      if (fmpData.fmpCapex != null) {
        financial.fmpCapex = fmpData.fmpCapex;
      }
      financial.quarterlyBurnRate = fmpData.quarterlyBurnRate;
      try {
        if (
          financial.quarterlyBurnRate != null &&
          financial.quarterlyBurnRate > 0 &&
          financial.totalCash != null &&
          financial.totalCash > 0
        ) {
          financial.cashRunwayQuarters = financial.totalCash / financial.quarterlyBurnRate;
        }
      } catch {
        /* Model C cashRunwayQuarters */
      }
    }

    try {
      const gm = financial.grossMargins;
      const om = financial.operatingMargins;
      if (gm != null && om != null && om !== 1) {
        const nim = (gm - om) / (1 - om);
        financial.netInterestMarginProxy = Number.isFinite(nim) ? nim : null;
      }
    } catch {
      /* Model E netInterestMarginProxy */
    }

    try {
      const rg = financial.revenueGrowth;
      const ev = financial.enterpriseValue;
      const evr = financial.evToRevenue;
      const fcf = financial.freeCashflow;
      if (
        rg != null &&
        ev != null &&
        evr != null &&
        fcf != null &&
        evr !== 0
      ) {
        const revenue = ev / evr;
        if (revenue > 0) {
          const fcfMargin = fcf / revenue;
          financial.ruleOf40 = rg * 100 + fcfMargin * 100;
        }
      }
    } catch {
      /* Model B ruleOf40 */
    }

    try {
      const ev = financial.enterpriseValue;
      const evr = financial.evToRevenue;
      const sbc = financial.stockBasedCompensation;
      if (ev != null && evr != null && sbc != null && evr !== 0) {
        const revenue = ev / evr;
        if (revenue > 0) {
          financial.sbcToRevenue = sbc / revenue;
        }
      }
    } catch {
      /* Model B sbcToRevenue */
    }

    try {
      const fcf = financial.freeCashflow;
      const cash = financial.totalCash;
      if (fcf === null) {
        financial.cashRunwayYears = null;
        financial.isCashRunwayInfinite = false;
      } else if (fcf > 0) {
        financial.isCashRunwayInfinite = true;
        financial.cashRunwayYears = null;
      } else if (fcf < 0) {
        financial.isCashRunwayInfinite = false;
        if (cash != null && cash > 0) {
          financial.cashRunwayYears = cash / Math.abs(fcf);
        } else {
          financial.cashRunwayYears = null;
        }
      } else {
        financial.isCashRunwayInfinite = true;
        financial.cashRunwayYears = null;
      }
    } catch {
      /* Model B cash runway */
    }

    try {
      const ev = financial.enterpriseValue;
      const evr = financial.evToRevenue;
      const gm = financial.grossMargins;
      if (ev != null && evr != null && gm != null && evr !== 0) {
        const revenue = ev / evr;
        const grossProfit = revenue * gm;
        if (grossProfit > 0) {
          financial.evToGrossProfit = ev / grossProfit;
        }
      }
    } catch {
      /* Model B evToGrossProfit */
    }

    try {
      const evr = financial.evToRevenue;
      const g =
        financial.fmpForwardRevenueGrowth ??
        forwardRevenueGrowth ??
        financial.revenueGrowth;
      if (evr != null && g != null && g > 0) {
        financial.evToSalesGrowthRatio = evr / (g * 100);
      }
    } catch {
      /* Model B evToSalesGrowthRatio */
    }

    try {
      const dr = toNumber(summary?.dividendRate ?? null);
      const fcf = financial.freeCashflow;
      const cap = toNumber(financial.marketCap);
      const cp = toNumber(financial.currentPrice);
      if (
        dr === null ||
        dr === 0 ||
        fcf === null ||
        cap === null ||
        cp === null ||
        cp <= 0
      ) {
        financial.dividendCoverageRatio = null;
      } else {
        const sharesOutstanding = cap / cp;
        const totalDividendPaid = dr * sharesOutstanding;
        if (totalDividendPaid <= 0) {
          financial.dividendCoverageRatio = null;
        } else {
          const ratio = fcf / totalDividendPaid;
          financial.dividendCoverageRatio = Number.isFinite(ratio) ? ratio : null;
        }
      }
    } catch {
      financial.dividendCoverageRatio = null;
    }

    try {
      const cap = toNumber(financial.marketCap);
      const cp = toNumber(financial.currentPrice);
      if (cap === null || cp === null || cp <= 0) {
        financial.ffoPerShare = null;
        financial.ffoCalculationMethod = null;
      } else {
        const shares = cap / cp;
        if (shares <= 0) {
          financial.ffoPerShare = null;
          financial.ffoCalculationMethod = null;
        } else {
          const fmpOcf = fmpData?.fmpOperatingCashflowTtm ?? null;
          if (
            fmpOcf != null &&
            Number.isFinite(fmpOcf) &&
            fmpOcf > 0
          ) {
            const ffoPs = fmpOcf / shares;
            if (Number.isFinite(ffoPs) && ffoPs > 0) {
              financial.ffoPerShare = ffoPs;
              financial.ffoCalculationMethod = "fmpOperatingCashflowTtm";
            }
          }
          if (financial.ffoPerShare == null) {
            const yahooOcf = toNumber(financial.operatingCashflow);
            if (
              yahooOcf != null &&
              Number.isFinite(yahooOcf) &&
              yahooOcf > 0
            ) {
              const ffoPs = yahooOcf / shares;
              if (Number.isFinite(ffoPs) && ffoPs > 0) {
                financial.ffoPerShare = ffoPs;
                financial.ffoCalculationMethod = "operatingCF";
              }
            }
          }
          if (financial.ffoPerShare == null) {
            const lf = latestF as Record<string, unknown> | undefined;
            const pm = financial.profitMargins;
            if (lf && pm != null && cap > 0 && cp > 0) {
              const revenue = annualTotalRevenueFromRow(lf);
              const netIncome = revenue != null ? pm * revenue : null;
              const daRaw =
                toNumber(lf.annualDepreciationAndAmortization) ??
                toNumber(lf.annualDepreciation);
              const da = daRaw ?? 0;
              if (netIncome !== null) {
                const ffo = netIncome + da;
                const ffoPs = ffo / shares;
                financial.ffoPerShare = Number.isFinite(ffoPs) ? ffoPs : null;
                financial.ffoCalculationMethod =
                  financial.ffoPerShare != null ? "netIncomePlusDA" : null;
              } else {
                financial.ffoCalculationMethod = null;
              }
            } else {
              financial.ffoCalculationMethod = null;
            }
          }
        }
      }
    } catch {
      financial.ffoPerShare = null;
      financial.ffoCalculationMethod = null;
    }

    try {
      const dr = toNumber(financial.dividendRate);
      const ffoPs = financial.ffoPerShare;
      if (dr === null || ffoPs === null || ffoPs <= 0) {
        financial.ffoPayoutRatio = null;
      } else {
        const r = dr / ffoPs;
        financial.ffoPayoutRatio = Number.isFinite(r) ? r : null;
      }
    } catch {
      financial.ffoPayoutRatio = null;
    }

    try {
      if (fundamentalsAnnual.length >= 2) {
        const r0 = fundamentalsAnnual[0] as Record<string, unknown>;
        const r1 = fundamentalsAnnual[1] as Record<string, unknown>;
        const ni0 =
          toNumber(r0.annualNetIncome) ?? toNumber(r0.netIncome);
        const ni1 =
          toNumber(r1.annualNetIncome) ?? toNumber(r1.netIncome);
        const da0 =
          toNumber(r0.annualDepreciationAndAmortization) ??
          toNumber(r0.annualDepreciation) ??
          0;
        const da1 =
          toNumber(r1.annualDepreciationAndAmortization) ??
          toNumber(r1.annualDepreciation) ??
          0;
        if (ni0 !== null && ni1 !== null) {
          const ffo0 = ni0 + da0;
          const ffo1 = ni1 + da1;
          if (ffo1 !== 0 && Number.isFinite(ffo0) && Number.isFinite(ffo1)) {
            financial.ffoGrowthRate = (ffo0 - ffo1) / ffo1;
          }
        }
      }
    } catch {
      financial.ffoGrowthRate = null;
    }

    try {
      const td = financial.totalDebt;
      if (td == null || td <= 0) {
        financial.longTermDebtRatio = null;
      } else {
        const lf = latestF as Record<string, unknown> | undefined;
        if (!lf) {
          financial.longTermDebtRatio = null;
        } else {
          const ltd =
            toNumber(lf.annualLongTermDebt) ?? toNumber(lf.longTermDebt);
          financial.longTermDebtRatio =
            ltd !== null && Number.isFinite(ltd / td) ? ltd / td : null;
        }
      }
    } catch {
      financial.longTermDebtRatio = null;
    }

    try {
      const ffoPs = financial.ffoPerShare;
      const cp = toNumber(financial.currentPrice);
      if (ffoPs === null || ffoPs <= 0 || cp === null) {
        financial.priceToFfo = null;
      } else {
        const v = cp / ffoPs;
        financial.priceToFfo = Number.isFinite(v) ? v : null;
      }
    } catch {
      financial.priceToFfo = null;
    }

    return financial;
  } catch (err) {
    throw new Error(
      `[Yahoo Finance] ${ticker} 데이터 수집 실패: ${err instanceof Error ? err.message : err}`
    );
  }
}

// ─────────────────────────────────────────────
// 2. FRED API 거시경제 데이터 수집
// ─────────────────────────────────────────────

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

async function fetchFredSeries(
  seriesId: string,
  name: string,
  unit: string
): Promise<FredSeries> {
  const apiKey = process.env.FRED_API_KEY;

  // API 키 없으면 null 반환 (파이프라인 중단 방지)
  if (!apiKey) {
    console.warn(`[FRED] FRED_API_KEY not set — skipping ${seriesId}`);
    return { seriesId, name, latestValue: null, latestDate: null, previousValue: null, change: null, changePercent: null, unit };
  }

  try {
    const url = new URL(FRED_BASE);
    url.searchParams.set("series_id",  seriesId);
    url.searchParams.set("api_key",    apiKey);
    url.searchParams.set("file_type",  "json");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit",      "2");

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const observations: Array<{ date: string; value: string }> = json.observations ?? [];
    const valid = observations.filter((o) => o.value !== "." && o.value !== "");

    const latest   = valid[0];
    const previous = valid[1];

    const latestValue   = latest   ? parseFloat(latest.value)   : null;
    const previousValue = previous ? parseFloat(previous.value) : null;
    const change        = latestValue !== null && previousValue !== null ? latestValue - previousValue : null;
    const changePercent = change !== null && previousValue ? (change / previousValue) * 100 : null;

    return { seriesId, name, latestValue, latestDate: latest?.date ?? null, previousValue, change, changePercent, unit };
  } catch (err) {
    console.error(`[FRED] Failed to fetch ${seriesId}:`, err);
    return { seriesId, name, latestValue: null, latestDate: null, previousValue: null, change: null, changePercent: null, unit };
  }
}

export async function fetchMacroData(): Promise<MacroData> {
  // 10개 시리즈 동시에 요청 (순서 중요 — 아래 구조분해와 맞춰야 함)
  const [
    federalFundsRate,
    tenYearTreasury,
    twoYearTreasury,
    cpiYoY,
    pce,
    unemploymentRate,
    nonfarmPayrolls,
    gdpGrowth,
    ismManufacturing,
    dxy,
  ] = await Promise.all([
    fetchFredSeries("FEDFUNDS",           "Federal Funds Rate",         "%"),
    fetchFredSeries("DGS10",              "10-Year Treasury Yield",     "%"),
    fetchFredSeries("DGS2",               "2-Year Treasury Yield",      "%"),
    fetchFredSeries("CUUR0000SA0L1E",     "CPI YoY Change",             "%"),
    fetchFredSeries("PCEPI",              "PCE Price Index",            "Index"),
    fetchFredSeries("UNRATE",             "Unemployment Rate",          "%"),
    fetchFredSeries("PAYEMS",             "Nonfarm Payrolls",           "Thousands"),
    fetchFredSeries("A191RL1Q225SBEA",    "Real GDP Growth",            "%"),
    fetchFredSeries("NAPM",               "ISM Manufacturing PMI",      "Index"),
    fetchFredSeries("DTWEXBGS",           "US Dollar Index (Broad)",    "Index"),
  ]);

  return {
    federalFundsRate,
    tenYearTreasury,
    twoYearTreasury,
    cpiYoY,
    pce,
    unemploymentRate,
    nonfarmPayrolls,
    gdpGrowth,
    ismManufacturing,
    dxy,
    fetchedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
// 3. NewsAPI 뉴스 수집
// ─────────────────────────────────────────────

const NEWS_BASE = "https://newsapi.org/v2";

const POSITIVE_KEYWORDS = [
  "surge","rally","beat","record","growth","profit","gain",
  "outperform","upgrade","bull","strong","positive","rise","boost","expand",
];
const NEGATIVE_KEYWORDS = [
  "fall","drop","miss","loss","decline","cut","downgrade","bear",
  "weak","concern","risk","lawsuit","investigation","recall","layoff",
];

function classifySentiment(text: string): NewsItem["sentiment"] {
  const lower    = text.toLowerCase();
  const posScore = POSITIVE_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const negScore = NEGATIVE_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
}

async function fetchNewsArticles(query: string, pageSize = 10): Promise<NewsItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn("[NewsAPI] NEWS_API_KEY not set");
    return [];
  }

  try {
    const url = new URL(`${NEWS_BASE}/everything`);
    url.searchParams.set("q",        query);
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy",   "publishedAt");
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("from",     getDateNDaysAgo(30).toISOString().split("T")[0]);
    url.searchParams.set("apiKey",   apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const articles: Array<{
      title?:       string;
      description?: string;
      source?:      { name?: string };
      url?:         string;
      publishedAt?: string;
    }> = json.articles ?? [];

    return articles
      .filter((a) => a.title && a.url)
      .map((a) => ({
        title:       a.title!,
        description: a.description ?? null,
        source:      a.source?.name ?? "Unknown",
        url:         a.url!,
        publishedAt: a.publishedAt ?? new Date().toISOString(),
        sentiment:   classifySentiment(`${a.title} ${a.description ?? ""}`),
      }));
  } catch (err) {
    console.error("[NewsAPI] Failed:", err);
    return [];
  }
}

export async function fetchNewsData(ticker: string, companyName: string): Promise<NewsData> {
  const [companyNews, marketNews] = await Promise.all([
    fetchNewsArticles(`"${companyName}" OR "${ticker}" stock earnings partnership investment`, 15),
    fetchNewsArticles("stock market economy Fed interest rates", 8),
  ]);

  return {
    companyNews,
    marketNews,
    fetchedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
// 4. 통합 수집 함수 — Server Action에서 이걸 호출하세요
// ─────────────────────────────────────────────

export async function collectAllData(ticker: string): Promise<CollectedData> {
  console.log(`[DataFetcher] Starting for: ${ticker}`);

  // 회사명이 필요하므로 재무 데이터 먼저
  const financial = await fetchFinancialData(ticker);

  // 거시 + 뉴스는 병렬
  const [macro, news] = await Promise.all([
    fetchMacroData(),
    fetchNewsData(ticker, financial.companyName),
  ]);

  try {
    const riskFreeRate = macro.tenYearTreasury?.latestValue != null
      ? macro.tenYearTreasury.latestValue / 100
      : 0.045;
    const beta = financial.beta ?? 1.0;
    const roe = financial.returnOnEquity;
    if (roe != null) {
      const coe = riskFreeRate + beta * 0.055;
      financial.costOfEquity = coe;
      const jpb = roe / coe;
      financial.justifiedPB = (jpb > 0 && jpb < 20) ? jpb : null;
    }
  } catch { }

  try {
    const dy = financial.dividendYield;
    const t10 = macro.tenYearTreasury?.latestValue ?? null;
    if (dy === null || t10 === null) {
      financial.dividendToTreasurySpread = null;
    } else {
      financial.dividendToTreasurySpread = dy - t10 / 100;
    }
  } catch {
    financial.dividendToTreasurySpread = null;
  }

  console.log(`[DataFetcher] Done: ${financial.companyName}`);
  return { financial, macro, news, collectedAt: new Date().toISOString() };
}

// ─────────────────────────────────────────────
// 내부 유틸
// ─────────────────────────────────────────────

function getDateNDaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}