import { NextResponse } from 'next/server'
import { syncHoldings } from '@/lib/broker/sync-engine'

// GET /api/cron — 서버 cron(매일 06:00 KST)이 호출하는 EOD 동기화
// 홈서버 crontab 설정: 0 6 * * * curl -X GET http://localhost:3000/api/cron
export async function GET() {
  try {
    const result = await syncHoldings()
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[cron] 실패:', e.message)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
