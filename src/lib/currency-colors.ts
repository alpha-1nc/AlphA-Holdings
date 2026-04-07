/**
 * 원형(도넛) 차트 슬라이스용 통화 색만 — 달러·원화·엔.
 * (텍스트/UI 전역에는 사용하지 않음)
 */
export const CURRENCY_HEX = {
    USD: "#15803d",
    KRW: "#eab308",
    JPY: "#be123c",
} as const;

export function hexForCurrencyCode(code: string): string {
    const c = code.trim().toUpperCase();
    if (c === "USD") return CURRENCY_HEX.USD;
    if (c === "JPY") return CURRENCY_HEX.JPY;
    return CURRENCY_HEX.KRW;
}

/** "USD 현금" 등 캐시 슬라이스 라벨 → 색 (대시보드 도넛) */
export function hexForCashSliceLabel(label: string): string {
    if (label.includes("USD")) return CURRENCY_HEX.USD;
    if (label.includes("JPY")) return CURRENCY_HEX.JPY;
    return CURRENCY_HEX.KRW;
}
