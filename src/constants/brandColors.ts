/**
 * 티커 브랜드 컬러 - ticker-metadata.ts 기반 re-export
 * (하위 호환용: 기존 import 경로 유지)
 */
import { getTickerColor as _getTickerColor } from "@/lib/ticker-metadata";

export { FALLBACK_COLORS } from "@/lib/ticker-metadata";

/**
 * 티커에 맞는 브랜드 컬러 반환. 없으면 폴백 배열에서 자동 할당
 * @param ticker - 종목 티커 (대소문자 무관)
 * @param index - 폴백 시 사용할 순서 인덱스
 */
export function getTickerColor(ticker: string, index: number): string {
    return _getTickerColor(ticker, index);
}
