/**
 * 리포트 periodLabel을 구간 끝 시점으로 정렬·비교하기 위한 Date.
 * 월별(YYYY-MM): 해당 월 말일. 분기(YYYY-Qn): 해당 분기 말일.
 */
export function parseReportPeriodEndDate(periodLabel: string): Date {
  if (/^\d{4}-\d{2}$/.test(periodLabel)) {
    const [year, month] = periodLabel.split("-").map(Number);
    return new Date(year, month, 0);
  }
  if (/^\d{4}-Q[1-4]$/.test(periodLabel)) {
    const [yearStr, quarterStr] = periodLabel.split("-Q");
    const year = Number(yearStr);
    const quarter = Number(quarterStr);
    const monthIndex = quarter * 3;
    return new Date(year, monthIndex, 0);
  }
  return new Date();
}

/** "2026-03" → "2026-02" */
export function getPreviousMonthPeriodLabel(periodLabel: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(periodLabel)) return null;
  const [y, m] = periodLabel.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Q1→03, Q2→06, Q3→09, Q4→12 */
export function quarterEndMonthPeriodLabel(year: number, quarter: number): string {
  const month = quarter * 3;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthPeriodLabelsInQuarter(year: number, quarter: number): string[] {
  const start = (quarter - 1) * 3 + 1;
  return [start, start + 1, start + 2].map((m) => `${year}-${String(m).padStart(2, "0")}`);
}

/** 직전 분기 말 연월(YYYY-MM). Q1 직전은 전년 12월 */
export function previousQuarterEndMonthPeriodLabel(year: number, quarter: number): string {
  if (quarter === 1) return `${year - 1}-12`;
  const endMonth = (quarter - 1) * 3;
  return `${year}-${String(endMonth).padStart(2, "0")}`;
}
