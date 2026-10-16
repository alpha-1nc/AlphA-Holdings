import { prisma } from '../src/lib/prisma'
import { getKisIsaHoldings } from '../src/lib/broker/kis-client'

const PROFILE_ID = process.env.SYNC_PROFILE_ID

async function main() {
  if (!PROFILE_ID) throw new Error('SYNC_PROFILE_ID required')

  const { holdings: kisItems } = await getKisIsaHoldings()
  let updated = 0

  for (const item of kisItems) {
    if (!item.pdno || parseFloat(item.hldg_qty) === 0) continue

    const quantity = parseFloat(item.hldg_qty)
    const marketValue = parseFloat(item.evlu_amt)
    const dailyProfitLoss = parseFloat(item.bfdy_cprs_icdc || '0') * quantity

    await prisma.holding.upsert({
      where: {
        profileId_source_accountType_ticker: {
          profileId: PROFILE_ID,
          source: 'KIS',
          accountType: 'ISA',
          ticker: item.pdno,
        },
      },
      create: {
        profileId: PROFILE_ID,
        source: 'KIS',
        accountType: 'ISA',
        ticker: item.pdno,
        name: item.prdt_name,
        marketCountry: 'KR',
        currency: 'KRW',
        quantity,
        avgPrice: parseFloat(item.pchs_avg_pric),
        lastPrice: parseFloat(item.prpr),
        marketValue,
        marketValueKrw: marketValue,
        profitLoss: parseFloat(item.evlu_pfls_amt),
        profitLossRate: parseFloat(item.evlu_pfls_rt) / 100,
        dailyProfitLoss,
        syncedAt: new Date(),
      },
      update: {
        name: item.prdt_name,
        quantity,
        avgPrice: parseFloat(item.pchs_avg_pric),
        lastPrice: parseFloat(item.prpr),
        marketValue,
        marketValueKrw: marketValue,
        profitLoss: parseFloat(item.evlu_pfls_amt),
        profitLossRate: parseFloat(item.evlu_pfls_rt) / 100,
        dailyProfitLoss,
        syncedAt: new Date(),
      },
    })

    updated++
    console.log(
      `${item.pdno} | 평가 ${marketValue} | 누적손익 ${item.evlu_pfls_amt} | 오늘손익 ${dailyProfitLoss}`,
    )
  }

  console.log(`KIS ISA ${updated}종목 동기화 완료`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
