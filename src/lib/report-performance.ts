import type { NewInvestment } from "@/generated/prisma";
import { monthPeriodLabelsInQuarter, previousQuarterEndMonthPeriodLabel } from "@/lib/report-period";

/**
 * 누적 투입 원금(totalInvestedKrw) 대비 평가(totalCurrentKrw) 손익.
 * 신규 납입은 원금에 이미 포함되므로 별도 차감하지 않는다.
 */
export function computeGainKrw(totalCurrentKrw: number, totalInvestedKrw: number): number {
  return totalCurrentKrw - totalInvestedKrw;
}

/** 누적 원금 대비 수익률(%) — 분모 0이면 0 */
export function computeReturnRatePercent(totalCurrentKrw: number, totalInvestedKrw: number): number {
  if (totalInvestedKrw <= 0) return 0;
  return (computeGainKrw(totalCurrentKrw, totalInvestedKrw) / totalInvestedKrw) * 100;
}

/** 리포트에 연결된 신규 투입 행의 원화 합계 */
export function sumNewInvestmentKrw(newInvestments?: NewInvestment[] | null): number {
  if (!newInvestments?.length) return 0;
  return newInvestments.reduce((s, row) => s + (row.krwAmount ?? 0), 0);
}

type IntervalReportSlice = {
  periodLabel: string;
  totalCurrentKrw: number | null;
  newInvestments?: NewInvestment[] | null;
};

/**
 * 과거→최신 정렬된 리포트 배열에서, 인덱스 i의 구간 손익.
 * 구간 수익금 = 당기 평가금 − (전기 평가금 + 당기 신규 투입 합계)
 * 구간 수익률(%) = 구간 수익금 / (전기 평가금 + 당기 신규 투입 합계) × 100
 * 첫 리포트(i=0)는 비교할 전기 스냅샷이 없으므로 구간 수익·수익률을 0으로 둔다(최초 입력을 수익으로 보지 않음).
 */
function deriveSequentialIntervalPerformance(
  reports: IntervalReportSlice[],
  index: number
): { intervalGainKrw: number; intervalReturnRatePercent: number } {
  if (index === 0) {
    return { intervalGainKrw: 0, intervalReturnRatePercent: 0 };
  }
  const current = reports[index];
  const prevEval = reports[index - 1].totalCurrentKrw ?? 0;
  const periodNewInflowKrw = sumNewInvestmentKrw(current.newInvestments);
  const basis = prevEval + periodNewInflowKrw;
  const intervalGainKrw = (current.totalCurrentKrw ?? 0) - basis;
  const intervalReturnRatePercent = basis > 0 ? (intervalGainKrw / basis) * 100 : 0;
  return { intervalGainKrw, intervalReturnRatePercent };
}

/** 월별 아카이브 카드용: 당월 수익금·당월 수익률(%) */
export function deriveMonthlyIntervalPerformance(
  reports: IntervalReportSlice[],
  index: number
): { intervalGainKrw: number; intervalReturnRatePercent: number } {
  return deriveSequentialIntervalPerformance(reports, index);
}

/** 분기별 아카이브 카드용: 분기 수익금·분기 수익률(%) (당분기 리포트의 신규 투입 합계 = 분기 3개월치 합으로 가정) */
export function deriveQuarterlyIntervalPerformance(
  reports: IntervalReportSlice[],
  index: number
): { intervalGainKrw: number; intervalReturnRatePercent: number } {
  return deriveSequentialIntervalPerformance(reports, index);
}

/**
 * 월별 리포트(과거→최신)와 현재 연월(YYYY-MM) 기준, 전분기 말 평가금 + 당분기 해당 월까지 신규 납입을
 * 분모로 한 분기 누적 구간 수익금·수익률(해당 월 리포트의 평가금 기준).
 */
export function deriveQuarterToDateFromMonthlyReports(
  reports: IntervalReportSlice[],
  currentPeriodLabel: string
): { intervalGainKrw: number; intervalReturnRatePercent: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(currentPeriodLabel);
  if (!m) return { intervalGainKrw: 0, intervalReturnRatePercent: 0 };
  const year = Number(m[1]);
  const month = Number(m[2]);
  const quarter = Math.ceil(month / 3);
  const monthsInQ = monthPeriodLabelsInQuarter(year, quarter);
  const prevQEnd = previousQuarterEndMonthPeriodLabel(year, quarter);

  const byLabel = new Map(reports.map((r) => [r.periodLabel, r]));
  const prevReport = byLabel.get(prevQEnd);
  const prevEval = prevReport ? (prevReport.totalCurrentKrw ?? 0) : 0;

  let sumNew = 0;
  for (const pl of monthsInQ) {
    if (pl > currentPeriodLabel) break;
    const r = byLabel.get(pl);
    if (r) sumNew += sumNewInvestmentKrw(r.newInvestments);
  }
  const current = byLabel.get(currentPeriodLabel);
  if (!current) return { intervalGainKrw: 0, intervalReturnRatePercent: 0 };

  const basis = prevEval + sumNew;
  const intervalGainKrw = (current.totalCurrentKrw ?? 0) - basis;
  const intervalReturnRatePercent = basis > 0 ? (intervalGainKrw / basis) * 100 : 0;
  return { intervalGainKrw, intervalReturnRatePercent };
}
