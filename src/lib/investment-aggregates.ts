import { parseReportPeriodEndDate } from "@/lib/report-period";

/** "2026-Q1" → year, quarter */
export function parseQuarterlyPeriodYearQuarter(periodLabel: string): {
  year: number;
  quarter: number;
} | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(periodLabel.trim());
  if (!m) return null;
  return { year: Number(m[1]), quarter: Number(m[2]) };
}

/** 분기 경계 내 날짜(신규 납입 `Investment.date`)별 집계 키: "2026-Q1" */
export function quarterlyKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const month = d.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `${y}-Q${quarter}`;
}

export function quarterInclusiveDateBounds(
  year: number,
  quarter: number,
): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = parseReportPeriodEndDate(`${year}-Q${quarter}`);
  return { start, end };
}

/** Investment 행 목록으로 분기 키(YYYY-Qn)별 합계 맵 생성 */
export function buildInvestmentSumByQuarterKey(
  rows: Iterable<{ date: Date; amountKrw: number }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = quarterlyKeyFromDate(row.date);
    map.set(key, (map.get(key) ?? 0) + row.amountKrw);
  }
  return map;
}
