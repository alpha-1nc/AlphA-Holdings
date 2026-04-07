/**
 * 멀티 분기 테스트 데이터 생성 → 검증 콘솔 출력 → 테스트 데이터만 삭제.
 * 실행: npx ts-node --project tsconfig.json scripts/test-multi-quarter.ts
 * (경로 별칭 문제 시: npx tsx scripts/test-multi-quarter.ts)
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import {
  PrismaClient,
  type AccountType,
  type Currency,
} from "../src/generated/prisma/index.js";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

/** 기존 프로필과 충돌하지 않는 전용 라벨 */
const TEST_PROFILE_LABEL = "__TEST_MULTI_QUARTER__";

const USD_RATE_FOR_ORIGINAL = 1350;

function usdOriginalFromKrw(krw: number): number {
  return Math.round((krw / USD_RATE_FOR_ORIGINAL) * 100) / 100;
}

function sumPortfolioKrwAll(items: { accountType: string; krwAmount: number }[]): number {
  return items
    .filter((i) => i.krwAmount > 0)
    .reduce((s, i) => s + i.krwAmount, 0);
}

function computeGainKrw(totalCurrent: number, totalInvested: number): number {
  return totalCurrent - totalInvested;
}

function computeReturnRatePercent(totalCurrent: number, totalInvested: number): number {
  if (totalInvested <= 0) return 0;
  return (computeGainKrw(totalCurrent, totalInvested) / totalInvested) * 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

type Row = { label: string; expected: string; actual: string; ok: boolean };

function printTable(title: string, rows: Row[]) {
  console.log(`\n${title}`);
  console.log("-".repeat(72));
  for (const r of rows) {
    const mark = r.ok ? "✅" : "❌ 불일치";
    console.log(`${r.label.padEnd(28)} 예상: ${r.expected.padEnd(16)} 실제: ${r.actual.padEnd(16)} ${mark}`);
  }
}

async function createPortfolioItem(
  db: PrismaClient,
  reportId: number,
  args: {
    ticker: string;
    displayName?: string;
    accountType: AccountType;
    currency: Currency;
    krwAmount: number;
  },
) {
  const orig =
    args.currency === "KRW"
      ? args.krwAmount
      : usdOriginalFromKrw(args.krwAmount);
  await db.portfolioItem.create({
    data: {
      reportId,
      ticker: args.ticker,
      displayName: args.displayName ?? args.ticker,
      accountType: args.accountType,
      originalCurrency: args.currency,
      originalAmount: orig,
      krwAmount: args.krwAmount,
    },
  });
}

async function main() {
  try {
    // 이전 실행이 비정상 종료된 경우 동일 라벨 잔여 데이터 제거
    const leftover = await prisma.profile.findUnique({
      where: { label: TEST_PROFILE_LABEL },
    });
    if (leftover) {
      await prisma.accountInitialCapital.deleteMany({
        where: { profileId: leftover.id },
      });
      await prisma.report.deleteMany({ where: { profile: TEST_PROFILE_LABEL } });
      await prisma.profile.delete({ where: { id: leftover.id } });
    }

    // ── Step 1: 생성 ─────────────────────────────────────
    const profile = await prisma.profile.create({
      data: { label: TEST_PROFILE_LABEL },
    });

    const q2025Q4 = await prisma.report.create({
      data: {
        type: "QUARTERLY",
        periodLabel: "2025-Q4",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
      },
    });
    await createPortfolioItem(prisma, q2025Q4.id, {
      ticker: "GOOGL",
      accountType: "US_DIRECT",
      currency: "USD",
      krwAmount: 4_500_000,
    });
    await createPortfolioItem(prisma, q2025Q4.id, {
      ticker: "TIGER S&P500",
      accountType: "ISA",
      currency: "KRW",
      krwAmount: 900_000,
    });
    await createPortfolioItem(prisma, q2025Q4.id, {
      ticker: "USD 현금",
      accountType: "CASH",
      currency: "USD",
      krwAmount: 500_000,
    });

    await prisma.accountInitialCapital.createMany({
      data: [
        {
          profileId: profile.id,
          accountType: "US_DIRECT",
          krwAmount: 5_000_000,
          reportId: q2025Q4.id,
        },
        {
          profileId: profile.id,
          accountType: "ISA",
          krwAmount: 1_000_000,
          reportId: q2025Q4.id,
        },
      ],
    });

    const m202510 = await prisma.report.create({
      data: {
        type: "MONTHLY",
        periodLabel: "2025-10",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
        newInvestments: {
          create: [
            {
              accountType: "US_DIRECT",
              originalCurrency: "KRW",
              originalAmount: 500_000,
              krwAmount: 500_000,
            },
          ],
        },
      },
    });
    const m202511 = await prisma.report.create({
      data: {
        type: "MONTHLY",
        periodLabel: "2025-11",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
        newInvestments: {
          create: [
            {
              accountType: "ISA",
              originalCurrency: "KRW",
              originalAmount: 200_000,
              krwAmount: 200_000,
            },
          ],
        },
      },
    });
    const m202512 = await prisma.report.create({
      data: {
        type: "MONTHLY",
        periodLabel: "2025-12",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
        newInvestments: {
          create: [
            {
              accountType: "US_DIRECT",
              originalCurrency: "KRW",
              originalAmount: -300_000,
              krwAmount: -300_000,
            },
          ],
        },
      },
    });
    const q2026Q1 = await prisma.report.create({
      data: {
        type: "QUARTERLY",
        periodLabel: "2026-Q1",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
      },
    });
    await createPortfolioItem(prisma, q2026Q1.id, {
      ticker: "GOOGL",
      accountType: "US_DIRECT",
      currency: "USD",
      krwAmount: 5_200_000,
    });
    await createPortfolioItem(prisma, q2026Q1.id, {
      ticker: "TIGER S&P500",
      accountType: "ISA",
      currency: "KRW",
      krwAmount: 1_100_000,
    });
    await createPortfolioItem(prisma, q2026Q1.id, {
      ticker: "USD 현금",
      accountType: "CASH",
      currency: "USD",
      krwAmount: 300_000,
    });

    const m202601 = await prisma.report.create({
      data: {
        type: "MONTHLY",
        periodLabel: "2026-01",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
        newInvestments: {
          create: [
            {
              accountType: "US_DIRECT",
              originalCurrency: "KRW",
              originalAmount: 700_000,
              krwAmount: 700_000,
            },
          ],
        },
      },
    });
    const m202602 = await prisma.report.create({
      data: {
        type: "MONTHLY",
        periodLabel: "2026-02",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
        newInvestments: {
          create: [
            {
              accountType: "ISA",
              originalCurrency: "KRW",
              originalAmount: 300_000,
              krwAmount: 300_000,
            },
          ],
        },
      },
    });
    const q2026Q2 = await prisma.report.create({
      data: {
        type: "QUARTERLY",
        periodLabel: "2026-Q2",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
      },
    });
    await createPortfolioItem(prisma, q2026Q2.id, {
      ticker: "GOOGL",
      accountType: "US_DIRECT",
      currency: "USD",
      krwAmount: 6_000_000,
    });
    await createPortfolioItem(prisma, q2026Q2.id, {
      ticker: "META",
      accountType: "US_DIRECT",
      currency: "USD",
      krwAmount: 1_000_000,
    });
    await createPortfolioItem(prisma, q2026Q2.id, {
      ticker: "TIGER S&P500",
      accountType: "ISA",
      currency: "KRW",
      krwAmount: 1_300_000,
    });
    await createPortfolioItem(prisma, q2026Q2.id, {
      ticker: "USD 현금",
      accountType: "CASH",
      currency: "USD",
      krwAmount: 200_000,
    });

    const m202604 = await prisma.report.create({
      data: {
        type: "MONTHLY",
        periodLabel: "2026-04",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
        newInvestments: {
          create: [
            {
              accountType: "US_DIRECT",
              originalCurrency: "KRW",
              originalAmount: 1_000_000,
              krwAmount: 1_000_000,
            },
          ],
        },
      },
    });
    const m202605 = await prisma.report.create({
      data: {
        type: "MONTHLY",
        periodLabel: "2026-05",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
        newInvestments: {
          create: [
            {
              accountType: "US_DIRECT",
              originalCurrency: "KRW",
              originalAmount: -500_000,
              krwAmount: -500_000,
            },
          ],
        },
      },
    });
    const m202606 = await prisma.report.create({
      data: {
        type: "MONTHLY",
        periodLabel: "2026-06",
        profile: TEST_PROFILE_LABEL,
        status: "PUBLISHED",
        newInvestments: {
          create: [
            {
              accountType: "ISA",
              originalCurrency: "KRW",
              originalAmount: 200_000,
              krwAmount: 200_000,
            },
          ],
        },
      },
    });
    // ── Step 2: 검증 (DB에서 재계산) ───────────────────
    const initials = await prisma.accountInitialCapital.findMany({
      where: { profileId: profile.id },
    });
    const initialSum = initials.reduce((s, c) => s + c.krwAmount, 0);

    const invRows = await prisma.newInvestment.findMany({
      where: { report: { profile: TEST_PROFILE_LABEL, status: "PUBLISHED" } },
    });
    const investSum = invRows.reduce((s, i) => s + i.krwAmount, 0);
    const totalCumulativePrincipal = initialSum + investSum;

    const qReports = await prisma.report.findMany({
      where: { profile: TEST_PROFILE_LABEL, type: "QUARTERLY", status: "PUBLISHED" },
      include: { portfolioItems: true },
      orderBy: { periodLabel: "asc" },
    });

    const latestQ = qReports[qReports.length - 1];
    const latestTotalCurrent = sumPortfolioKrwAll(latestQ.portfolioItems);
    const latestTotalInvested = totalCumulativePrincipal;
    const latestProfit = computeGainKrw(latestTotalCurrent, latestTotalInvested);
    const latestReturn = computeReturnRatePercent(latestTotalCurrent, latestTotalInvested);

    // 분기별 평가금 (포트폴리오 합)
    const evalQ4 = sumPortfolioKrwAll(qReports[0].portfolioItems);
    const evalQ1 = sumPortfolioKrwAll(qReports[1].portfolioItems);
    const evalQ2 = sumPortfolioKrwAll(qReports[2].portfolioItems);

    const baseInitial = 6_000_000;
    const q4Profit = evalQ4 - baseInitial;
    const q4Return = (q4Profit / baseInitial) * 100;

    const q1ProfitVsPrev = evalQ1 - evalQ4;
    const q1ReturnVsPrev = (q1ProfitVsPrev / evalQ4) * 100;

    const q2ProfitVsPrev = evalQ2 - evalQ1;
    const q2ReturnVsPrev = (q2ProfitVsPrev / evalQ1) * 100;

    const rows: Row[] = [];

    rows.push({
      label: "초기 원금 합계",
      expected: fmt(6_000_000),
      actual: fmt(initialSum),
      ok: Math.abs(initialSum - 6_000_000) < 0.01,
    });
    rows.push({
      label: "신규투자금 누적",
      expected: fmt(2_100_000),
      actual: fmt(investSum),
      ok: Math.abs(investSum - 2_100_000) < 0.01,
    });
    rows.push({
      label: "총 누적 원금",
      expected: fmt(8_100_000),
      actual: fmt(totalCumulativePrincipal),
      ok: Math.abs(totalCumulativePrincipal - 8_100_000) < 0.01,
    });

    printTable("=== 누적 원금 ===", rows);

    const dashRows: Row[] = [
      {
        label: "총 평가금 (2026-Q2)",
        expected: fmt(8_500_000),
        actual: fmt(latestTotalCurrent),
        ok: Math.abs(latestTotalCurrent - 8_500_000) < 0.01,
      },
      {
        label: "누적 수익금",
        expected: fmt(400_000),
        actual: fmt(latestProfit),
        ok: Math.abs(latestProfit - 400_000) < 0.01,
      },
      {
        label: "누적 수익률 (%)",
        expected: fmt(4.94),
        actual: fmt(round2(latestReturn)),
        ok: Math.abs(round2(latestReturn) - 4.94) < 0.02,
      },
    ];
    printTable("=== 대시보드 (최신 분기 2026-Q2) ===", dashRows);

    const q4Rows: Row[] = [
      {
        label: "현재 평가금",
        expected: fmt(5_900_000),
        actual: fmt(evalQ4),
        ok: Math.abs(evalQ4 - 5_900_000) < 0.01,
      },
      {
        label: "베이스(초기원금)",
        expected: fmt(6_000_000),
        actual: fmt(baseInitial),
        ok: true,
      },
      {
        label: "분기 수익금",
        expected: fmt(-100_000),
        actual: fmt(q4Profit),
        ok: Math.abs(q4Profit - -100_000) < 0.01,
      },
      {
        label: "분기 수익률 (%)",
        expected: fmt(-1.67),
        actual: fmt(round2(q4Return)),
        ok: Math.abs(round2(q4Return) - -1.67) < 0.02,
      },
    ];
    printTable("=== 2025-Q4 (첫 분기, 초기원금 대비) ===", q4Rows);

    const q1Rows: Row[] = [
      {
        label: "현재 평가금",
        expected: fmt(6_600_000),
        actual: fmt(evalQ1),
        ok: Math.abs(evalQ1 - 6_600_000) < 0.01,
      },
      {
        label: "베이스(전분기 평가금)",
        expected: fmt(5_900_000),
        actual: fmt(evalQ4),
        ok: Math.abs(evalQ4 - 5_900_000) < 0.01,
      },
      {
        label: "분기 수익금",
        expected: fmt(700_000),
        actual: fmt(q1ProfitVsPrev),
        ok: Math.abs(q1ProfitVsPrev - 700_000) < 0.01,
      },
      {
        label: "분기 수익률 (%)",
        expected: fmt(11.86),
        actual: fmt(round2(q1ReturnVsPrev)),
        ok: Math.abs(round2(q1ReturnVsPrev) - 11.86) < 0.02,
      },
    ];
    printTable("=== 2026-Q1 (전분기 2025-Q4 대비) ===", q1Rows);

    const q2Rows: Row[] = [
      {
        label: "현재 평가금",
        expected: fmt(8_500_000),
        actual: fmt(evalQ2),
        ok: Math.abs(evalQ2 - 8_500_000) < 0.01,
      },
      {
        label: "베이스(전분기 평가금)",
        expected: fmt(6_600_000),
        actual: fmt(evalQ1),
        ok: Math.abs(evalQ1 - 6_600_000) < 0.01,
      },
      {
        label: "분기 수익금",
        expected: fmt(1_900_000),
        actual: fmt(q2ProfitVsPrev),
        ok: Math.abs(q2ProfitVsPrev - 1_900_000) < 0.01,
      },
      {
        label: "분기 수익률 (%)",
        expected: fmt(28.79),
        actual: fmt(round2(q2ReturnVsPrev)),
        ok: Math.abs(round2(q2ReturnVsPrev) - 28.79) < 0.02,
      },
    ];
    printTable("=== 2026-Q2 (전분기 2026-Q1 대비) ===", q2Rows);

    const allOk =
      rows.every((r) => r.ok) &&
      dashRows.every((r) => r.ok) &&
      q4Rows.every((r) => r.ok) &&
      q1Rows.every((r) => r.ok) &&
      q2Rows.every((r) => r.ok);

    console.log("\n" + "=".repeat(72));
    if (allOk) {
      console.log("✅ 전체 검증 통과");
    } else {
      console.log("일부 항목이 예상과 다릅니다. 위 표의 ❌ 를 확인하세요.");
    }
    console.log("=".repeat(72));

    // ── Step 3: 테스트 데이터만 삭제 ─────────────────────
    await prisma.accountInitialCapital.deleteMany({
      where: { profileId: profile.id },
    });

    await prisma.report.deleteMany({
      where: { profile: TEST_PROFILE_LABEL },
    });

    await prisma.profile.delete({
      where: { id: profile.id },
    });

    console.log(`\n삭제 완료: 프로필·리포트·초기원금 등 테스트 데이터(${TEST_PROFILE_LABEL})를 제거했습니다.`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
