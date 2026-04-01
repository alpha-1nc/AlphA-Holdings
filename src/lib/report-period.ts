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
