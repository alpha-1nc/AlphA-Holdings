"use server";

import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { buildAiAnalysisInput, type ReportWithItems } from "@/lib/ai-rule-engine";
import { getReportsByProfileAndType } from "./reports";
import { computeGainKrw, computeReturnRatePercent, sumNewInvestmentKrw } from "@/lib/report-performance";

const AI_OUTPUT_SCHEMA = z.object({
  monthlySummary: z.string().describe("현재 포트폴리오 상태 요약 (3문장 이내)"),
  monthlyChange: z.string().describe("이전 대비 변화 설명 (3문장 이내, 이전 데이터 없으면 '이전 데이터 없음' 등 간단히)"),
  nextAction: z.string().describe("규칙 기반 다음 액션 제안 (3문장 이내, 매수/매도 단정 금지)"),
});

/** 분기별(포트폴리오 데이터 있음) — 기존 로직 유지 */
const SYSTEM_PROMPT_WITH_DATA = `너는 객관적이고 냉정하게 수치만 판단하는 분석가다. 과장되거나 허황된 말은 절대 하지 마라.
절대 매수/매도를 단정하지 마라. "매수하라", "매도하라", "사야 한다", "팔아야 한다" 등 투자 권유 표현을 사용하지 마라.

[공통 규칙]
제공된 JSON 플래그만 보고 현재 상태 요약, 변화, 다음 액션(규칙 기반)을 각각 3문장 이내 한국어로 작성하라.
다음 액션은 "비중 점검", "목표 대비 확인", "집중도 검토" 등 객관적 점검 사항만 언급하라.

절대 규칙: 현금(Cash)은 전략 분류 대상이 아니다. "cashHoldingKrw" 필드가 있다면 이는 포트폴리오 내 현금 보유액이다.`;

/** 월별(포트폴리오·평가 스냅샷 없음) — Journal + 당월 현금흐름 합계 기반 */
const SYSTEM_PROMPT_NO_DATA = `너는 거시 경제와 사용자의 투자 일지를 분석하는 객관적인 시황 분석가다.
이 리포트에는 세부 종목·평가금 스냅샷이 없다.

절대 규칙: "데이터가 없다"거나 "알 수 없다"는 변명을 출력하지 마라.
제공된 '당월 신규 투자금 합계(원화, 입출금 반영)'와 사용자가 쓴 'Journal(증시 요약, 느낀 점)'만 팩트로 삼아 다음 3가지를 작성해라. 수익률·평가금 필드가 없으면 수익을 단정하지 말 것.

1. 이번 달 해석: '증시 요약'과 당월 현금흐름 합계를 바탕으로 이번 달 시장·자금 흐름을 3문장 이내로 요약할 것.
2. 지난달 대비 변화: 전달된 이전 리포트 요약이 있으면 참고하고, 없으면 이번 달 기록만으로 간단히 1문장 서술할 것(수익 단정 금지).
3. 다음 액션 제안: '느낀 점'을 분석하여 다음 달 대응을 위한 매크로 관점의 객관적 조언을 3문장 이내로 제공할 것.`;

/**
 * 리포트 ID와 프로필 ID로 AI 분석 코멘트를 생성하고 DB에 저장합니다.
 */
