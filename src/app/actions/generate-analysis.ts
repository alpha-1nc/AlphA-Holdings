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
     일반(A·B·D·E·F): 80+→Strong Buy / 65+→Buy / 45+→Hold / 30+→Sell / 미만→Strong Sell
     Model C 전용:    80+→Strong Buy / 65+→Buy / 50+→Hold / 35+→Sell / 미만→Strong Sell
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
══════════════════════════════════════════
`.trim();
}