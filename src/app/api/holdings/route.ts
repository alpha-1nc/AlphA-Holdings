import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { AccountType } from '@/generated/prisma'

export async function GET() {
  const profileId = process.env.SYNC_PROFILE_ID!
  const holdings = await prisma.holding.findMany({
    where: { profileId },
    orderBy: { marketValueKrw: 'desc' },
  })
  return NextResponse.json({ holdings })
}

export async function POST(req: Request) {
  const profileId = process.env.SYNC_PROFILE_ID!
  const body = await req.json()
  const { ticker, name, accountType, quantity, avgPrice, marketValueKrw, manualNote } = body as {
    ticker?: string
    name?: string
    accountType?: AccountType
    quantity?: number | string
    avgPrice?: number | string
    marketValueKrw?: number | string
    manualNote?: string
  }

  if (!ticker?.trim() || !accountType || quantity == null || marketValueKrw == null) {
    return NextResponse.json({ ok: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  if (accountType !== 'PENSION' && accountType !== 'CASH') {
    return NextResponse.json({ ok: false, error: '수동 항목은 연금저축 또는 현금만 가능합니다.' }, { status: 400 })
  }

  const qty = parseFloat(String(quantity))
  const mvk = parseFloat(String(marketValueKrw))
  const avg = avgPrice != null ? parseFloat(String(avgPrice)) : qty > 0 ? mvk / qty : 0
  const cost = qty * avg
  const profitLoss = mvk - cost
  const lastPrice = qty > 0 ? mvk / qty : avg

  await prisma.holding.upsert({
    where: {
      profileId_source_accountType_ticker: {
        profileId,
        source: 'MANUAL',
        accountType,
        ticker: ticker.trim().toUpperCase(),
      },
    },
    create: {
      profileId,
      source: 'MANUAL',
      accountType,
      ticker: ticker.trim().toUpperCase(),
      name: name?.trim() || ticker.trim(),
      marketCountry: 'KR',
      currency: 'KRW',
      quantity: qty,
      avgPrice: avg,
      lastPrice,
      marketValue: mvk,
      marketValueKrw: mvk,
      profitLoss,
      profitLossRate: cost > 0 ? profitLoss / cost : 0,
      manualNote: manualNote?.trim() || null,
      syncedAt: new Date(),
    },
    update: {
      name: name?.trim() || ticker.trim(),
      quantity: qty,
      avgPrice: avg,
      lastPrice,
      marketValue: mvk,
      marketValueKrw: mvk,
      profitLoss,
      profitLossRate: cost > 0 ? profitLoss / cost : 0,
      manualNote: manualNote?.trim() || null,
      syncedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
