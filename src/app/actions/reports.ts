"use server";

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import type { AssetRole, ReportType, ReportStatus } from "@/generated/prisma";
import {
  INITIAL_CAPITAL_ACCOUNT_TYPES,
  type InitialCapitalAccountType,
  type PrismaTransaction,
} from "@/lib/initial-capital";
import { deriveQuarterlyIntervalPerformance } from "@/lib/report-performance";
import { parseReportPeriodEndDate } from "@/lib/report-period";
import {
  buildInvestmentSumByQuarterKey,
  parseQuarterlyPeriodYearQuarter,
  quarterInclusiveDateBounds,
} from "@/lib/investment-aggregates";

async function resolveProfileIdFromLabel(
  db: Pick<PrismaClient, "profile">,
  profileLabel: string,
): Promise<string> {
  const p = await db.profile.upsert({
    where: { label: profileLabel },
    create: { label: profileLabel },
    update: {},
  });
  return p.id;
}

/** 리포트에 연결된 NewInvestment 행과 동일한 내용을 Investment에 반영 (집계 원천) */
async function syncInvestmentsForReportTx(
  tx: PrismaTransaction,
  profileLabel: string,
  reportId: number,
  periodLabel: string,
  rows: NonNullable<CreateReportPayload["newInvestments"]>,
): Promise<void> {
  await tx.profileInvestment.deleteMany({ where: { sourceReportId: reportId } });
  if (!rows?.length) return;
  const profileId = await resolveProfileIdFromLabel(tx, profileLabel);
  const date = parseReportPeriodEndDate(periodLabel);
  await tx.profileInvestment.createMany({
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

async function sumInvestmentForProfileQuarterKrw(
  profileId: string,
  year: number,
  quarter: number,
): Promise<number> {
  const { start, end } = quarterInclusiveDateBounds(year, quarter);
  const agg = await prisma.profileInvestment.aggregate({
    where: { profileId, date: { gte: start, lte: end } },
    _sum: { amountKrw: true },
  });
  return agg._sum.amountKrw ?? 0;
}

/**
 * 분기 리포트 작성 페이지 진입 시: 첫 분기이거나 초기 원금 레코드가 없으면 섹션 표시
 */
export async function getQuarterlyInitialCapitalSectionState(profileLabel: string) {
  const profileId = await resolveProfileIdFromLabel(prisma, profileLabel);
  const [quarterlyReportCount, initialCapitalCount] = await Promise.all([
    prisma.report.count({ where: { profile: profileLabel, type: "QUARTERLY" } }),
    prisma.accountInitialCapital.count({ where: { profileId } }),
  ]);
  const isFirstQuarterly = quarterlyReportCount === 0;
  const hasNoInitialCapital = initialCapitalCount === 0;
  const showInitialCapitalSection = isFirstQuarterly || hasNoInitialCapital;
  return {
    quarterlyReportCount,
    initialCapitalCount,
    showInitialCapitalSection,
  };
}

/** 분기 리포트 수정 페이지: 가장 오래된 QUARTERLY가 현재 리포트일 때만 섹션 표시 + 기존 초기 원금 */
export async function getQuarterlyInitialCapitalSectionStateForEdit(
  profileLabel: string,
  currentReportId: number,
) {
  const profileId = await resolveProfileIdFromLabel(prisma, profileLabel);
  const oldestQuarterly = await prisma.report.findFirst({
    where: { type: "QUARTERLY", profile: profileLabel },
    orderBy: { createdAt: "asc" },
  });
  const showInitialCapitalSection = oldestQuarterly?.id === currentReportId;

  if (!showInitialCapitalSection) {
    return {
      showInitialCapitalSection: false as const,
      initialCapitalByAccount: {} as Partial<Record<InitialCapitalAccountType, number>>,
    };
  }

  const rows = await prisma.accountInitialCapital.findMany({ where: { profileId } });
  const initialCapitalByAccount: Partial<Record<InitialCapitalAccountType, number>> = {};
  for (const row of rows) {
    if (INITIAL_CAPITAL_ACCOUNT_TYPES.includes(row.accountType as InitialCapitalAccountType)) {
      initialCapitalByAccount[row.accountType as InitialCapitalAccountType] = row.krwAmount;
    }
  }
  return { showInitialCapitalSection: true as const, initialCapitalByAccount };
}

/** 폼 표시용 누적 원금: AccountInitialCapital 합 + Investment(신규 납입) 합 */
export async function getProfileCumulativePrincipalKrw(profileLabel: string): Promise<number> {
  const profileId = await resolveProfileIdFromLabel(prisma, profileLabel);
  const [initials, invAgg] = await Promise.all([
    prisma.accountInitialCapital.findMany({ where: { profileId } }),
    prisma.profileInvestment.aggregate({
      where: { profileId },
      _sum: { amountKrw: true },
    }),
  ]);
  const initialSum = initials.reduce((s, row) => s + row.krwAmount, 0);
  const invSum = invAgg._sum.amountKrw ?? 0;
  return initialSum + invSum;
}

/** 분기 리포트 상세: 누적 투입·평가, 구간 수익/수익률(목록 카드 deriveQuarterlyIntervalPerformance와 동일 공식) */
export type QuarterlyReportFinancialSummary = {
  totalInvestedKrw: number;
  currentTotalValueKrw: number;
  quarterlyProfitKrw: number;
  quarterlyProfitRatePercent: number;
};

export async function getQuarterlyReportFinancialSummary(
  reportId: number
): Promise<QuarterlyReportFinancialSummary | null> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { portfolioItems: true, newInvestments: true },
  });
  if (!report || report.type !== "QUARTERLY") return null;

  const profileLabel = report.profile;
  const profileId = await resolveProfileIdFromLabel(prisma, profileLabel);

  const [initialAgg, invAgg] = await Promise.all([
    prisma.accountInitialCapital.aggregate({
      where: { profileId },
      _sum: { krwAmount: true },
    }),
    prisma.profileInvestment.aggregate({
      where: { profileId },
      _sum: { amountKrw: true },
    }),
  ]);

  const totalInvestedKrw =
    (initialAgg._sum.krwAmount ?? 0) + (invAgg._sum.amountKrw ?? 0);

  const currentTotalValueKrw =
    report.portfolioItems.reduce((s, i) => s + i.krwAmount, 0) ||
    report.totalCurrentKrw ||
    0;

  const previousQuarterly = await prisma.report.findFirst({
    where: {
      type: "QUARTERLY",
      profile: profileLabel,
      id: { not: report.id },
      createdAt: { lt: report.createdAt },
    },
    orderBy: { createdAt: "desc" },
    include: { portfolioItems: true },
  });

  const pqLabel = parseQuarterlyPeriodYearQuarter(report.periodLabel);
  let quarterlyProfitKrw: number;
  let quarterlyProfitRatePercent: number;
  if (previousQuarterly == null) {
    quarterlyProfitKrw = 0;
    quarterlyProfitRatePercent = 0;
  } else {
    const prevEval =
      previousQuarterly.portfolioItems.reduce((s, i) => s + i.krwAmount, 0) ||
      previousQuarterly.totalCurrentKrw ||
      0;
    const periodNewInflowKrw =
      pqLabel != null
        ? await sumInvestmentForProfileQuarterKrw(profileId, pqLabel.year, pqLabel.quarter)
        : 0;
    const basis = prevEval + periodNewInflowKrw;
    quarterlyProfitKrw = currentTotalValueKrw - basis;
    quarterlyProfitRatePercent = basis > 0 ? (quarterlyProfitKrw / basis) * 100 : 0;
  }

  return {
    totalInvestedKrw,
    currentTotalValueKrw,
    quarterlyProfitKrw,
    quarterlyProfitRatePercent,
  };
}