export async function generateReportAiComment(reportId: number, profileId: string) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const currentReport = await prisma.report.findUnique({
    where: { id: reportId },
    include: { portfolioItems: true, newInvestments: true },
  });

  if (!currentReport) {
    throw new Error(`리포트를 찾을 수 없습니다: ${reportId}`);
  }

  const strategies = await prisma.portfolioStrategy.findMany({
    where: { profileId },
    orderBy: { createdAt: "asc" },
  });

  const reports = await getReportsByProfileAndType(
    currentReport.profile,
    currentReport.type
  );

  const currentIndex = reports.findIndex((r) => r.id === reportId);
  const previousReport: ReportWithItems | null =
    currentIndex > 0 ? (reports[currentIndex - 1] as ReportWithItems) : null;

  const flags = buildAiAnalysisInput(
    currentReport as ReportWithItems,
    previousReport,
    strategies
  );

  const isMonthly = currentReport.type === "MONTHLY";
  const monthlyNewInvKrw = sumNewInvestmentKrw(currentReport.newInvestments);

  let gain = 0;
  let returnRatePct = 0;
  let prevReturnRate: number | null = null;
  let prevGainKrw: number | null = null;

  if (!isMonthly) {
    const curInv = currentReport.totalInvestedKrw ?? 0;
    const curCur = currentReport.totalCurrentKrw ?? 0;
    gain = computeGainKrw(curCur, curInv);
    returnRatePct = computeReturnRatePercent(curCur, curInv);
    if (previousReport) {
      const pInv = previousReport.totalInvestedKrw ?? 0;
      const pCur = previousReport.totalCurrentKrw ?? 0;
      prevGainKrw = computeGainKrw(pCur, pInv);
      prevReturnRate = pInv > 0 ? computeReturnRatePercent(pCur, pInv) : null;
    }
  }

  const hasPortfolioData = flags.hasPortfolioData === true;

  // 현금 보유액 (AI에게 현금 존재를 명시적으로 알려주기 위해 별도 필드로 전달)
  const cashHoldingKrw = (currentReport.portfolioItems ?? [])
    .filter(
      (i) =>
        i.accountType === "CASH" ||
        (i.ticker ?? "").includes("현금") ||
        (i.ticker ?? "").includes("💵") ||
        /^(KRW|USD|JPY|EUR|GBP|CNY|CASH|현금)$/i.test((i.ticker ?? "").trim())
    )
    .reduce((s, i) => s + i.krwAmount, 0);

  const payload = {
    ...flags,
    ...(isMonthly
      ? {
          monthlyNewInvestmentKrw: monthlyNewInvKrw,
          returnRate: null as number | null,
          gainKrw: null as number | null,
          totalInvestedKrw: null as number | null,
          totalCurrentKrw: null as number | null,
        }
      : {
          returnRate: returnRatePct,
          gainKrw: gain,
          totalInvestedKrw: currentReport.totalInvestedKrw ?? 0,
          totalCurrentKrw: currentReport.totalCurrentKrw ?? 0,
        }),
    ...(cashHoldingKrw > 0 && { cashHoldingKrw }),
    ...(prevReturnRate != null && !isMonthly && { prevReturnRate, prevGainKrw }),
    journal: {
      summary: currentReport.summary ?? "",
      journal: currentReport.journal ?? "",
      strategy: currentReport.strategy ?? "",
    },
  };

  const systemPrompt = hasPortfolioData ? SYSTEM_PROMPT_WITH_DATA : SYSTEM_PROMPT_NO_DATA;

  // AI에게 보내기 전 최종 정리 — 값과 무관하게 hasUnassignedHoldings 키 자체를 제거
  // (티커 매칭이 불완전하여 오탐이 발생할 수 있으므로, 미분류 개념을 AI가 아예 볼 수 없도록 차단)
  const aiPayload = { ...payload };
  delete aiPayload.hasUnassignedHoldings;

  const userPrompt = hasPortfolioData
    ? `다음 규칙 엔진 플래그를 바탕으로 요약을 작성하라. 각 필드는 3문장 이내 한국어로.

데이터:
${JSON.stringify(aiPayload, null, 2)}`
    : `다음 데이터를 바탕으로 시황 분석을 작성하라. 각 필드는 지정된 분량을 지킬 것.

데이터:
${JSON.stringify(aiPayload, null, 2)}`;

  const { output } = await generateText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    prompt: userPrompt,
    output: Output.object({
      schema: AI_OUTPUT_SCHEMA,
      name: "ReportAiComment",
      description: "포트폴리오 AI 분석 결과",
    }),
  });

  const inputJson = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;

  const comment = await prisma.reportAiComment.upsert({
    where: { reportId },
    create: {
      reportId,
      monthlySummary: output.monthlySummary,
      monthlyChange: output.monthlyChange,
      nextAction: output.nextAction,
      inputJson,
    },
    update: {
      monthlySummary: output.monthlySummary,
      monthlyChange: output.monthlyChange,
      nextAction: output.nextAction,
      inputJson,
    },
  });

  return comment;
}
