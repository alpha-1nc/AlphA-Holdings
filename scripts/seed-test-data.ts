/* 순서: load-env → prisma (DATABASE_URL 불일치 방지) */
import "./load-env-before-prisma.ts";

import {
  AccountType,
  AssetRole,
  Currency,
  ReportStatus,
  ReportType,
} from "../src/generated/prisma";
import { INITIAL_CAPITAL_ACCOUNT_TYPES } from "../src/lib/initial-capital";
import { prisma } from "../src/lib/prisma";
import { parseReportPeriodEndDate } from "../src/lib/report-period";

/**
 * 개발용 SQLite: alpha-ceo / "AlphA Holdings Portfolio" 예시 데이터만 갈아끼웁니다.
 * 다른 프로필(라벨)의 Report·Profile·전략은 삭제하지 않습니다.
 *
 * 실행:
 *   ALLOW_DEV_ALPHA_TEST_SEED=true npx tsx scripts/seed-test-data.ts
 */
const PROFILE_LABEL = "AlphA Holdings Portfolio";
const ALLOW_FLAG = "ALLOW_DEV_ALPHA_TEST_SEED";

const USD_KRW = 1400;
const JPY_PER_100 = 9.2;

function assertSafeToRun(): void {
  if (process.env[ALLOW_FLAG] !== "true") {
    console.error(
      `[seed-test-data] 중단: 로컬 테스트 DB 전용입니다.\n` +
        `  ${ALLOW_FLAG}=true npx tsx scripts/seed-test-data.ts`,
    );
    process.exit(1);
  }
  const url = (process.env.DATABASE_URL ?? "").trim();
  if (!url.startsWith("file:")) {
    console.error(
      "[seed-test-data] 중단: DATABASE_URL이 file: 로컬 SQLite가 아닙니다.",
    );
    process.exit(1);
  }
}

function usdOriginalFromKrw(krw: number): number {
  return Math.round((krw / USD_KRW) * 100) / 100;
}

type NewInvRow = {
  accountType: AccountType;
  originalCurrency: Currency;
  originalAmount: number;
  krwAmount: number;
};

async function syncProfileInvestmentsForReport(
  profileId: string,
  reportId: number,
  periodLabel: string,
  rows: NewInvRow[],
): Promise<void> {
  await prisma.profileInvestment.deleteMany({ where: { sourceReportId: reportId } });
  if (!rows.length) return;
  const date = parseReportPeriodEndDate(periodLabel);
  await prisma.profileInvestment.createMany({
    data: rows.map((row) => ({
      profileId,
      sourceReportId: reportId,
      accountType: row.accountType,
      amountKrw: Math.round(row.krwAmount),
      date,
      note: null,
    })),
  });
}