export async function upsertAccountInitialCapitalsIfApplicable(
  tx: PrismaTransaction,
  profileLabel: string,
  reportId: number,
  initialCapitalByAccount: Partial<Record<InitialCapitalAccountType, number>> | undefined,
): Promise<void> {
  if (initialCapitalByAccount === undefined) return;

  const profileId = await resolveProfileIdFromLabel(tx, profileLabel);
  const [totalQuarterly, icCount] = await Promise.all([
    tx.report.count({ where: { profile: profileLabel, type: "QUARTERLY" } }),
    tx.accountInitialCapital.count({ where: { profileId } }),
  ]);

  // 첫 번째 분기 리포트 직후(카운트 1)이거나, 아직 초기 원금 레코드가 없을 때만 저장
  if (totalQuarterly !== 1 && icCount !== 0) return;

  for (const accountType of INITIAL_CAPITAL_ACCOUNT_TYPES) {
    const raw = initialCapitalByAccount[accountType];
    const krwAmount = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    await tx.accountInitialCapital.upsert({
      where: { profileId_accountType: { profileId, accountType } },
      create: { profileId, accountType, krwAmount, reportId },
      update: {},
    });
  }
}

/** 최초 분기 리포트 수정 시에만 호출 — update에서 krwAmount 덮어쓰기 (작성 페이지 upsert와 구분) */
export async function upsertAccountInitialCapitalsOnEdit(
  tx: PrismaTransaction,
  profileLabel: string,
  reportId: number,
  initialCapitalByAccount: Partial<Record<InitialCapitalAccountType, number>>,
): Promise<void> {
  const oldest = await tx.report.findFirst({
    where: { type: "QUARTERLY", profile: profileLabel },
    orderBy: { createdAt: "asc" },
  });
  if (oldest?.id !== reportId) return;

  const profileId = await resolveProfileIdFromLabel(tx, profileLabel);
  for (const accountType of INITIAL_CAPITAL_ACCOUNT_TYPES) {
    const raw = initialCapitalByAccount[accountType];
    const krwAmount = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    await tx.accountInitialCapital.upsert({
      where: { profileId_accountType: { profileId, accountType } },
      create: { profileId, accountType, krwAmount, reportId },
      update: { krwAmount },
    });
  }
}

