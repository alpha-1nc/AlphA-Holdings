import { prisma } from '@/lib/prisma'

const KIS_BASE = 'https://openapi.koreainvestment.com:9443'

export async function getKisAccessToken(): Promise<string> {
  const cached = await prisma.brokerToken.findUnique({
    where: { source: 'KIS' }
  })

  if (cached && cached.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return cached.accessToken
  }

  const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY!,
      appsecret: process.env.KIS_APP_SECRET!,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`KIS 토큰 발급 실패: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`KIS 토큰 없음: ${JSON.stringify(data)}`)
  }

  // KIS 토큰 만료: expires_in(초) 또는 기본 24시간
  const expiresIn = data.expires_in ?? 86400
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  await prisma.brokerToken.upsert({
    where: { source: 'KIS' },
    create: { source: 'KIS', accessToken: data.access_token, expiresAt },
    update: { accessToken: data.access_token, expiresAt },
  })

  return data.access_token
}
