/**
 * TradingView 종목 페이지 URL.
 * 거래소 코드 없이 티커만으로 열어 404를 줄임 — TV가 심볼을 해석·리다이렉트함.
 * @see https://www.tradingview.com/symbols/NVDA/
 */
export function getTradingViewSymbolUrl(ticker: string): string {
  const symbol = ticker.trim().toUpperCase();
  return `https://www.tradingview.com/symbols/${encodeURIComponent(symbol)}/`;
}
