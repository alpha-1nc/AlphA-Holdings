import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const profileId = process.env.SYNC_PROFILE_ID!

  const holdings = await prisma.holding.findMany({ where: { profileId } })

  // 총 평가금 (원화 합산)
  const totalValueKrw = holdings.reduce((sum, h) => sum + h.marketValueKrw, 0)

  // 총 투자원금 (누적 순납입)
  const cashFlows = await prisma.profileInvestment.findMany({ where: { profileId } })
  const totalCostKrw = cashFlows.reduce((sum, cf) => sum + cf.amountKrw, 0)

  // 누적 수익금 / 수익률
  const totalProfitKrw = totalValueKrw - totalCostKrw
  const totalProfitRate = totalCostKrw > 0 ? totalProfitKrw / totalCostKrw : 0

  // 일간 손익 합산
  const dailyProfitKrw = holdings.reduce((sum, h) => {
    if (!h.dailyProfitLoss) return sum
    if (h.currency === 'KRW') return sum + h.dailyProfitLoss
    // USD → KRW 환산 (marketValueKrw / marketValue 비율 사용)
    const rate = h.marketValue > 0 ? h.marketValueKrw / h.marketValue : 1
    return sum + h.dailyProfitLoss * rate
  }, 0)

  // 마지막 동기화 시각
  const lastSynced = holdings.length > 0
    ? holdings.reduce((latest, h) => h.syncedAt > latest ? h.syncedAt : latest, holdings[0].syncedAt)
    : null

  // 계좌별 합산
  const byAccount = holdings.reduce((acc, h) => {
    if (!acc[h.accountType]) acc[h.accountType] = 0
    acc[h.accountType] += h.marketValueKrw
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({
    totalValueKrw,
    totalCostKrw,
    totalProfitKrw,
    totalProfitRate,
    dailyProfitKrw,
    lastSynced,
    byAccount,
    holdingCount: holdings.length,
  })
}
