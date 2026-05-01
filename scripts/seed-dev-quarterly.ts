/* 먼저 로드해야 함 (prisma 다음에 오면 DATABASE_URL 순서 깨짐) */
import "./load-env-before-prisma.ts";

/**
 * 로컬/테스트용 SQLite에만 실행: 해당 프로필의 기존 분기(QUARTERLY) 리포트를 삭제하고
 * 10개 분기 예시 리포트(종목 10개 라인업, 분기마다 평가·비중 미세 변동)를 삽입합니다.
 *
 * ━ 주의 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 프로덕션 DB·비파일(remote) DATABASE_URL에서는 실행되지 않습니다.
 *
 * 실행:
 *   ALLOW_DEV_ALPHA_QUARTERLY_SEED=true npx tsx scripts/seed-dev-quarterly.ts
 *
 * 선택: 다른 프로필 라벨(기본: AlphA Holdings Portfolio)
 *   SEED_PROFILE_LABEL=MindongFolio ALLOW_DEV_ALPHA_QUARTERLY_SEED=true ...
 */
import {
  AccountType,
  AssetRole,
  Currency,
  ReportStatus,
  ReportType,
} from "../src/generated/prisma";
/**
 * 새 PrismaClient(file:./…)를 만들지 않습니다. SQLite 경로가 스키마 기준 상대경로와 달라
 * `prisma/prisma/dev.db`에 데이터가 들어가 앱(prisma/dev.db)과 불일치하는 문제가 납니다.
 * @see src/lib/prisma.ts
 */
import { prisma } from "../src/lib/prisma";

const PROFILE_DEFAULT = "AlphA Holdings Portfolio";
const QUARTERS = [
  "2024-Q1",
  "2024-Q2",
  "2024-Q3",
  "2024-Q4",
  "2025-Q1",
  "2025-Q2",
  "2025-Q3",
  "2025-Q4",
  "2026-Q1",
  "2026-Q2",
] as const;

const BASE_ROW = [
  { ticker: "NVDA", sector: "Technology", role: AssetRole.GROWTH },
  { ticker: "MSFT", sector: "Technology", role: AssetRole.CORE },
  { ticker: "AAPL", sector: "Technology", role: AssetRole.CORE },
  { ticker: "GOOGL", sector: "Communication Services", role: AssetRole.GROWTH },
  { ticker: "AMZN", sector: "Consumer Cyclical", role: AssetRole.GROWTH },
  { ticker: "META", sector: "Communication Services", role: AssetRole.GROWTH },
  { ticker: "TSM", sector: "Technology", role: AssetRole.GROWTH },
  { ticker: "BRK.B", sector: "Financial Services", role: AssetRole.DEFENSIVE },
  { ticker: "VOO", sector: "", role: AssetRole.INDEX },
  { ticker: "SCHD", sector: "", role: AssetRole.INDEX },
] as const;

const BASE_KR = [
  68_250_000, 52_830_000, 49_065_000, 34_486_500, 30_943_750, 27_839_850,
  25_069_825, 22_097_775, 19_058_975, 11_058_975,
];

const USD_KRW = 1385;
const JPY_PER_100 = 9.2;

const SUMMARIES = [
  "성장주 비중 유지, 변동성 구간에서 분할 매수 위주.",
  "금리 민감 섹터 일부 정리, 현금 비중 소폭 확대.",
  "실적 시즌 전 리밸런싱, 방어·지수 비중 조정.",
  "환율 헤지 필요성 검토, 해외 직투 비중 유지.",
  "배당주·퀄리티 쪽으로 일부 로테이션.",
  "반도체 랠리 수익 일부 실현, 재진입 구간 탐색.",
  "거시 지표 대기, 신규 납입은 ISA 위주.",
  "섹터 내 비중만 조정, 큰 그림은 유지.",
  "대형주 중심으로 정리, 소형주 비중 축소.",
  "분기 말 기준 포트 안정화, 다음 분기 전략 수립.",
];

function assertSafeToRun(): void {
  if (process.env.ALLOW_DEV_ALPHA_QUARTERLY_SEED !== "true") {
    console.error(
      "[seed-dev-quarterly] 중단: 로컬 테스트 DB에서만 사용합니다. 환경 변수를 설정하세요:\n" +
        "  ALLOW_DEV_ALPHA_QUARTERLY_SEED=true npx tsx scripts/seed-dev-quarterly.ts",
    );
    process.exit(1);
  }

  const url = (process.env.DATABASE_URL ?? "").trim();
  if (!url.startsWith("file:")) {
    console.error(
      "[seed-dev-quarterly] 중단: DATABASE_URL이 file: 로컬 SQLite가 아닙니다. 원격/프로덕션 DB 보호를 위해 실행하지 않습니다.",
    );
    process.exit(1);
  }
}

