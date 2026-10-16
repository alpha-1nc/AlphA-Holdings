/** 대시보드 공통 숫자 포매터 (계산 로직 아님 — 표시용) */

/** ₩7,629,323 — 원화 정수 */
export const krwFull = (n: number): string =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(n);

/** 부호 포함 ₩ — +₩564,262 / -₩12,000 */
export const krwSignedFull = (n: number): string => {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${krwFull(Math.abs(n))}`;
};

/** ₩8.90M · ₩890k — 요약용 */
export function krwKm(absKrw: number): string {
  const abs = Math.abs(absKrw);
  if (!Number.isFinite(abs)) return "—";
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `₩${m >= 10 ? m.toFixed(1) : m.toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `₩${k >= 100 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `₩${Math.round(abs).toLocaleString("ko-KR")}`;
}

export function krwKmSigned(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${krwKm(Math.abs(n))}`;
}

/** 차트 축 — 1.2억 · 340만 */
export const krwShort = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (abs >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return String(n);
};

/** +7.99% — 부호 포함 수익률(소수 1자리) */
export function pctSigned(rate: number, digits = 2): string {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(digits)}%`;
}
