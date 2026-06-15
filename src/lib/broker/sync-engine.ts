import { prisma } from '@/lib/prisma'
import { getTossAccounts, getTossHoldings, getTossExchangeRate } from './toss-client'
import { getKisIsaHoldings } from './kis-client'

const PROFILE_ID = process.env.SYNC_PROFILE_ID!

export async function syncHoldings() {
  console.log('[sync] 동기화 시작')
  const usdRate = await getTossExchangeRate()
  console.log(`[sync] 환율: 1 USD = ${usdRate} KRW`)

  // ── 1) 토스 holdings 동기화 ──────────────────────────────
  const accounts = await getTossAccounts()
  const mainAccount = accounts[0] // 종합매매 계좌 (KR+US 통합)

  if (!mainAccount) throw new Error('토스 계좌를 찾을 수 없음')

  const tossData = await getTossHoldings(mainAccount.accountSeq)
  const tossItems: any[] = tossData.items ?? []

  for (const item of tossItems) {
    const isKr = item.marketCountry === 'KR'
    const currency = isKr ? 'KRW' : 'USD'
    const marketValueKrw = isKr
      ? parseFloat(item.marketValue.amount)
      : parseFloat(item.marketValue.amount) * usdRate

    await prisma.holding.upsert({
      where: {
        profileId_source_accountType_ticker: {
          profileId: PROFILE_ID,
          source: 'TOSS',
          accountType: isKr ? 'KR_DIRECT' : 'US_DIRECT',
          ticker: item.symbol,
        },
      },
      create: {
        profileId: PROFILE_ID,
        source: 'TOSS',
        accountType: isKr ? 'KR_DIRECT' : 'US_DIRECT',
        ticker: item.symbol,
        name: item.name,
        marketCountry: item.marketCountry,
        currency,
        quantity: parseFloat(item.quantity),
        avgPrice: parseFloat(item.averagePurchasePrice),
        lastPrice: parseFloat(item.lastPrice),
        marketValue: parseFloat(item.marketValue.amount),
        marketValueKrw,
        profitLoss: parseFloat(item.profitLoss.amount),
        profitLossRate: parseFloat(item.profitLoss.rate),
        dailyProfitLoss: parseFloat(item.dailyProfitLoss.amount),
        syncedAt: new Date(),
      },
      update: {
        name: item.name,
        quantity: parseFloat(item.quantity),
        avgPrice: parseFloat(item.averagePurchasePrice),
        lastPrice: parseFloat(item.lastPrice),
        marketValue: parseFloat(item.marketValue.amount),
        marketValueKrw,
        profitLoss: parseFloat(item.profitLoss.amount),
        profitLossRate: parseFloat(item.profitLoss.rate),
        dailyProfitLoss: parseFloat(item.dailyProfitLoss.amount),
        syncedAt: new Date(),
      },
    })
  }
  console.log(`[sync] 토스 ${tossItems.length}종목 완료`)

  // ── 2) KIS ISA 동기화 ────────────────────────────────────
  const { holdings: kisItems } = await getKisIsaHoldings()

  for (const item of kisItems) {
    if (!item.pdno || parseFloat(item.hldg_qty) === 0) continue

    const marketValue = parseFloat(item.evlu_amt)
    await prisma.holding.upsert({
      where: {
        profileId_source_accountType_ticker: {
          profileId: PROFILE_ID,
          source: 'KIS',
          accountType: 'ISA',
          ticker: item.pdno,
        },
      },
      create: {
        profileId: PROFILE_ID,
        source: 'KIS',
        accountType: 'ISA',
        ticker: item.pdno,
        name: item.prdt_name,
        marketCountry: 'KR',
        currency: 'KRW',
        quantity: parseFloat(item.hldg_qty),
        avgPrice: parseFloat(item.pchs_avg_pric),
        lastPrice: parseFloat(item.prpr),
        marketValue,
        marketValueKrw: marketValue,
        profitLoss: parseFloat(item.evlu_pfls_amt),
        profitLossRate: parseFloat(item.evlu_pfls_rt) / 100,
        syncedAt: new Date(),
      },
      update: {
        name: item.prdt_name,
        quantity: parseFloat(item.hldg_qty),
        avgPrice: parseFloat(item.pchs_avg_pric),
        lastPrice: parseFloat(item.prpr),
        marketValue,
        marketValueKrw: marketValue,
        profitLoss: parseFloat(item.evlu_pfls_amt),
        profitLossRate: parseFloat(item.evlu_pfls_rt) / 100,
        syncedAt: new Date(),
      },
    })
  }
  console.log(`[sync] KIS ISA ${kisItems.length}종목 완료`)

  // ── 3) 일별 스냅샷 적재 ──────────────────────────────────
  await saveSnapshot(usdRate)

  console.log('[sync] 동기화 완료')
  return { tossCount: tossItems.length, kisCount: kisItems.length, usdRate }
}

async function saveSnapshot(usdRate: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 전체 holding 합산
  const holdings = await prisma.holding.findMany({ where: { profileId: PROFILE_ID } })
  const totalValueKrw = holdings.reduce((sum, h) => sum + h.marketValueKrw, 0)

  // 누적 순납입 (ProfileInvestment 합산)
  const cashFlows = await prisma.profileInvestment.findMany({ where: { profileId: PROFILE_ID } })
  const netCashFlowKrw = cashFlows.reduce((sum, cf) => sum + cf.amountKrw, 0)

  const positions = holdings.map(h => ({
    ticker: h.ticker,
    source: h.source,
    accountType: h.accountType,
    currency: h.currency,
    quantity: h.quantity,
    lastPrice: h.lastPrice,
    marketValueKrw: h.marketValueKrw,
    profitLossRate: h.profitLossRate,
  }))

  await prisma.portfolioSnapshot.upsert({
    where: { profileId_date: { profileId: PROFILE_ID, date: today } },
    create: { profileId: PROFILE_ID, date: today, totalValueKrw, netCashFlowKrw, usdRate, positions },
    update: { totalValueKrw, netCashFlowKrw, usdRate, positions, syncedAt: new Date() },
  })

  console.log(`[sync] 스냅샷 저장: ${today.toISOString().slice(0, 10)}, 총 ${Math.round(totalValueKrw / 10000)}만원`)
}
