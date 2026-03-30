"use server";

/**
 * src/app/actions/generate-analysis.ts
 * AlphA Holdings — AI 주식 분석 리포트 생성 Server Action
 *
 * 흐름: 티커 → 데이터 수집 → 모델 자동 선택(A~F) → 채점 → DB 저장 → slug 반환
 */

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { collectAllData } from "@/lib/analysis/data-fetcher";
import { SCORING_FRAMEWORK, MODEL_NAMES, type ScoringModelType } from "@/lib/analysis/scoring-framework";

// ─────────────────────────────────────────────
// Zod 스키마
// ─────────────────────────────────────────────

const DimensionScoreSchema = z.object({
  dimensionId: z.string().describe("예: D1-1, D2, D3-2 등 채점표 항목 ID"),
  dimensionName: z.string().describe("예: ROIC, FCF 마진, 사이클 위치 판단 등"),
  maxScore: z.number().describe("해당 항목 만점"),
  score: z.number().describe("부여 점수 (조정 포함, 0 이하 가능)"),
  rationale: z.string().describe("점수 부여 근거 (2~3문장, 반드시 수치 인용)"),
});

const OverlayItemSchema = z.object({
  item: z.string().describe("오버레이 항목명"),
  adjustment: z.number().describe("가점(양수) 또는 감점(음수)"),
  rationale: z.string().describe("적용 근거"),
});

const AnalysisOutputSchema = z.object({

  // ── 모델 선택 ──────────────────────────────
  selectedModel: z.enum(["A", "B", "C", "D", "E", "F"]).describe(
    "기업 특성에 가장 적합한 채점 모델 (A~F 중 하나)"
  ),
  modelSelectionRationale: z.string().describe(
    "이 모델을 선택한 이유 (섹터·비즈니스 모델·재무 특성 근거, 2~3문장)"
  ),

  // ── 기업 개요 ──────────────────────────────
  companyOverview: z.object({
    summary: z.string().describe("기업 개요 및 비즈니스 모델 요약 (3~5문장)"),
    keyProducts: z.array(z.string()).describe("핵심 제품/서비스 3~5개"),
    competitiveAdvantage: z.string().describe("경쟁 우위 요약"),
  }),

  // ── 채점 ───────────────────────────────────
  dimensionScores: z.array(DimensionScoreSchema).min(3).describe(
    "선택된 모델의 모든 Dimension 항목을 빠짐없이 채점"
  ),
  dimensionTotal: z.number().describe(
    "dimensionScores 점수 합계 (오버레이 적용 전)"
  ),

  // ── 오버레이 ───────────────────────────────
  overlayAdjustments: z.array(OverlayItemSchema).describe(
    "적용된 가점/감점 항목 목록 (해당 없으면 빈 배열)"
  ),
  overlayTotal: z.number().describe(
    "오버레이 조정 합계 (양수/음수/0)"
  ),

  // ── Kill Switch ────────────────────────────
  killSwitchTriggered: z.boolean().describe(
    "Kill Switch 조건 중 하나라도 발동되면 true"
  ),
  killSwitchReason: z.string().nullable().describe(
    "발동된 Kill Switch 조건 설명. 미발동 시 null"
  ),

  // ── 최종 점수 & 등급 ─────────────────────
  totalScore: z.number().min(0).max(110).describe(
    "dimensionTotal + overlayTotal. Kill Switch 발동 시 강제로 30 이하로 조정"
  ),
  rating: z.enum(["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"]).describe(
    `등급 기준:
일반(A·B·D·E·F): 85+→Strong Buy / 75+→Buy / 60+→Hold / 45+→Sell / 미만→Strong Sell
Model C 전용:    85+→Strong Buy / 75+→Buy / 55+→Hold / 40+→Sell / 미만→Strong Sell
Kill Switch 발동 시: Sell 이하 강제 강등`
  ),

  // ── 목표 주가 ──────────────────────────────
  priceTarget: z.object({
    bear: z.number().describe("비관 시나리오 12개월 목표 주가"),
    base: z.number().describe("기본 시나리오 12개월 목표 주가"),
    bull: z.number().describe("낙관 시나리오 12개월 목표 주가"),
    rationale: z.string().describe("목표 주가 산정 근거 (3~4문장)"),
  }),

  // ── 촉매 & 리스크 ──────────────────────────
  catalysts: z.array(z.object({
    title: z.string(),
    description: z.string(),
    timeframe: z.enum(["단기 (0~3개월)", "중기 (3~12개월)", "장기 (1년+)"]),
  })).min(2).max(5),

  risks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    severity: z.enum(["낮음", "중간", "높음"]),
  })).min(2).max(5),

  // ── 종합 의견 ──────────────────────────────
  investmentThesis: z.string().describe(
    "종합 투자 의견 — 채점 결과를 바탕으로 핵심 논거 (5~7문장)"
  ),

  analystConsensus: z.object({
    summary: z.string().describe("애널리스트 컨센서스와 현재가 대비 괴리 분석"),
    updownside: z.number().describe("현재가 대비 base 목표가 upside/downside %"),
  }),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

// ─────────────────────────────────────────────
// 메인 Server Action
// ─────────────────────────────────────────────

export interface GenerateAnalysisResult {
  success: boolean;
  slug?: string;
  year?: string;
  month?: string;
  error?: string;
}