export type ReportTypeInput = "MONTHLY" | "QUARTERLY";
export type ReportStatusInput = "DRAFT" | "PUBLISHED";

// ── periodLabel을 날짜로 변환하여 정렬 가능한 값 반환 ─────────────
function parsePeriodLabel(periodLabel: string): Date {
  // MONTHLY: "2026-03" 형식
  if (/^\d{4}-\d{2}$/.test(periodLabel)) {
    const [year, month] = periodLabel.split("-").map(Number);
    return new Date(year, month - 1, 1); // 월은 0-based이므로 -1
  }
  
  // QUARTERLY: "2026-Q1" 형식
  if (/^\d{4}-Q[1-4]$/.test(periodLabel)) {
    const [yearStr, quarterStr] = periodLabel.split("-Q");
    const year = Number(yearStr);
    const quarter = Number(quarterStr);
    const month = (quarter - 1) * 3; // Q1=0월, Q2=3월, Q3=6월, Q4=9월
    return new Date(year, month, 1);
  }
  
  // 파싱 실패 시 현재 날짜 반환 (fallback)
  return new Date();
}

// ── 프로필별 리포트 목록 (타입 필터 포함) ──────────────────────
export async function getReportsByProfileAndType(profile: string, type?: ReportTypeInput) {
  const reports = await prisma.report.findMany({
    where: {
      profile,
      ...(type ? { type } : {}),
    },
    include: {
      portfolioItems: true,
      newInvestments: true,
    },
  });
  
  // periodLabel 기준으로 정렬 (과거→최신 순서, 오름차순)
  return reports.sort((a, b) => {
    const dateA = parsePeriodLabel(a.periodLabel);
    const dateB = parsePeriodLabel(b.periodLabel);
    return dateA.getTime() - dateB.getTime(); // 오름차순 (과거→최신)
  });
}

// ── 프로필별 PUBLISHED 리포트만 조회 (대시보드 통계용) ─────────────
export async function getReportsByProfilePublished(profile: string) {
  const reports = await prisma.report.findMany({
    where: { profile, status: "PUBLISHED" },
    include: {
      portfolioItems: true,
      newInvestments: true,
    },
  });
  return reports.sort((a, b) => {
    const dateA = parsePeriodLabel(a.periodLabel);
    const dateB = parsePeriodLabel(b.periodLabel);
    return dateB.getTime() - dateA.getTime(); // 내림차순
  });
}

