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

function parseOptionalNumber(value: unknown): number | null {
  if (value == null || String(value).trim() === '') return null
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

function hasCostBasis(quantity: number, avgPrice: number): boolean {
  return quantity > 0 && avgPrice > 0
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

  if (!ticker?.trim() || !accountType || marketValueKrw == null) {
    return NextResponse.json({ ok: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  if (accountType !== 'PENSION' && accountType !== 'CASH') {
    return NextResponse.json({ ok: false, error: '수동 항목은 연금저축 또는 현금만 가능합니다.' }, { status: 400 })
  }

  const mvk = parseFloat(String(marketValueKrw))
  if (!Number.isFinite(mvk) || mvk < 0) {
    return NextResponse.json({ ok: false, error: '평가금액이 올바르지 않습니다.' }, { status: 400 })
  }

  const qtyParsed = parseOptionalNumber(quantity)
  const avgParsed = parseOptionalNumber(avgPrice)
  const qty = qtyParsed ?? 0
  const avg = avgParsed ?? 0

  let profitLoss: number | null = null
  let profitLossRate: number | null = null
  let lastPrice = 0

  if (hasCostBasis(qty, avg)) {
    const cost = qty * avg
    profitLoss = mvk - cost
    profitLossRate = cost > 0 ? profitLoss / cost : 0
    lastPrice = qty > 0 ? mvk / qty : avg
  }

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
      profitLossRate,
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
      profitLossRate,
      manualNote: manualNote?.trim() || null,
      syncedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const profileId = process.env.SYNC_PROFILE_ID!
  const body = await req.json()
  const { id } = body as { id?: string }

  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: '삭제할 항목 ID가 필요합니다.' }, { status: 400 })
  }

  const existing = await prisma.holding.findFirst({
    where: { id, profileId, source: 'MANUAL' },
  })

  if (!existing) {
    return NextResponse.json({ ok: false, error: '수동 보유 항목을 찾을 수 없습니다.' }, { status: 404 })
  }

  await prisma.holding.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