export async function generateAnalysisAction(
  ticker: string
): Promise<GenerateAnalysisResult> {
  const upperTicker = ticker.toUpperCase().trim();
  if (!upperTicker) return { success: false, error: "티커를 입력해주세요." };

  try {
    // ── 1. 데이터 수집 ──────────────────────
    console.log(`[Analysis] 데이터 수집 시작: ${upperTicker}`);
    const collected = await collectAllData(upperTicker);
    const { financial, macro, news } = collected;

    // ── 2. Gemini 분석 ───────────────────────
    console.log(`[Analysis] Gemini 분석 시작: ${financial.companyName}`);
    const { object: analysisOutput } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: AnalysisOutputSchema,
      prompt: buildPrompt(financial, macro, news),
      temperature: 0.2,
    });

    // ── 3. slug / 날짜 생성 ──────────────────
    const now     = new Date();
    const year    = now.getFullYear().toString();
    const month   = String(now.getMonth() + 1).padStart(2, "0");
    const dateStr = `${year}${month}${String(now.getDate()).padStart(2, "0")}`;
    const slug    = `${upperTicker.toLowerCase()}-${dateStr}`;

    const modelLabel = MODEL_NAMES[analysisOutput.selectedModel as ScoringModelType];

    // ── 4. DB 저장 ───────────────────────────
    console.log(`[Analysis] DB 저장: ${slug}`);
    await prisma.analysisReport.upsert({
      where:  { slug },
      update: {
        companyName:  financial.companyName,
        periodLabel:  `${year}.${month}`,
        reportData:   analysisOutput as object,
        rating:       analysisOutput.rating,
        totalScore:   analysisOutput.totalScore,
        appliedModel: `gemini-2.5-flash | Model ${analysisOutput.selectedModel}: ${modelLabel}`,
        updatedAt:    now,
      },
      create: {
        ticker:       upperTicker,
        companyName:  financial.companyName,
        slug,
        periodLabel:  `${year}.${month}`,
        reportData:   analysisOutput as object,
        rating:       analysisOutput.rating,
        totalScore:   analysisOutput.totalScore,
        appliedModel: `gemini-2.5-flash | Model ${analysisOutput.selectedModel}: ${modelLabel}`,
      },
    });

    console.log(`[Analysis] 완료: /analysis/${year}/${month}/${slug}`);
    return { success: true, slug, year, month };

  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[Analysis] 실패:", message);
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────
// 프롬프트 빌더
// ─────────────────────────────────────────────

type CollectedFinancial = Awaited<ReturnType<typeof collectAllData>>["financial"];
type CollectedMacro     = Awaited<ReturnType<typeof collectAllData>>["macro"];
type CollectedNews      = Awaited<ReturnType<typeof collectAllData>>["news"];

