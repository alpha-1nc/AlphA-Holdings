/**
 * 티커 심볼로 로고 URL을 반환하는 유틸리티
 * 1순위: FMP 이미지 URL (API 키 불필요, URL 직접 사용)
 * 2순위: Clearbit (글로벌 기업 도메인 기반)
 * 없으면 null 반환 → UI에서 이니셜 폴백
 */

export function getFmpLogoUrl(ticker: string): string {
  // FMP는 URL만으로 이미지 직접 제공 (API 키 없이도 작동)
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