// ── 리포트 유효성 검사 (DRAFT vs PUBLISHED) ───────────────────────
function validateReportPayload(
  payload: CreateReportPayload,
  status: ReportStatusInput
): { ok: boolean; error?: string } {
  const { type, periodLabel, totalCurrentKrw, portfolioItems, newInvestments = [], summary, journal, strategy, earningsReview } = payload;

  // 공통: periodLabel 필수
  if (!periodLabel?.trim()) {
    return { ok: false, error: "작성 연월/분기를 입력해주세요." };
  }
  if (type === "MONTHLY" && !/^\d{4}-\d{2}$/.test(periodLabel.trim())) {
    return { ok: false, error: "연월 형식이 올바르지 않습니다. (예: 2026-03)" };
  }
  if (type === "QUARTERLY" && !/^\d{4}-Q[1-4]$/.test(periodLabel.trim())) {
    return { ok: false, error: "분기 형식이 올바르지 않습니다. (예: 2026-Q1)" };
  }

  // 분기별: 환율·총 평가액 필수. 총 투자금(원금)은 DB에서 AccountInitialCapital+월별 신규투입으로 관리 → null
  if (type === "QUARTERLY") {
    if (typeof totalCurrentKrw !== "number" || totalCurrentKrw < 0) {
      return { ok: false, error: "총 평가금을 입력해주세요." };
    }
    if (typeof payload.usdRate !== "number" || payload.usdRate < 0) {
      return { ok: false, error: "USD/KRW 환율을 입력해주세요." };
    }
    if (typeof payload.jpyRate !== "number" || payload.jpyRate < 0) {
      return { ok: false, error: "JPY/KRW 환율을 입력해주세요." };
    }
  }

  // MONTHLY: 신규 투입금 행 검증 (입금·출금(음수) 허용, 0만 불가)
  if (type === "MONTHLY") {
    const incompleteNewInv = newInvestments.filter((inv) => (inv.originalAmount ?? 0) === 0);
    if (incompleteNewInv.length > 0) {
      return { ok: false, error: "신규 투입금이 비어 있는 행이 있습니다. 금액을 입력하거나 해당 행을 삭제해 주세요." };
    }
  }

  // QUARTERLY: 신규 투입금 행 검증 (입력한 행만)
  if (type === "QUARTERLY") {
    const incompleteNewInv = newInvestments.filter((inv) => (inv.originalAmount || 0) <= 0);
    if (incompleteNewInv.length > 0) {
      return { ok: false, error: "신규 투입금이 비어 있는 행이 있습니다. 금액을 입력하거나 해당 행을 삭제해 주세요." };
    }
  }

  // QUARTERLY: 포트폴리오 스냅샷 검증
  if (type === "QUARTERLY") {
    const validItems = portfolioItems.filter((item) => {
      const hasAmount = (item.originalAmount || 0) > 0;
      if (item.accountType === "CASH") return hasAmount;
      return (item.ticker || "").trim().length > 0 && hasAmount;
    });
    const invalidItems = portfolioItems.filter((item) => {
      const hasTicker = (item.ticker || "").trim().length > 0;
      const hasAmount = (item.originalAmount || 0) > 0;
      if (item.accountType === "CASH") return !hasAmount;
      return (hasTicker && !hasAmount) || (!hasTicker && hasAmount);
    });
    if (invalidItems.length > 0) {
      return { ok: false, error: "종목명과 평가액을 모두 입력해 주세요. 비어 있는 행은 삭제해 주세요." };
    }
    if (validItems.length === 0) {
      return { ok: false, error: "포트폴리오 스냅샷에 최소 1개 이상의 항목을 입력해주세요." };
    }
  }

  // PUBLISHED: 텍스트 필드 필수
  if (status === "PUBLISHED") {
    if (type === "MONTHLY") {
      if (!(summary || "").trim()) return { ok: false, error: "이번 달 증시 요약을 입력해주세요." };
      if (!(journal || "").trim()) return { ok: false, error: "느낀 점을 입력해주세요." };
    }
    if (type === "QUARTERLY") {
      if (!(summary || "").trim()) return { ok: false, error: "분기 시장 요약을 입력해주세요." };
      if (!(journal || "").trim()) return { ok: false, error: "느낀 점을 입력해주세요." };
      if (!(strategy || "").trim()) return { ok: false, error: "다음 분기 전략을 입력해주세요." };
      if (!(earningsReview || "").trim()) return { ok: false, error: "어닝/실적 리뷰를 입력해주세요." };
    }
  }

  return { ok: true };
}

// ── 최신 리포트의 AI 코멘트 조회 (대시보드 배너용) ────────────────
export async function getLatestAiComment(profile: string) {
  const report = await prisma.report.findFirst({
    where: {
      profile,
      status: "PUBLISHED",
      reportAiComment: { isNot: null },
    },
    orderBy: { createdAt: "desc" },
    include: {
      reportAiComment: true,
    },
  });
  if (!report?.reportAiComment) return null;
  return {
    reportId: report.id,
    periodLabel: report.periodLabel,
    type: report.type,
    comment: report.reportAiComment,
  };
}

