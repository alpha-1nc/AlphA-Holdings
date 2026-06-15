import { getTossAccessToken } from './toss-token'

const TOSS_BASE = 'https://openapi.tossinvest.com'

async function tossGet(path: string, params?: Record<string, string>, accountSeq?: number) {
  const token = await getTossAccessToken()
  const url = new URL(`${TOSS_BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'authorization': `Bearer ${token}`,
  }
  if (accountSeq !== undefined) {
    headers['X-Tossinvest-Account'] = String(accountSeq)
  }

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) throw new Error(`Toss API 오류 ${res.status}: ${path}`)
  return res.json()
}

// 계좌 목록 조회
export async function getTossAccounts() {
  const data = await tossGet('/api/v1/accounts')
  return data.result as Array<{ accountNo: string; accountSeq: number; accountType: string }>
}

// 보유 주식 조회
export async function getTossHoldings(accountSeq: number) {
  const data = await tossGet('/api/v1/holdings', {}, accountSeq)
  return data.result
}

// 환율 조회 (USD/KRW)
export async function getTossExchangeRate(): Promise<number> {
  const data = await tossGet('/api/v1/exchange-rate', {
    baseCurrency: 'USD',
    quoteCurrency: 'KRW',
  })
  return parseFloat(data.result.rate)
}

// 현재가 다건 조회 (최대 200종목)
export async function getTossPrices(symbols: string[]) {
  const data = await tossGet('/api/v1/prices', { symbols: symbols.join(',') })
  return data.result as Array<{ symbol: string; lastPrice: string; currency: string }>
}