type BaseTicker = (typeof BASE_ROW)[number]["ticker"];

function portfolioForQuarter(
  quarterIndex: number,
): Array<{
  ticker: string;
  sector: string | null;
  role: AssetRole;
  originalAmount: number;
  krwAmount: number;
}> {
  const trend = 1 + quarterIndex * 0.021;
  return BASE_ROW.map((row, t) => {
    const jitter = 1 + ((t * 3 + quarterIndex * 2) % 11 - 5) * 0.004;
    const krwAmount = Math.round(BASE_KR[t] * trend * jitter);
    const usd = Math.round(krwAmount / USD_KRW);
    let ticker: BaseTicker | "LLY" = row.ticker;
    let sector: string | null = row.sector || null;
    let role = row.role;
    if (t === 9 && quarterIndex % 3 === 2) {
      ticker = "LLY";
      sector = "Healthcare";
      role = AssetRole.CORE;
    }
    return {
      ticker,
      sector,
      role,
      originalAmount: usd,
      krwAmount,
    };
  });
}

function quarterEndDate(periodLabel: string): Date {
  const m = /^(\d{4})-Q([1-4])$/.exec(periodLabel);
  if (!m) return new Date();
  const y = Number(m[1]);
  const q = Number(m[2]);
  const month = q * 3;
  return new Date(Date.UTC(y, month, 1, 6, 30, 0));
}

async function main() {
  assertSafeToRun();

  const profileLabel = (process.env.SEED_PROFILE_LABEL ?? PROFILE_DEFAULT).trim();
  if (!profileLabel) {
    console.error("[seed-dev-quarterly] SEED_PROFILE_LABEL이 비어 있습니다.");
    process.exit(1);
  }

  const existing = await prisma.report.findMany({
    where: { profile: profileLabel, type: ReportType.QUARTERLY },
    select: { id: true },
  });
  const ids = existing.map((r) => r.id);

  await prisma.$transaction(async (tx) => {
    if (ids.length > 0) {
      await tx.accountInitialCapital.deleteMany({
        where: { reportId: { in: ids } },
      });
      await tx.report.deleteMany({
        where: { id: { in: ids } },
      });
      console.log(`[seed-dev-quarterly] 삭제: QUARTERLY ${ids.length}건 (프로필: ${profileLabel})`);
    } else {
      console.log(`[seed-dev-quarterly] 삭제할 기존 분기 리포트 없음 (${profileLabel})`);
    }

    for (let i = 0; i < QUARTERS.length; i++) {
      const periodLabel = QUARTERS[i];
      const rows = portfolioForQuarter(i);
      const totalCurrent = rows.reduce((s, r) => s + r.krwAmount, 0);
      const totalInvested = Math.round(totalCurrent * (0.92 + (i % 5) * 0.003));

      const newInvCreates =
        i === 0
          ? []
          : [
              {
                accountType: AccountType.US_DIRECT,
                originalCurrency: Currency.USD,
                originalAmount: 4_200 + i * 180,
                krwAmount: Math.round((4_200 + i * 180) * USD_KRW),
              },
              {
                accountType: AccountType.ISA,
                originalCurrency: Currency.KRW,
                originalAmount: 1_500_000 + i * 120_000,
                krwAmount: 1_500_000 + i * 120_000,
              },
            ];

      await tx.report.create({
        data: {
          type: ReportType.QUARTERLY,
          periodLabel,
          usdRate: USD_KRW,
          jpyRate: JPY_PER_100,
          totalInvestedKrw: totalInvested,
          totalCurrentKrw: totalCurrent,
          profile: profileLabel,
          status: ReportStatus.PUBLISHED,
          summary: SUMMARIES[i] ?? SUMMARIES[i % SUMMARIES.length],
          journal: "",
          strategy: "",
          earningsReview: `분기 인덱스 ${i + 1}/10: 핵심 종목 실적·가이던스 점검, 유동성 이벤트 대비 비중만 조정했습니다.`,
          createdAt: quarterEndDate(periodLabel),
          updatedAt: quarterEndDate(periodLabel),
          portfolioItems: {
            create: rows.map((r) => ({
              ticker: r.ticker,
              displayName: null,
              logoUrl: null,
              sector: r.sector,
              role: r.role,
              accountType: AccountType.US_DIRECT,
              originalCurrency: Currency.USD,
              originalAmount: r.originalAmount,
              krwAmount: r.krwAmount,
            })),
          },
          newInvestments:
            newInvCreates.length > 0
              ? {
                  create: newInvCreates,
                }
              : undefined,
        },
      });
    }
  });

  const count = await prisma.report.count({
    where: { profile: profileLabel, type: ReportType.QUARTERLY },
  });
  console.log(`[seed-dev-quarterly] 완료: ${profileLabel} 분기 리포트 ${count}건 (목표 10건)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
