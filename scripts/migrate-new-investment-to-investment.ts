/* 순서: load-env → prisma (DATABASE_URL 불일치 방지) */
import "./load-env-before-prisma.ts";

import { parseReportPeriodEndDate } from "../src/lib/report-period";
import { prisma } from "../src/lib/prisma";

/**
 * NewInvestment 행 전부를 Investment로 복사합니다. 기존 Investment가 있으면 중복 방지 위해 종료합니다.
 *
 * 실행: npm run db:migrate-new-investment
 * 또는: npx tsx scripts/migrate-new-investment-to-investment.ts
 *
 * 사전: `npx prisma db push` 후에도 SQLite에 Investment 테이블이 없다면(드리프트) 스키마와 DB를 맞춘 뒤 실행하세요.
 */
async function main() {
  const existingInvestment = await prisma.profileInvestment.count();
  if (existingInvestment > 0) {
    console.log(
      `Investment 테이블에 이미 ${existingInvestment}건이 있습니다. 수동 삭제 후 다시 실행하거나 생략하세요.`,
    );
    process.exit(0);
  }

  const nis = await prisma.newInvestment.findMany({
    include: { report: { select: { periodLabel: true, profile: true } } },
  });

  let n = 0;
  for (const ni of nis) {
    const profile = await prisma.profile.upsert({
      where: { label: ni.report.profile },
      create: { label: ni.report.profile },
      update: {},
    });

    await prisma.profileInvestment.create({
      data: {
        profileId: profile.id,
        sourceReportId: ni.reportId,
        accountType: ni.accountType,
        amountKrw: Math.round(ni.krwAmount),
        date: parseReportPeriodEndDate(ni.report.periodLabel),
        note: null,
      },
    });
    n += 1;
  }

  console.log(`Investment ${n}건 생성 완료 (원본 NewInvestment ${nis.length}건).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