function buildPrompt(
  financial: CollectedFinancial,
  macro:     CollectedMacro,
  news:      CollectedNews
): string {
  // 포맷 헬퍼
  const fmt  = (v: number | null | undefined, suffix = "") =>
    v != null ? `${v.toLocaleString()}${suffix}` : "N/A";
  const pct  = (v: number | null | undefined) =>
    v != null ? `${(v * 100).toFixed(2)}%` : "N/A";
  const fmtB = (v: number | null | undefined) =>
    v != null ? `$${(v / 1_000_000_000).toFixed(2)}B` : "N/A";
  const fredVal = (s: { latestValue?: number | null } | null | undefined) =>
    s?.latestValue != null ? s.latestValue.toFixed(2) : "N/A";
  const fredChg = (s: { change?: number | null } | null | undefined) =>
    s?.change != null ? `${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}` : "N/A";

  return `
당신은 글로벌 자산운용사의 수석 주식 애널리스트입니다.
아래 【채점 기준표】와 【기업 데이터】를 기반으로 ${financial.companyName} (${financial.ticker})의 투자 분석 리포트를 작성하세요.

══════════════════════════════════════════
【 STEP 1. 모델 선택 】
══════════════════════════════════════════
아래 6가지 모델 중 이 기업에 가장 적합한 모델 하나를 선택하세요.

  A — Core Compounder   : 빅테크·헬스케어·필수소비재 등 검증된 해자 보유 기업
  B — Secular Growth    : 클라우드·AI·고성장 SaaS
  C — Deep Tech         : 적자 바이오텍·양자컴퓨팅·초기 딥테크
  D — Cyclical/Commodity: 메모리 반도체·정유·화학·해운·철강
  E — Financials        : 은행·보험사
  F — REITs / Yield     : 리츠·인프라·유틸리티

선택 기준: 섹터(${financial.sector ?? "N/A"}), 업종(${financial.industry ?? "N/A"}),
           비즈니스 모델, 재무 구조를 종합하여 판단하세요.

══════════════════════════════════════════
【 STEP 2. Dimension별 채점 】
══════════════════════════════════════════
선택한 모델의 채점 기준표(아래 첨부)를 따라 모든 Dimension 항목을 빠짐없이 채점하세요.

규칙:
- 각 항목은 아래 기업 데이터에서 직접 수치를 인용하여 근거를 작성하세요.
- 🟢 항목: 아래 제공된 정량 데이터 기반으로 채점
- 🔵 항목: FRED 거시 데이터 기반으로 채점
- 🟡 항목: 뉴스·사업 개요·정성 판단으로 채점
- 조정(+1/-1/-2 등) 항목은 기준 점수에 가감 후 최종 점수로 기록
- 만점을 초과하거나 음수 미만이 되지 않도록 클램핑

══════════════════════════════════════════
【 STEP 3. 오버레이 적용 】
══════════════════════════════════════════
선택한 모델의 오버레이 가점/감점 항목을 검토하고, 해당되는 항목만 적용하세요.
이중처벌 방지 원칙: Dimension에서 이미 반영된 내용은 오버레이에서 중복 적용하지 마세요.
최대 가점·최대 감점 한도를 준수하세요.

══════════════════════════════════════════
【 STEP 4. Kill Switch 검토 】
══════════════════════════════════════════
선택한 모델의 Kill Switch 조건을 확인하세요.
조건 중 하나라도 해당되면 killSwitchTriggered = true,
rating을 Sell 이하로 강제 강등, totalScore를 30 이하로 조정하세요.

══════════════════════════════════════════
【 채점 기준표 전문 】
══════════════════════════════════════════
${SCORING_FRAMEWORK}

══════════════════════════════════════════
【 기업 데이터 】
══════════════════════════════════════════

▌ 기본 정보
티커: ${financial.ticker}  |  기업명: ${financial.companyName}
섹터: ${financial.sector ?? "N/A"}  |  업종: ${financial.industry ?? "N/A"}
국가: ${financial.country ?? "N/A"}  |  통화: ${financial.currency ?? "USD"}
임직원: ${fmt(financial.employees)}명  |  웹사이트: ${financial.website ?? "N/A"}

▌ 사업 개요
${financial.description ?? "N/A"}

▌ 주가 & 시장
현재가: ${fmt(financial.currentPrice)}  |  전일종가: ${fmt(financial.previousClose)}
52주 최저: ${fmt(financial.fiftyTwoWeekLow)}  |  52주 최고: ${fmt(financial.fiftyTwoWeekHigh)}
시가총액: ${fmtB(financial.marketCap)}  |  거래량: ${fmt(financial.volume)} (평균 ${fmt(financial.averageVolume)})

▌ 밸류에이션
Trailing P/E: ${fmt(financial.trailingPE)}  |  Forward P/E: ${fmt(financial.forwardPE)}
P/B: ${fmt(financial.priceToBook)}  |  P/S(TTM): ${fmt(financial.priceToSales)}
EV: ${fmtB(financial.enterpriseValue)}  |  EV/Revenue: ${fmt(financial.evToRevenue)}  |  EV/EBITDA: ${fmt(financial.evToEbitda)}

▌ 수익성
매출성장률(TTM YoY): ${pct(financial.revenueGrowth)}  |  3년 매출 CAGR: ${financial.revenueCAGR3Y != null
  ? `${(financial.revenueCAGR3Y * 100).toFixed(2)}%${
      financial.fmpRevenueCAGR3Y != null
        ? " (FMP 기준)"
        : financial.revenueCAGR3Y === financial.revenueGrowth
          ? " (TTM 대체)"
          : ""
    }`
  : "N/A"}  |  이익성장률: ${pct(financial.earningsGrowth)}
매출총이익률: ${pct(financial.grossMargins)}  |  영업이익률: ${pct(financial.operatingMargins)}
순이익률: ${pct(financial.profitMargins)}  |  ROA: ${pct(financial.returnOnAssets)}  |  ROE: ${pct(financial.returnOnEquity)}
영업이익(TTM): ${fmtB(financial.operatingIncome)}
영업이익 YoY 성장률: ${financial.operatingIncomeGrowth != null ? `${(financial.operatingIncomeGrowth * 100).toFixed(2)}%` : "N/A"}
영업 레버리지 (영업이익성장률 ÷ 매출성장률): ${financial.operatingLeverage != null ? financial.operatingLeverage.toFixed(2) : "N/A"}배
EBIT: ${fmtB(financial.ebit)}  |  이자비용: ${fmtB(financial.interestExpense)}
이자보상배율 (EBIT ÷ 이자비용): ${financial.interestCoverage != null ? `${financial.interestCoverage.toFixed(1)}배` : "N/A"}
ROIC: ${financial.roic != null ? `${(financial.roic * 100).toFixed(2)}%` : "N/A"}

▌ Model B 성장 효율 지표
Rule of 40: ${financial.ruleOf40 != null ? `${financial.ruleOf40.toFixed(1)}점` : "N/A"} (매출성장률 + FCF마진, 40+ 효율적 성장)
SBC/매출 비율: ${financial.sbcToRevenue != null ? `${(financial.sbcToRevenue * 100).toFixed(2)}%` : "N/A"} (10% 미만 양호, 20% 초과 주주가치 훼손)
현금 런웨이: ${financial.isCashRunwayInfinite ? "FCF 흑자 (런웨이 무한)" : financial.cashRunwayYears != null ? `${financial.cashRunwayYears.toFixed(1)}년` : "N/A"}
EV/Gross Profit: ${financial.evToGrossProfit != null ? financial.evToGrossProfit.toFixed(1) : "N/A"}
EV/Gross Profit 섹터 중앙값: ${financial.peersMedian?.evToGrossProfit != null ? financial.peersMedian.evToGrossProfit.toFixed(1) : "N/A"}
EV/Sales ÷ Forward 매출성장률 (사전계산값): ${financial.evToSalesGrowthRatio != null ? financial.evToSalesGrowthRatio.toFixed(3) : "N/A"}
  ※ 위 값은 evToRevenue / (성장률% 숫자) 로 이미 계산됨. Gemini는 이 값을 그대로 사용할 것. 절대 재계산 금지.
  기준: <0.2 매력적 / 0.2~0.4 양호 / 0.4~0.6 보통 / 0.6~0.8 비쌈 / >0.8 고평가
Forward 매출성장률 (FMP): ${financial.fmpForwardRevenueGrowth != null ? `${(financial.fmpForwardRevenueGrowth * 100).toFixed(1)}%` : "N/A"}
분기별 매출성장률 표준편차: ${financial.revenueGrowthStdDev != null ? `${financial.revenueGrowthStdDev.toFixed(1)}%p` : "N/A"} (5%p 미만 안정, 15%p 초과 불안정)
분기별 성장률 추이: ${financial.quarterlyRevenueGrowthRates != null && financial.quarterlyRevenueGrowthRates.length > 0 ? financial.quarterlyRevenueGrowthRates.map((r) => `${(r * 100).toFixed(1)}%`).join(" → ") : "N/A"}
  ※ 분기별 매출성장률 추이가 제공된 경우 표준편차를 직접 계산해서 채점할 것.
     추이 데이터가 있으면 "데이터 없음"으로 처리하지 말고 반드시 채점.
     추이도 없으면 TTM 성장률 기준으로 중간 점수(2~3점) 부여하고 "(추정)" 명시.

▌ Model C 생존·희석 지표
현금 보유: ${fmtB(financial.totalCash)}
분기 현금 소진율: ${financial.quarterlyBurnRate != null ? `$${(financial.quarterlyBurnRate / 1e9).toFixed(2)}B/분기` : financial.isCashRunwayInfinite ? "흑자 (소진 없음)" : "N/A"}
현금 런웨이: ${financial.cashRunwayQuarters != null ? `${financial.cashRunwayQuarters.toFixed(1)}분기 (${(financial.cashRunwayQuarters / 4).toFixed(1)}년)` : financial.isCashRunwayInfinite ? "FCF 흑자 (무한)" : "N/A"}
  ※ 1년 미만이면 Kill Switch 즉시 검토
발행주식수 YoY 변화율: ${financial.sharesOutstandingYoY != null ? `${(financial.sharesOutstandingYoY * 100).toFixed(2)}% (양수=희석, 음수=소각)` : "N/A"}
매출 (절대값): ${financial.revenueAbsolute != null ? `$${(financial.revenueAbsolute / 1e9).toFixed(2)}B` : "N/A"}
매출 성장률: ${pct(financial.revenueGrowth)}
Pre-Revenue 여부: ${financial.isPreRevenue ? "예 (매출 1억달러 미만 또는 데이터 없음)" : "아니오"}
시가총액: ${fmtB(financial.marketCap)}
P/B: ${fmt(financial.priceToBook)}

▌ Model D 시클리컬 지표
재고회전율 YoY 변화: ${financial.inventoryTurnoverYoY != null
  ? `${(financial.inventoryTurnoverYoY * 100).toFixed(1)}% (양수=개선, 음수=악화)`
  : "N/A"}
EV/EBITDA: ${financial.evToEbitda != null ? financial.evToEbitda.toFixed(1) : "N/A"}
P/B: ${fmt(financial.priceToBook)}
5년 평균 Trailing P/E: ${financial.fiveYearAvgPE != null ? financial.fiveYearAvgPE.toFixed(1) : "N/A"}
배당 커버리지 (FCF ÷ 총배당): ${financial.dividendCoverageRatio != null
  ? `${financial.dividendCoverageRatio.toFixed(1)}배`
  : financial.dividendRate === null || financial.dividendRate === 0
    ? "무배당"
    : "N/A"}
이자보상배율: ${financial.interestCoverage != null ? `${financial.interestCoverage.toFixed(1)}배` : "N/A"}
순부채/EBITDA: ${
  financial.totalDebt != null && financial.totalCash != null && financial.evToEbitda != null && financial.enterpriseValue != null
    ? (() => {
        const netDebt = financial.totalDebt - financial.totalCash;
        const ebitda = financial.enterpriseValue / financial.evToEbitda;
        return ebitda > 0 ? `${(netDebt / ebitda).toFixed(2)}배` : "N/A";
      })()
    : "N/A"
}

▌ Model E 금융주 지표
ROE: ${pct(financial.returnOnEquity)}
베타: ${financial.beta != null ? financial.beta.toFixed(2) : "N/A"}
자기자본비용 (CoE): ${financial.costOfEquity != null ? `${(financial.costOfEquity * 100).toFixed(2)}%` : "N/A"}
Justified P/B: ${financial.justifiedPB != null ? financial.justifiedPB.toFixed(2) : "N/A"}
현재 P/B: ${fmt(financial.priceToBook)}
Justified P/B 대비 현재 P/B 괴리율: ${
  financial.justifiedPB != null && financial.priceToBook != null && financial.justifiedPB > 0
    ? `${(((financial.priceToBook - financial.justifiedPB) / financial.justifiedPB) * 100).toFixed(1)}% (양수=할증, 음수=할인)`
    : "N/A"
}
배당수익률: ${pct(financial.dividendYield)}
순이익률: ${pct(financial.profitMargins)}
NIM 근사값 (참고용): ${financial.netInterestMarginProxy != null ? `${(financial.netInterestMarginProxy * 100).toFixed(2)}%` : "N/A"}
부채비율 (D/E): ${fmt(financial.debtToEquity)}

▌ Model F 리츠·인프라 지표
FFO Payout Ratio (근사): ${financial.ffoPayoutRatio != null
  ? `${(financial.ffoPayoutRatio * 100).toFixed(1)}%`
  : "N/A"}
  ※ FFO = 순이익 + D&A 근사값. 실제 AFFO와 다를 수 있음.
FFO 성장률 (YoY): ${financial.ffoGrowthRate != null
  ? `${(financial.ffoGrowthRate * 100).toFixed(1)}%`
  : "N/A"}
P/FFO: ${financial.priceToFfo != null ? financial.priceToFfo.toFixed(1) : "N/A"}
장기부채 비중: ${financial.longTermDebtRatio != null
  ? `${(financial.longTermDebtRatio * 100).toFixed(1)}%`
  : "N/A"}
배당수익률 vs 10년 국채 스프레드: ${financial.dividendToTreasurySpread != null
  ? `${(financial.dividendToTreasurySpread * 100).toFixed(0)}bps (양수=배당이 국채보다 높음)`
  : "N/A"}
배당 연속 증가 연수: ${financial.dividendGrowthYears != null
  ? `${financial.dividendGrowthYears}년`
  : "N/A"}
순부채/EBITDA: ${
  financial.totalDebt != null && financial.totalCash != null
  && financial.evToEbitda != null && financial.enterpriseValue != null
    ? (() => {
        const netDebt = financial.totalDebt - financial.totalCash;
        const ebitda = financial.enterpriseValue / financial.evToEbitda;
        return ebitda > 0 ? `${(netDebt / ebitda).toFixed(2)}배` : "N/A";
      })()
    : "N/A"
}

▌ Peers 섹터 중앙값 ${financial.peersMedian ? `(${financial.peersMedian.peersUsed.join(", ")})` : ""}
매출총이익률 섹터 중앙값: ${financial.peersMedian?.grossMargin != null ? `${(financial.peersMedian.grossMargin * 100).toFixed(2)}%` : "N/A"}
EV/FCF 섹터 중앙값: ${financial.peersMedian?.evToFcf != null ? financial.peersMedian.evToFcf.toFixed(1) : "N/A"}
  ※ Gemini: 위 중앙값과 비교하여 매출총이익률(D1-2)과 EV/FCF(D5-2) 항목을 채점하세요.
     중앙값이 N/A인 경우에만 정성 판단 허용.

▌ 재무 건전성
총현금: ${fmtB(financial.totalCash)}  |  총부채: ${fmtB(financial.totalDebt)}
D/E: ${fmt(financial.debtToEquity)}  |  유동비율: ${fmt(financial.currentRatio)}  |  당좌비율: ${fmt(financial.quickRatio)}
FCF: ${fmtB(financial.freeCashflow)}  |  영업CF: ${fmtB(financial.operatingCashflow)}

▌ 배당 & 주주환원
배당금: ${fmt(financial.dividendRate, " USD")}  |  배당수익률: ${pct(financial.dividendYield)}  |  배당성향: ${pct(financial.payoutRatio)}
배당 연속 증가 연수: ${financial.dividendGrowthYears != null ? `${financial.dividendGrowthYears}년` : "N/A"}
자사주 매입 (최근 연간): ${fmtB(financial.shareRepurchase)}
주식기반보상 SBC (최근 연간): ${fmtB(financial.stockBasedCompensation)}
순희석률 (자사주-SBC)/시총: ${financial.netDilutionRate != null ? `${(financial.netDilutionRate * 100).toFixed(2)}%` : "N/A"}
  (양수=주식수 순감소 주주환원 / 음수=실질 희석)
상세: ${financial.netDilutionDetail ?? "N/A"}

▌ 밸류에이션 (확장)
Trailing P/E: ${fmt(financial.trailingPE)}  |  Forward P/E: ${fmt(financial.forwardPE)}
5년 평균 Trailing P/E: ${financial.fiveYearAvgPE != null ? financial.fiveYearAvgPE.toFixed(1) : "N/A"}
현재 Trailing P/E vs 5년 평균 괴리율: ${
  financial.peRatioVs5YearAvg != null
    ? `${(financial.peRatioVs5YearAvg * 100).toFixed(1)}% (양수=할증, 음수=할인)`
    : "N/A"
}
  ※ Gemini: D5-1 채점 시 반드시 Trailing P/E vs 5년 평균 Trailing P/E 괴리율 기준으로 채점.
     Forward P/E는 참고용으로만 사용. 두 지표를 직접 비교하지 말 것.
P/B: ${fmt(financial.priceToBook)}  |  P/S(TTM): ${fmt(financial.priceToSales)}
EV: ${fmtB(financial.enterpriseValue)}  |  EV/Revenue: ${fmt(financial.evToRevenue)}  |  EV/EBITDA: ${fmt(financial.evToEbitda)}
EV/FCF: ${financial.enterpriseValue != null && financial.freeCashflow != null && financial.freeCashflow > 0
  ? (financial.enterpriseValue / financial.freeCashflow).toFixed(1)
  : "N/A"}

▌ 성장 추정
Trailing EPS: ${fmt(financial.trailingEps)}
1년 후 EPS 추정: ${fmt(financial.epsEstimateNextYear)}
Forward EPS CAGR: ${financial.forwardEpsCAGR != null
  ? `${(financial.forwardEpsCAGR * 100).toFixed(1)}% (${
      financial.fmpEpsCagrYears != null
        ? `FMP 컨센서스 ${financial.fmpEpsCagrYears}년 CAGR`
        : financial.forwardEpsCagrIsOneYear
          ? "Yahoo 1년 추정, 주의"
          : "Yahoo 2년 CAGR"
    })`
  : "N/A"}

▌ 애널리스트 컨센서스
목표가 범위: ${fmt(financial.targetLowPrice)} ~ ${fmt(financial.targetHighPrice)}
평균목표가: ${fmt(financial.targetMeanPrice)}
추천의견: ${financial.recommendationKey ?? "N/A"} (${fmt(financial.recommendationMean)}/5.0, ${fmt(financial.numberOfAnalystOpinions)}명)

▌ 최근 분기 실적 (EPS)
${financial.earningsHistory
  .map((e) =>
    `${e.period}: 실제 ${fmt(e.epsActual)} / 예상 ${fmt(e.epsEstimate)} / 서프라이즈 ${
      e.surprisePercent != null ? `${(e.surprisePercent * 100).toFixed(1)}%` : "N/A"
    }`
  )
  .join("\n")}

▌ 거시경제 (FRED)
기준금리(Fed Funds):  ${fredVal(macro.federalFundsRate)}%  (전월비 ${fredChg(macro.federalFundsRate)}%p)
10년물 국채금리:      ${fredVal(macro.tenYearTreasury)}%
2년물 국채금리:       ${fredVal(macro.twoYearTreasury)}%
CPI YoY 변화율:       ${fredVal(macro.cpiYoY)}%
PCE 물가지수:         ${fredVal(macro.pce)}
실업률:               ${fredVal(macro.unemploymentRate)}%
비농업 고용:          ${fredVal(macro.nonfarmPayrolls)}K
실질 GDP 성장률:      ${fredVal(macro.gdpGrowth)}%
ISM 제조업 PMI:       ${fredVal(macro.ismManufacturing)}
달러 인덱스(DXY):     ${fredVal(macro.dxy)}

▌ 최근 뉴스 — 기업
${news.companyNews
  .slice(0, 6)
  .map((n, i) =>
    `${i + 1}. [${n.sentiment.toUpperCase()}] ${n.title} (${n.source}, ${n.publishedAt.split("T")[0]})`
  )
  .join("\n")}

▌ 최근 뉴스 — 시장/매크로
${news.marketNews
  .slice(0, 4)
  .map((n, i) => `${i + 1}. ${n.title} (${n.source}, ${n.publishedAt.split("T")[0]})`)
  .join("\n")}

══════════════════════════════════════════
분석 지침
- 모든 수치는 위 기업 데이터에서만 인용하세요.
- 채점 기준표에 없는 항목을 임의로 추가하지 마세요.
- 한국어로 작성하되 지표명·모델명은 영어 병기 가능.
- Kill Switch 발동 여부를 반드시 검토하고 결과를 명시하세요.
- Forward EPS CAGR이 "(1년 추정, 주의)"로 표시된 경우:
  애널리스트 컨센서스와 괴리가 클 수 있으므로 보수적으로 적용하고,
  뉴스/사업 개요의 성장 전망과 교차 검증 후 채점하세요.
  일반적으로 1년 추정치가 과장되는 경향이 있으므로
  해당 항목 점수는 한 단계 보수적으로 부여하세요.
- 결제 인프라 기업(Visa, Mastercard, 티커: V, MA)의 경우
  Yahoo Finance 매출총이익률이 구조적으로 95%+로 과장될 수 있음.
  섹터 Peers 중앙값과의 상대 비교로만 채점하고
  절대값 기준 섹터 상위 10% 판단은 Peers 데이터 우선 적용.
Model B 선택 시 추가 지침!!:
- evToSalesGrowthRatio가 N/A가 아니면 D5-1 채점 시 이 값을 그대로 사용. 재계산 절대 금지.
- ruleOf40이 N/A가 아니면 D2-1 채점에 반드시 사용.
- sbcToRevenue가 N/A가 아니면 D4-2 채점에 반드시 사용.
- 현금 런웨이가 "FCF 흑자"이면 D4-1은 7점 자동 부여.
- quarterlyRevenueGrowthRates 배열이 있으면 표준편차를 직접 계산해서 D1-3 채점. 배열이 없으면 TTM 성장률로 2~3점 부여하고 "(추정)" 명시. 0점 금지.
- NRR은 뉴스와 어닝콜에서 수치를 직접 찾아 채점하고 근거 명시. 못 찾으면 매출 성장률과 비즈니스 모델로 추정하되 "(추정)" 명시. 데이터 없다고 0점 주지 말 것.
- 고객 효율성(D2-2)도 동일하게 뉴스/IR에서 $1M+ 고객 성장률 또는 RPO 찾아 채점. 못 찾으면 매출 성장률 기반 추정 후 "(추정)" 명시. 0점 금지.
- Forward 매출성장률은 FMP 값 우선, 없으면 Yahoo earningsTrend revenueEstimate 사용, 그것도 없으면 TTM 사용.
- EV/Gross Profit 섹터 중앙값이 있으면 D5-2 채점에 사용.
- Model B 선택 시 EV/Gross Profit 섹터 중앙값이 10 미만이면
  동종 고성장 SaaS 기업의 일반적 범위(15~40x)와 크게 다른 것이므로
  해당 Peers 중앙값은 신뢰하지 말고 보수적 중간 점수(3~4점) 부여.
- EV/Gross Profit 섹터 중앙값이 N/A이면 절대적 수준(SaaS 정상 범위 20~50x)으로 비교하고
  현재 기업의 성장률을 고려해서 할증/할인 판단. 중앙값 없다고 1점 주지 말 것.
- EV/Sales ÷ 성장률이 0.8 초과여도 매출성장률이 30% 이상이고
  Rule of 40이 50 이상이면 고성장 프리미엄으로 인식하고
  채점표 기준 그대로 적용하되 오버레이 가점 검토할 것.
Model C 선택 시 추가 지침:
- 현금 런웨이가 1년 미만이면 Kill Switch 즉시 발동. 점수 무관 Strong Sell 강제.
- 현금 런웨이가 제공된 경우 D1-1 채점에 반드시 사용. 분기 단위로 제공되므로 4로 나눠 연 단위로 환산.
- 발행주식수 YoY 변화율이 제공된 경우 D1-2 채점에 반드시 사용.
- D1-2 채점 기준: 0% → 12점 / 0~3% → 9점 / 3~8% → 5점 / 8~15% → 2점 / 15%+ → 0점
- D1-3 자금 조달 가능성은 최근 뉴스에서 전략적 투자자·정부 계약·파트너십 언급을 찾아 채점.
- D2-1 마일스톤은 뉴스에서 FDA 승인·FAA 인증·상용 비행·대형 계약 등 구체적 이벤트를 찾아 채점.
- D2-2 기술 검증은 peer-reviewed 논문·정부 인증·대형 기업 파트너십으로 판단.
- D4-2 업사이드 계산: 보수적 성공 시나리오 기준 (컨센서스 5년 후 매출 × 동종 상장 기업 EV/Sales) ÷ 현재 시총.
  현재 시총이 제공되므로 반드시 수치로 계산할 것. "계산 불가" 처리 금지.
- Pre-Revenue 기업은 매출 기반 지표(EV/Sales 등) 대신 현금·런웨이·마일스톤 중심으로 평가.
Model D 선택 시 추가 지침:
- 대상 섹터 확인: 메모리 반도체·정유·화학·해운·철강·광업·전력 중 해당 섹터 명시.
- D1-1 순부채/EBITDA는 제공된 계산값 사용. 재계산 금지.
- D1-2 이자보상배율이 제공된 경우 반드시 사용.
- D1-4 배당 커버리지: "무배당"이면 5점 자동 부여. 그 외 채점 시 단일 연도 FCF만 보지 말고
  최근 3년 평균 FCF 기준으로 판단할 것. 시클리컬 기업은 단년도 FCF 변동이 크므로 단년 기준 채점 금지.
  3년 평균 FCF ÷ 총배당으로 커버리지 계산. 3년 평균 FCF 데이터가 없으면 현재 값 사용하되 "(단년 추정)" 명시.
- D2-3 재고회전율 YoY가 제공된 경우 반드시 사용하여 채점. N/A면 중간값(2점) 부여.
- D3-2 과거 3년 매출 CAGR은 제공된 fmpRevenueCAGR3Y 또는 revenueCAGR3Y 사용.
- D4-1 EV/EBITDA 역사적 저점 비교 시 섹터별 역사적 평균을 기준으로 판단.
  단순 절대값이 아니라 해당 섹터의 정상 밴드 대비 현재 위치로 채점.
  섹터별 역사적 EV/EBITDA 정상 범위 (사이클 평균):
  정유/통합에너지: 6~12배 (저점 4배, 고점 15배)
  화학: 6~10배 (저점 4배, 고점 12배)
  해운: 4~8배 (저점 2배, 고점 10배)
  철강: 5~9배 (저점 3배, 고점 12배)
  메모리 반도체: 5~10배 (저점 3배, 고점 15배)
  광업/자원: 5~9배 (저점 3배, 고점 12배)
  현재 EV/EBITDA가 해당 섹터 정상 범위 하단이면 8점, 중간이면 4~6점, 상단이면 0~2점으로 채점.
  제공된 EV/EBITDA와 5년 평균 Trailing P/E는 보조 참고.
- D4-2 P/B 역사적 밴드: 제공된 P/B와 섹터 특성 고려.
  (자산집약적 시클리컬은 P/B 1배 이하면 역사적 저점 신호)
- 업계 비용 커브 위치와 공급 구조는 뉴스와 사업 개요 기반으로 판단.
- 구조적 수요 전망은 AI·EV·탈탄소 등 메가트렌드와의 연관성으로 판단.
Model E 선택 시 추가 지침:
- 대상: 은행·보험사. 증권사·핀테크는 비즈니스 모델 확인 후 적용.
- D1-1 ROE 채점 시 제공된 returnOnEquity 값 반드시 사용.
- D1-2 NIM: 뉴스에서 "net interest margin", "NIM", "순이자마진" 수치를 찾아 채점.
  반드시 수치로 명시. 못 찾으면 금리 환경으로 추정하되 "(추정)" 명시.
  추정 시 상한값 부여 금지. 해당 구간 하한 점수 부여.
- D1-3 비이자수익 비중: 뉴스·IR에서 "non-interest income", "fee income" 비중 찾기.
  못 찾으면 사업 구조로 추정하되 보수적으로 채점. 추정으로 만점 금지.
- D2-1 CET1: 뉴스에서 "CET1", "Common Equity Tier 1", "자본비율" 수치 반드시 탐색.
  글로벌 대형 은행은 분기 어닝콜마다 CET1을 발표함.
  찾지 못한 경우에만 중간값(8점) 부여하고 "(뉴스에서 미확인)" 명시.
- D2-2 NPL 커버리지: 뉴스에서 "NPL", "non-performing loan", "coverage ratio",
  "loan loss reserve" 수치 탐색. 못 찾으면 중간값(5점)에 "(미확인)" 명시.
- D2-3 대출 포트폴리오 분산도: 사업 개요에서 리테일·상업·부동산 비중으로 판단.
- D3-1 대출 성장률: 뉴스에서 "loan growth", "대출 성장" 수치 탐색.
  TTM 매출 성장률로 대체 채점 금지. 못 찾으면 "(미확인)"으로 중간값 부여.
- D4-1 Justified P/B 계산값과 현재 P/B 괴리율이 제공됨. 반드시 이 값으로 채점.
  재계산 금지. 괴리율 양수=할증, 음수=할인.
- D4-2 배당수익률은 제공된 dividendYield 사용.
- D5-1 거시 민감도: FRED 금리 데이터로 판단.
  기준금리 하락 사이클이면 NIM 압박으로 -1점 조정.
  기준금리 상승 사이클이면 NIM 확대로 +2점 조정.
  현재 기준금리 방향을 반드시 명시.
Model F 선택 시 추가 지침:
- 대상: 리츠, 인프라, 유틸리티.
- D1-1 AFFO Payout Ratio: 제공된 FFO Payout Ratio를 기준으로 채점.
  FFO는 순이익+D&A 근사값이므로 실제 AFFO보다 높게 나올 수 있음.
  근사값 기준으로 채점하되 "(FFO 근사)" 명시.
- D1-2 배당 성장 이력: 제공된 dividendGrowthYears 반드시 사용.
- D1-3 AFFO 성장률: 제공된 ffoGrowthRate 사용.
  N/A면 뉴스에서 FFO 성장 가이던스 찾아 채점.
- D2-1 가동률: 뉴스·어닝콜에서 "occupancy rate", "가동률" 수치 탐색.
  못 찾으면 섹터 특성으로 추정. "(추정)" 명시. 추정 시 상한값 부여 금지.
- D2-2 임차인 신용도: 사업 개요·뉴스에서 주요 임차인 신용등급 확인.
  투자등급(BBB- 이상) 비중으로 판단.
- D2-3 자산 미래성: 섹터/업종으로 판단.
  데이터센터·물류·통신탑·헬스케어 → 5점 / 주거·산업 → 3점 / 소매·오피스 → 1점.
- D3-1 장기부채 비중: 제공된 longTermDebtRatio 반드시 사용.
- D3-2 차환 리스크: 뉴스·어닝콜에서 만기 구조 언급 탐색.
- D4-1 P/AFFO: 제공된 priceToFfo 참고.
  리츠 섹터 P/FFO 역사적 정상 범위 15~22배.
  현재 P/FFO가 15배 미만이면 할인, 22배 초과면 할증으로 판단.
- D4-2 배당수익률 vs 국채 스프레드: 제공된 dividendToTreasurySpread 반드시 사용.
  300bps+ → 5점 / 150~300bps → 3점 / 50~150bps → 1점 / 50bps 미만 → 0점.
- D5-1 금리 민감도: 제공된 longTermDebtRatio로 판단.
  장기부채 80%+ → 5점 / 60~80% → 3점 / 60% 미만 → 1점.
정성 항목 채점 엄격 기준 (모든 모델 공통):
- 마일스톤 달성: "제품 출시" 또는 "규제 통과"만으로는 만점 불가.
  수익성 있는 매출 달성 또는 명확한 상업적 성과가 확인되어야 15점.
  단순 제품 판매 중이나 적자 지속이면 최대 10점.
- 기술 검증: 규제 통과(FDA·FAA·NHTSA 등)는 7점 기준.
  peer-reviewed 논문·독립 연구기관 검증·대형 기업 공식 채택까지 있어야 10점.
- 파트너십: 단일 대형 파트너 하나만으로는 최대 5점.
  복수의 독립적 파트너십 + 선수금 또는 지분투자 확인 시 7점.
- IP 보호: "보유할 것으로 추정"은 3점.
  실제 등록 특허 수 또는 소송 이력 확인 시 5점.
- 모든 정성 항목에서 "(추정)"으로 판단한 경우
  해당 구간의 하한값을 부여할 것. 상한값 부여 금지.
══════════════════════════════════════════
`.trim();
}