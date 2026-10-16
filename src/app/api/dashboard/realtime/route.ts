import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcAccountCapital, calcDepositsByAccountType } from '@/lib/calcCapital'
import {
  computeBrokerCostBasisMetrics,
  filterValuedHoldings,
  hasKnownCostBasis,
  holdingProfitLossKrw,
} from '@/lib/profit'
import { AccountType } from '@/generated/prisma'

const ALL_ACCOUNT_TYPES: AccountType[] = [
  'US_DIRECT',
  'KR_DIRECT',
  'JP_DIRECT',
  'ISA',
  'PENSION',
  'CASH',
]

export async function GET() {
  const profileId = process.env.SYNC_PROFILE_ID!

  const holdings = await prisma.holding.findMany({ where: { profileId } })

  const { totalValueKrw, totalProfitKrw, totalPurchaseCostKrw, totalProfitRate } =
    computeBrokerCostBasisMetrics(holdings)

  // 총 납입액(IC + PI) — 수익률 분모와 별도
  const [totalDepositsKrw, depositsByAccountType] = await Promise.all([
    calcAccountCapital(profileId, ALL_ACCOUNT_TYPES, ''),
    calcDepositsByAccountType(profileId),
  ])

  // 일간 손익 합산
  const dailyProfitKrw = holdings.reduce((sum, h) => {
    if (!h.dailyProfitLoss) return sum
    if (h.currency === 'KRW') return sum + h.dailyProfitLoss
    const rate = h.marketValue > 0 ? h.marketValueKrw / h.marketValue : 1
    return sum + h.dailyProfitLoss * rate
  }, 0)

  // 마지막 동기화 시각
  const lastSynced = holdings.length > 0
    ? holdings.reduce((latest, h) => h.syncedAt > latest ? h.syncedAt : latest, holdings[0].syncedAt)
    : null

  // 계좌별 평가금·매입원가 (원가 미입력 연금은 평가금만 집계)
  const valuedHoldings = filterValuedHoldings(holdings)
  const byAccount = valuedHoldings.reduce((acc, h) => {
    if (!acc[h.accountType]) {
      acc[h.accountType] = { valueKrw: 0, purchaseCostKrw: 0, profitKrw: 0 }
    }
    acc[h.accountType].valueKrw += h.marketValueKrw
    if (hasKnownCostBasis(h)) {
      const profitKrw = holdingProfitLossKrw(h)
      acc[h.accountType].profitKrw += profitKrw
      acc[h.accountType].purchaseCostKrw += h.marketValueKrw - profitKrw
    }
    return acc
  }, {} as Record<string, { valueKrw: number; purchaseCostKrw: number; profitKrw: number }>)

  return NextResponse.json({
    totalValueKrw,
    totalCostKrw: totalPurchaseCostKrw,
    totalDepositsKrw,
    totalProfitKrw,
    totalProfitRate,
    dailyProfitKrw,
    lastSynced,
    byAccount,
    depositsByAccountType,
    holdingCount: holdings.length,
  })
}
