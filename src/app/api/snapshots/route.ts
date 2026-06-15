import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const profileId = process.env.SYNC_PROFILE_ID!
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '90')

  const since = new Date()
  since.setDate(since.getDate() - days)

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { profileId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { date: true, totalValueKrw: true, netCashFlowKrw: true, positions: true },
  })

  return NextResponse.json({ snapshots })
}
