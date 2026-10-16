/**
 * 티커 심볼로 로고 URL을 반환하는 유틸리티
 * UI 기본: public/logos/{TICKER}.png (로컬 우선)
 * watchlist 동기화용 resolveLogoUrl은 레거시 FMP HEAD 검증 유지
 */

/** public/logos/{대문자 티커}.png — Next.js static 경로 */
export function getLocalLogoUrl(ticker: string): string {
  return `/logos/${ticker.trim().toUpperCase()}.png`;
}

/** @deprecated UI 표시에는 getLocalLogoUrl 사용. watchlist resolveLogoUrl 전용 */
export function getFmpLogoUrl(ticker: string): string {
  return `https://financialmodelingprep.com/image-stock/${ticker.toUpperCase()}.png`;
}

/**
 * 서버에서 로고 URL 유효성 검증 후 반환
 * Next.js Server Action 또는 API Route에서 사용
 */
export async function resolveLogoUrl(ticker: string): Promise<string | null> {
  const fmpUrl = getFmpLogoUrl(ticker);
  try {
    const res = await fetch(fmpUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok && res.headers.get("content-type")?.startsWith("image")) {
      return fmpUrl;
    }
  } catch {
    // FMP 실패
  }
  return null;
}