// ── 단일 리포트 조회 ───────────────────────────────────────
export async function getReportById(id: number) {
  return prisma.report.findUnique({
    where: { id },
    include: {
      portfolioItems: true,
      newInvestments: true,
      reportAiComment: true,
    },
  });
}

// ── 리포트 생성 페이로드 타입 ──────────────────────────────
export interface CreateReportPayload {
  type: ReportType;
  profile?: string;
  status?: ReportStatusInput;  // DRAFT: 임시저장, PUBLISHED: 작성 완료
  periodLabel: string;
  /** 월별 리포트는 null 저장 가능. 분기별은 필수(검증에서 확인). */
  usdRate?: number | null;
  jpyRate?: number | null;
  totalInvestedKrw?: number | null;
  totalCurrentKrw?: number | null;
  summary?: string;
  journal?: string;
  strategy?: string;
  earningsReview?: string;
  portfolioItems: {
    ticker: string;
    displayName?: string | null;
    sector?: string;
    logoUrl?: string | null;
    role?: AssetRole;
    accountType: "US_DIRECT" | "KR_DIRECT" | "ISA" | "JP_DIRECT" | "PENSION" | "CASH";
    originalCurrency: "USD" | "KRW" | "JPY";
    originalAmount: number;
    krwAmount: number;
  }[];
  newInvestments?: {
    accountType: "US_DIRECT" | "KR_DIRECT" | "ISA" | "JP_DIRECT" | "PENSION" | "CASH";
    originalCurrency: "USD" | "KRW" | "JPY";
    originalAmount: number;
    krwAmount: number;
  }[];
  /** 첫 분기(또는 초기 원금 미기록) 작성 시 계좌별 초기 원금 — 서버에서 조건 충족 시에만 저장 */
  initialCapitalByAccount?: Partial<Record<InitialCapitalAccountType, number>>;
}

// ── 리포트 생성 ────────────────────────────────────────────
export async function createReport(payload: CreateReportPayload) {
  const {
    portfolioItems,
    newInvestments = [],
    earningsReview,
    profile,
    status: statusInput,
    initialCapitalByAccount,
    ...rest
  } = payload;

  const status: ReportStatusInput = statusInput ?? "DRAFT";
  const validation = validateReportPayload({ ...payload, status }, status);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const profileValue = profile || "AlphA Holdings Portfolio";

  const reportData = {
    ...rest,
    usdRate: rest.usdRate ?? null,
    jpyRate: rest.jpyRate ?? null,
    totalInvestedKrw: rest.totalInvestedKrw ?? null,
    totalCurrentKrw: rest.totalCurrentKrw ?? null,
  };
  if (payload.type === "MONTHLY") {
    reportData.usdRate = null;
    reportData.jpyRate = null;
    reportData.totalInvestedKrw = null;
    reportData.totalCurrentKrw = null;
  }
  if (payload.type === "QUARTERLY") {
    reportData.totalInvestedKrw = null;
  }

  const createData = {
    ...reportData,
    status: status as ReportStatus,
    profile: profileValue,
    earningsReview: earningsReview || null,
    portfolioItems: {
      create: portfolioItems,
    },
    newInvestments:
      newInvestments.length > 0
        ? {
            create: newInvestments,
          }
        : undefined,
  };

  const include = { portfolioItems: true as const, newInvestments: true as const };

  const report = await prisma.$transaction(async (tx) => {
    const created = await tx.report.create({
      data: createData,
      include,
    });
    if (payload.type === "QUARTERLY") {
      await upsertAccountInitialCapitalsIfApplicable(
        tx,
        profileValue,
        created.id,
        initialCapitalByAccount,
      );
    }
    await syncInvestmentsForReportTx(tx, profileValue, created.id, rest.periodLabel, newInvestments);
    return created;
  });

  revalidatePath("/");
  revalidatePath("/monthly");
  revalidatePath("/quarterly");
  return report;
}

