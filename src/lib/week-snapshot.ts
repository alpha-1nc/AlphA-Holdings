/** ISO 주 기준 — 해당 주 월요일 00:00 (로컬) */
export function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** 차트 X축 라벨 — M/D */
export function formatWeekChartLabel(weekMonday: Date): string {
  return `${weekMonday.getMonth() + 1}/${weekMonday.getDate()}`;
}

/** 툴팁·캡션 — YYYY.M.D 주차 */
export function formatWeekTooltipLabel(weekMonday: Date): string {
  const y = weekMonday.getFullYear();
  const m = weekMonday.getMonth() + 1;
  const d = weekMonday.getDate();
  return `${y}.${m}.${d} 주`;
}

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 차트 툴팁 — Week of Jun 8 */
export function formatWeekOfEn(date: Date): string {
  const monday = getWeekMonday(date);
  return `Week of ${EN_MONTHS[monday.getMonth()]} ${monday.getDate()}`;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** 차트 툴팁 — This week / 1 week ago / 2 weeks ago */
export function formatWeeksAgoEn(date: Date, referenceDate: Date = new Date()): string {
  const weekMonday = getWeekMonday(date);
  const refMonday = getWeekMonday(referenceDate);
  const diffWeeks = Math.round((refMonday.getTime() - weekMonday.getTime()) / MS_PER_WEEK);

  if (diffWeeks <= 0) return "This week";
  if (diffWeeks === 1) return "1 week ago";
  return `${diffWeeks} weeks ago`;
}

/** 차트 툴팁 — Jun 8 – Jun 14 */
export function formatWeekRangeEn(date: Date): string {
  const start = getWeekMonday(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = `${EN_MONTHS[start.getMonth()]} ${start.getDate()}`;
  const endLabel = `${EN_MONTHS[end.getMonth()]} ${end.getDate()}`;
  return `${startLabel} – ${endLabel}`;
}