async function main() {
  assertSafeToRun();

  const profile = await prisma.profile.upsert({
    where: { label: PROFILE_LABEL },
    create: { label: PROFILE_LABEL },
    update: {},
  });
  const profileId = profile.id;

  await prisma.$transaction(async (tx) => {
    await tx.accountInitialCapital.deleteMany({ where: { profileId } });
    await tx.profileInvestment.deleteMany({ where: { profileId } });
    await tx.report.deleteMany({ where: { profile: PROFILE_LABEL } });
    await tx.portfolioStrategy.deleteMany({ where: { profileId } });

    const strategies: Array<{
      ticker: string;
      displayName: string | null;
      role: AssetRole;
      targetWeight: number;
      accountType: AccountType;
    }> = [
      { ticker: "GOOGL", displayName: null, role: AssetRole.CORE, targetWeight: 35, accountType: AccountType.US_DIRECT },
      { ticker: "META", displayName: null, role: AssetRole.GROWTH, targetWeight: 35, accountType: AccountType.US_DIRECT },
      { ticker: "UNH", displayName: null, role: AssetRole.DEFENSIVE, targetWeight: 30, accountType: AccountType.US_DIRECT },
      { ticker: "360750", displayName: "TIGER S&P500", role: AssetRole.INDEX, targetWeight: 70, accountType: AccountType.ISA },
      { ticker: "379800", displayName: "KODEX 나스닥100", role: AssetRole.INDEX, targetWeight: 30, accountType: AccountType.ISA },
      { ticker: "379810", displayName: "KODEX US NASDAQ100", role: AssetRole.INDEX, targetWeight: 80, accountType: AccountType.PENSION },
      { ticker: "245710", displayName: "ACE 베트남VN30", role: AssetRole.GROWTH, targetWeight: 20, accountType: AccountType.PENSION },
    ];

    await tx.portfolioStrategy.createMany({
      data: strategies.map((s) => ({
        profileId,
        ticker: s.ticker,
        displayName: s.displayName,
        role: s.role,
        targetWeight: s.targetWeight,
        accountType: s.accountType,
      })),
    });

    const initialCapitalByAccount: Partial<Record<(typeof INITIAL_CAPITAL_ACCOUNT_TYPES)[number], number>> = {
      US_DIRECT: 3_000_000,
      ISA: 500_000,
      PENSION: 300_000,
      KR_DIRECT: 0,
      JP_DIRECT: 0,
    };

    const q3Items = [
      { ticker: "GOOGL", displayName: null, sector: "Communication Services", role: AssetRole.CORE, accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(1_850_000), krwAmount: 1_850_000 },
      { ticker: "META", displayName: null, sector: "Communication Services", role: AssetRole.GROWTH, accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(1_650_000), krwAmount: 1_650_000 },
      { ticker: "UNH", displayName: null, sector: "Healthcare", role: AssetRole.DEFENSIVE, accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(1_100_000), krwAmount: 1_100_000 },
      { ticker: "360750", displayName: "TIGER S&P500", sector: null, role: AssetRole.INDEX, accountType: AccountType.ISA, originalCurrency: Currency.KRW, originalAmount: 350_000, krwAmount: 350_000 },
      { ticker: "379810", displayName: "KODEX US NASDAQ100", sector: null, role: AssetRole.INDEX, accountType: AccountType.PENSION, originalCurrency: Currency.KRW, originalAmount: 190_000, krwAmount: 190_000 },
    ];
    const q3Total = q3Items.reduce((s, i) => s + i.krwAmount, 0);
    const q3New: NewInvRow[] = [
      { accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(500_000), krwAmount: 500_000 },
      { accountType: AccountType.ISA, originalCurrency: Currency.KRW, originalAmount: 100_000, krwAmount: 100_000 },
    ];

    const rQ3 = await tx.report.create({
      data: {
        type: ReportType.QUARTERLY,
        periodLabel: "2025-Q3",
        usdRate: USD_KRW,
        jpyRate: JPY_PER_100,
        totalInvestedKrw: null,
        totalCurrentKrw: q3Total,
        profile: PROFILE_LABEL,
        status: ReportStatus.PUBLISHED,
        summary: "3분기 빅테크·방어 종목 비중을 유지하며 분할 매수를 이어갔습니다.",
        journal: "3분기 빅테크 중심 매수 유지",
        strategy: "다음 분기에도 목표 비중에 맞춰 점진적으로 리밸런싱합니다.",
        earningsReview: "핵심 보유 종목 실적·가이던스를 점검하고 큰 비중 변경은 없이 유지했습니다.",
        createdAt: new Date(2025, 9, 1, 12, 0, 0),
        updatedAt: new Date(2025, 9, 1, 12, 0, 0),
        portfolioItems: { create: q3Items },
        newInvestments: { create: q3New },
      },
    });

    for (const accountType of INITIAL_CAPITAL_ACCOUNT_TYPES) {
      const raw = initialCapitalByAccount[accountType];
      const krwAmount = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
      await tx.accountInitialCapital.upsert({
        where: { profileId_accountType: { profileId, accountType } },
        create: { profileId, accountType, krwAmount, reportId: rQ3.id },
        update: { krwAmount, reportId: rQ3.id },
      });
    }

    const q4Items = [
      { ticker: "GOOGL", displayName: null, sector: "Communication Services", role: AssetRole.CORE, accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(2_100_000), krwAmount: 2_100_000 },
      { ticker: "META", displayName: null, sector: "Communication Services", role: AssetRole.GROWTH, accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(1_900_000), krwAmount: 1_900_000 },
      { ticker: "UNH", displayName: null, sector: "Healthcare", role: AssetRole.DEFENSIVE, accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(1_200_000), krwAmount: 1_200_000 },
      { ticker: "360750", displayName: "TIGER S&P500", sector: null, role: AssetRole.INDEX, accountType: AccountType.ISA, originalCurrency: Currency.KRW, originalAmount: 420_000, krwAmount: 420_000 },
      { ticker: "379810", displayName: "KODEX US NASDAQ100", sector: null, role: AssetRole.INDEX, accountType: AccountType.PENSION, originalCurrency: Currency.KRW, originalAmount: 230_000, krwAmount: 230_000 },
    ];
    const q4Total = q4Items.reduce((s, i) => s + i.krwAmount, 0);
    const q4New: NewInvRow[] = [
      { accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(500_000), krwAmount: 500_000 },
      { accountType: AccountType.ISA, originalCurrency: Currency.KRW, originalAmount: 100_000, krwAmount: 100_000 },
    ];

    await tx.report.create({
      data: {
        type: ReportType.QUARTERLY,
        periodLabel: "2025-Q4",
        usdRate: USD_KRW,
        jpyRate: JPY_PER_100,
        totalInvestedKrw: null,
        totalCurrentKrw: q4Total,
        profile: PROFILE_LABEL,
        status: ReportStatus.PUBLISHED,
        summary: "4분기 헬스케어 노출을 유지하고 환율 변동을 모니터링했습니다.",
        journal: "4분기 헬스케어 비중 유지, 환율 리스크 모니터링",
        strategy: "환율·금리 이벤트에 대비해 방어·코어 비중을 유지합니다.",
        earningsReview: "헬스케어 업종 실적과 해외 노출을 검토했습니다.",
        createdAt: new Date(2026, 0, 1, 12, 0, 0),
        updatedAt: new Date(2026, 0, 1, 12, 0, 0),
        portfolioItems: { create: q4Items },
        newInvestments: { create: q4New },
      },
    });

    const q1Items = [
      { ticker: "GOOGL", displayName: null, sector: "Communication Services", role: AssetRole.CORE, accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(1_950_000), krwAmount: 1_950_000 },
      { ticker: "META", displayName: null, sector: "Communication Services", role: AssetRole.GROWTH, accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(2_050_000), krwAmount: 2_050_000 },
      { ticker: "UNH", displayName: null, sector: "Healthcare", role: AssetRole.DEFENSIVE, accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(1_050_000), krwAmount: 1_050_000 },
      { ticker: "360750", displayName: "TIGER S&P500", sector: null, role: AssetRole.INDEX, accountType: AccountType.ISA, originalCurrency: Currency.KRW, originalAmount: 460_000, krwAmount: 460_000 },
      { ticker: "379810", displayName: "KODEX US NASDAQ100", sector: null, role: AssetRole.INDEX, accountType: AccountType.PENSION, originalCurrency: Currency.KRW, originalAmount: 260_000, krwAmount: 260_000 },
    ];
    const q1Total = q1Items.reduce((s, i) => s + i.krwAmount, 0);
    const q1New: NewInvRow[] = [
      { accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(500_000), krwAmount: 500_000 },
      { accountType: AccountType.ISA, originalCurrency: Currency.KRW, originalAmount: 100_000, krwAmount: 100_000 },
    ];

    await tx.report.create({
      data: {
        type: ReportType.QUARTERLY,
        periodLabel: "2026-Q1",
        usdRate: USD_KRW,
        jpyRate: JPY_PER_100,
        totalInvestedKrw: null,
        totalCurrentKrw: q1Total,
        profile: PROFILE_LABEL,
        status: ReportStatus.PUBLISHED,
        summary: "1분기 조정 구간에서 분할 매수와 현금 비중 조정을 병행했습니다.",
        journal: "1분기 조정장 대응, 현금 비중 소폭 확대",
        strategy: "변동성 확대 시에는 신규 납입 속도를 조절합니다.",
        earningsReview: "주요 종목 실적 발표와 가이던스 변화를 반영했습니다.",
        createdAt: new Date(2026, 3, 1, 12, 0, 0),
        updatedAt: new Date(2026, 3, 1, 12, 0, 0),
        portfolioItems: { create: q1Items },
        newInvestments: { create: q1New },
      },
    });

    const monthly: Array<{
      periodLabel: string;
      writtenAt: Date;
      summary: string;
      journal: string;
      newInv: NewInvRow[];
    }> = [
      {
        periodLabel: "2025-10",
        writtenAt: new Date(2025, 10, 1, 12, 0, 0),
        summary: "2025년 10월 증시 요약 (시드): 분할 매수 위주로 진행.",
        journal: "10월 분할매수 진행",
        newInv: [{ accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(500_000), krwAmount: 500_000 }],
      },
      {
        periodLabel: "2025-11",
        writtenAt: new Date(2025, 11, 1, 12, 0, 0),
        summary: "2025년 11월 증시 요약 (시드): ISA 추가 납입 반영.",
        journal: "11월 ISA 추가 납입",
        newInv: [
          { accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(500_000), krwAmount: 500_000 },
          { accountType: AccountType.ISA, originalCurrency: Currency.KRW, originalAmount: 100_000, krwAmount: 100_000 },
        ],
      },
      {
        periodLabel: "2025-12",
        writtenAt: new Date(2026, 0, 1, 12, 0, 0),
        summary: "2025년 12월 증시 요약 (시드): 연말 포지션 점검.",
        journal: "12월 연말 포지션 정리",
        newInv: [{ accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(500_000), krwAmount: 500_000 }],
      },
      {
        periodLabel: "2026-01",
        writtenAt: new Date(2026, 1, 1, 12, 0, 0),
        summary: "2026년 1월 증시 요약 (시드): 신규 매수 진행.",
        journal: "1월 신규 매수",
        newInv: [
          { accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(500_000), krwAmount: 500_000 },
          { accountType: AccountType.ISA, originalCurrency: Currency.KRW, originalAmount: 100_000, krwAmount: 100_000 },
        ],
      },
      {
        periodLabel: "2026-02",
        writtenAt: new Date(2026, 2, 1, 12, 0, 0),
        summary: "2026년 2월 증시 요약 (시드): 분할 매수 유지.",
        journal: "2월 분할매수 유지",
        newInv: [{ accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(500_000), krwAmount: 500_000 }],
      },
      {
        periodLabel: "2026-03",
        writtenAt: new Date(2026, 3, 1, 12, 0, 0),
        summary: "2026년 3월 증시 요약 (시드): 정기 납입 완료.",
        journal: "3월 납입 완료",
        newInv: [
          { accountType: AccountType.US_DIRECT, originalCurrency: Currency.USD, originalAmount: usdOriginalFromKrw(500_000), krwAmount: 500_000 },
          { accountType: AccountType.ISA, originalCurrency: Currency.KRW, originalAmount: 100_000, krwAmount: 100_000 },
        ],
      },
    ];

    for (const m of monthly) {
      await tx.report.create({
        data: {
          type: ReportType.MONTHLY,
          periodLabel: m.periodLabel,
          usdRate: null,
          jpyRate: null,
          totalInvestedKrw: null,
          totalCurrentKrw: null,
          profile: PROFILE_LABEL,
          status: ReportStatus.PUBLISHED,
          summary: m.summary,
          journal: m.journal,
          strategy: null,
          earningsReview: null,
          createdAt: m.writtenAt,
          updatedAt: m.writtenAt,
          portfolioItems: { create: [] },
          newInvestments: { create: m.newInv },
        },
      });
    }
  });

  const reports = await prisma.report.findMany({
    where: { profile: PROFILE_LABEL },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    select: { id: true, type: true, periodLabel: true, newInvestments: true },
  });

  for (const r of reports) {
    const rows: NewInvRow[] = r.newInvestments.map((ni) => ({
      accountType: ni.accountType,
      originalCurrency: ni.originalCurrency,
      originalAmount: ni.originalAmount,
      krwAmount: ni.krwAmount,
    }));
    await syncProfileInvestmentsForReport(profileId, r.id, r.periodLabel, rows);
  }

  const strategyCount = await prisma.portfolioStrategy.count({ where: { profileId } });
  const ic = await prisma.accountInitialCapital.findMany({ where: { profileId } });
  const invCount = await prisma.profileInvestment.count({ where: { profileId } });
  const qCount = await prisma.report.count({ where: { profile: PROFILE_LABEL, type: ReportType.QUARTERLY } });
  const mCount = await prisma.report.count({ where: { profile: PROFILE_LABEL, type: ReportType.MONTHLY } });

  console.log("\n=== seed-test-data 완료 ===\n");
  console.log(`프로필: ${PROFILE_LABEL} (id: ${profileId})`);
  console.log(`PortfolioStrategy: ${strategyCount}건`);
  console.log("AccountInitialCapital:");
  for (const row of ic) {
    console.log(`  ${row.accountType}: ${Math.round(row.krwAmount).toLocaleString("ko-KR")} KRW`);
  }
  console.log(`Report QUARTERLY: ${qCount}건`);
  console.log(`Report MONTHLY: ${mCount}건`);
  console.log(`ProfileInvestment(동기화): ${invCount}건`);
  console.log("\n리포트 ID·기간 (기간 말 기준 시간순):");
  const allRep = await prisma.report.findMany({
    where: { profile: PROFILE_LABEL },
    select: { id: true, type: true, periodLabel: true, createdAt: true },
  });
  allRep.sort((a, b) => {
    const da = parseReportPeriodEndDate(a.periodLabel).getTime();
    const db = parseReportPeriodEndDate(b.periodLabel).getTime();
    if (da !== db) return da - db;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  for (const x of allRep) {
    console.log(`  #${x.id} ${x.type} ${x.periodLabel}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