// ── 리포트 전체 수정 (포트폴리오 아이템 포함) ──────────────────────────────
export async function updateReportFull(id: number, payload: CreateReportPayload) {
  const {
    portfolioItems,
    newInvestments = [],
    earningsReview,
    profile,
    status: statusInput,
    initialCapitalByAccount,
    ...rest
  } = payload;
  const reportData = {
    ...rest,
    usdRate: rest.usdRate ?? null,
    jpyRate: rest.jpyRate ?? null,
    totalInvestedKrw: rest.totalInvestedKrw ?? null,
    totalCurrentKrw: rest.totalCurrentKrw ?? null,
  };
  if (payload.type === "MONTHLY") {
    reportData.usdRate = null;
    reportData.jpyRate = null;
    reportData.totalInvestedKrw = null;
    reportData.totalCurrentKrw = null;
  }
  if (payload.type === "QUARTERLY") {
    reportData.totalInvestedKrw = null;
  }

  const status: ReportStatusInput = statusInput ?? "DRAFT";
  const validation = validateReportPayload({ ...payload, status }, status);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const profileValue = profile || "AlphA Holdings Portfolio";

  const report = await prisma.$transaction(async (tx) => {
    await tx.portfolioItem.deleteMany({ where: { reportId: id } });
    await tx.newInvestment.deleteMany({ where: { reportId: id } });

    const updatedReport = await tx.report.update({
      where: { id },
      data: {
        ...reportData,
        status: status as ReportStatus,
        profile: profile || undefined,
        earningsReview: earningsReview || null,
        portfolioItems: {
          create: portfolioItems,
        },
        newInvestments:
          newInvestments.length > 0
            ? {
                create: newInvestments,
              }
            : undefined,
      },
      include: {
        portfolioItems: true,
        newInvestments: true,
      },
    });

    if (
      payload.type === "QUARTERLY" &&
      initialCapitalByAccount !== undefined
    ) {
      await upsertAccountInitialCapitalsOnEdit(
        tx,
        profileValue,
        id,
        initialCapitalByAccount,
      );
    }

    await syncInvestmentsForReportTx(tx, profileValue, id, payload.periodLabel, newInvestments);

    return updatedReport;
  });

  revalidatePath("/");
  revalidatePath("/monthly");
  revalidatePath("/quarterly");
  revalidatePath(`/reports/${id}`);
  revalidatePath(`/reports/${id}/edit`);
  return report;
}

// ── 리포트 삭제 ────────────────────────────────────────────
export async function deleteReport(id: number) {
  await prisma.report.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/monthly");
  revalidatePath("/quarterly");
}

// ── 기간 헬퍼 (월별·분기 연동) — 순수 함수는 @/lib/report-period 참고 ──

/** 해당 분기의 Investment 합계(원화) — 월별 납입이 반영된 집계 */
export async function sumMonthlyNewInvestmentsInQuarterKrw(profile: string, year: number, quarter: number) {
  const profileId = await resolveProfileIdFromLabel(prisma, profile);
  return sumInvestmentForProfileQuarterKrw(profileId, year, quarter);
}

/** 분기 목록 카드·상세와 동일한 구간 수익(Investment 기준 당기 납입) */
export async function getQuarterlyArchiveWithIntervals(profileLabel: string) {
  const reports = await prisma.report.findMany({
    where: { profile: profileLabel, type: "QUARTERLY" },
    include: { portfolioItems: true, newInvestments: true },
  });
  reports.sort(
    (a, b) => parsePeriodLabel(a.periodLabel).getTime() - parsePeriodLabel(b.periodLabel).getTime(),
  );

  const profileId = await resolveProfileIdFromLabel(prisma, profileLabel);
  const invRows = await prisma.profileInvestment.findMany({
    where: { profileId },
    select: { date: true, amountKrw: true },
  });
  const byQuarter = buildInvestmentSumByQuarterKey(invRows);

  const slices = reports.map((r) => {
    const pq = parseQuarterlyPeriodYearQuarter(r.periodLabel);
    const periodNewInflowKrw = pq ? byQuarter.get(`${pq.year}-Q${pq.quarter}`) ?? 0 : 0;
    const totalCurrentKrw =
      r.portfolioItems.reduce((s, i) => s + i.krwAmount, 0) ||
      r.totalCurrentKrw ||
      0;
    return { totalCurrentKrw, periodNewInflowKrw };
  });

  const intervalRows = slices.map((_, index) =>
    deriveQuarterlyIntervalPerformance(slices, index),
  );

  return reports.map((report, index) => ({
    report,
    intervalGainKrw: intervalRows[index].intervalGainKrw,
    intervalReturnRatePercent: intervalRows[index].intervalReturnRatePercent,
  }));
}
