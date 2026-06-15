import { NextResponse } from 'next/server'
import { syncHoldings } from '@/lib/broker/sync-engine'

// POST /api/sync — 대시보드 "새로고침" 버튼이 호출하는 on-demand 동기화
export async function POST() {
  try {
    const result = await syncHoldings()
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[sync] 실패:', e.message)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
