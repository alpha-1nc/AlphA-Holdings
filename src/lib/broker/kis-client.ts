import { getKisAccessToken } from './kis-token'

const KIS_BASE = 'https://openapi.koreainvestment.com:9443'

async function kisGet(path: string, headers: Record<string, string>, params: Record<string, string>) {
  const token = await getKisAccessToken()
  const url = new URL(`${KIS_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'authorization': `Bearer ${token}`,
      'appkey': process.env.KIS_APP_KEY!,
      'appsecret': process.env.KIS_APP_SECRET!,
      ...headers,
    },
  })
  if (!res.ok) throw new Error(`KIS API 오류 ${res.status}: ${path}`)
  return res.json()
}

// ISA 잔고 조회 (TTTC8434R)
export async function getKisIsaHoldings() {
  const data = await kisGet(
    '/uapi/domestic-stock/v1/trading/inquire-balance',
    { tr_id: 'TTTC8434R', custtype: 'P' },
    {
      CANO: process.env.KIS_CANO!,
      ACNT_PRDT_CD: process.env.KIS_ACNT_PRDT_CD!,
      AFHR_FLPR_YN: 'N',
      OFL_YN: '',
      INQR_DVSN: '00',
      UNPR_DVSN: '01',
      FUND_STTL_ICLD_YN: 'N',
      FNCG_AMT_AUTO_RDPT_YN: 'N',
      PRCS_DVSN: '00',
      CTX_AREA_FK100: '',
      CTX_AREA_NK100: '',
    }
  )

  if (data.rt_cd !== '0') {
    throw new Error(`KIS 잔고조회 실패: ${data.msg1}`)
  }

  return {
    holdings: data.output1 as any[],   // 종목별
    summary: data.output2?.[0] as any, // 계좌 요약
  }
}
