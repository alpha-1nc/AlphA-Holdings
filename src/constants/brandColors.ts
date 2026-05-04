/**
 * 티커 브랜드 컬러 - ticker-metadata.ts 기반 re-export
 * (하위 호환용: 기존 import 경로 유지)
 */
import { getTickerColor as _getTickerColor } from "@/lib/ticker-metadata";

export { FALLBACK_COLORS } from "@/lib/ticker-metadata";

/**
 * 순번 `index`(0…)만 사용 — 종목 문자열 무시. `fillForPortfolioOrdinalSlice`와 동일 규칙.
 */
export function getTickerColor(ticker: string, index: number): string {
    return _getTickerColor(ticker, index);
}
