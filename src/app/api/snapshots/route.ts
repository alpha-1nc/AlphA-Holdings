import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SNAPSHOT_KINDS = new Set(['DAILY', 'WEEKLY'])

export async function GET(req: Request) {
  const profileId = process.env.SYNC_PROFILE_ID!
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '90')
  const kindRaw = (searchParams.get('kind') ?? 'DAILY').toUpperCase()
  const snapshotKind = SNAPSHOT_KINDS.has(kindRaw) ? kindRaw : 'DAILY'

  const since = new Date()
  since.setDate(since.getDate() - days)

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { profileId, snapshotKind, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      totalValueKrw: true,
      totalAssetKrw: true,
      netCashFlowKrw: true,
      positions: true,
      snapshotKind: true,
    },
  })

  return NextResponse.json({ snapshots })
}
