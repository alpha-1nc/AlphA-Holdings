import { prisma } from '@/lib/prisma'

const TOSS_BASE = 'https://openapi.tossinvest.com'

export async function getTossAccessToken(): Promise<string> {
  // 1) DB에서 캐시된 토큰 확인
  const cached = await prisma.brokerToken.findUnique({
    where: { source: 'TOSS' }
  })

  // 만료 5분 전까지는 캐시 사용
  if (cached && cached.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return cached.accessToken
  }

  // 2) 새 토큰 발급
  const res = await fetch(`${TOSS_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.TOSS_CLIENT_ID!,
      client_secret: process.env.TOSS_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`토스 토큰 발급 실패: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  // 3) DB upsert (source당 1행 유지)
  await prisma.brokerToken.upsert({
    where: { source: 'TOSS' },
    create: { source: 'TOSS', accessToken: data.access_token, expiresAt },
    update: { accessToken: data.access_token, expiresAt },
  })

  return data.access_token
}
