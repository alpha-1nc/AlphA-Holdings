"use server";

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import type { AssetRole, ReportType, ReportStatus } from "@/generated/prisma";
import {
  getPreviousMonthPeriodLabel,
  monthPeriodLabelsInQuarter,
  quarterEndMonthPeriodLabel,
} from "@/lib/report-period";
import { INITIAL_CAPITAL_ACCOUNT_TYPES, type InitialCapitalAccountType } from "@/lib/initial-capital";

type DbForInitialCapital = Pick<PrismaClient, "profile" | "report" | "accountInitialCapital">;

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

async function upsertAccountInitialCapitalsIfApplicable(
  db: DbForInitialCapital,
  profileLabel: string,
  reportId: number,
  initialCapitalByAccount: Partial<Record<InitialCapitalAccountType, number>> | undefined,
): Promise<void> {
  if (initialCapitalByAccount == null) return;
  const profileId = await resolveProfileIdFromLabel(db, profileLabel);
  const [totalQuarterly, icCount] = await Promise.all([
    db.report.count({ where: { profile: profileLabel, type: "QUARTERLY" } }),
    db.accountInitialCapital.count({ where: { profileId } }),
  ]);
  const showInitialCapitalSection = totalQuarterly === 1 || icCount === 0;
  if (!showInitialCapitalSection) return;

  for (const accountType of INITIAL_CAPITAL_ACCOUNT_TYPES) {
    const raw = initialCapitalByAccount[accountType];
    const krwAmount = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    await db.accountInitialCapital.upsert({
      where: { profileId_accountType: { profileId, accountType } },
      create: { profileId, accountType, krwAmount, reportId },
      update: {},
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
  const { type, periodLabel, totalInvestedKrw, totalCurrentKrw, portfolioItems, newInvestments = [], summary, journal, strategy, earningsReview } = payload;

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

  // 분기별: 환율·총액 필수 (월별은 null 허용)
  if (type === "QUARTERLY") {
    if (typeof totalInvestedKrw !== "number" || totalInvestedKrw < 0) {
      return { ok: false, error: "총 투자금을 입력해주세요." };
    }
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

  const report = await prisma.report.create({
    data: createData,
    include,
  });

  if (payload.type === "QUARTERLY") {
    await upsertAccountInitialCapitalsIfApplicable(
      prisma,
      profileValue,
      report.id,
      initialCapitalByAccount,
    );
  }

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
    initialCapitalByAccount: _initialCapitalIgnored,
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

  const status: ReportStatusInput = statusInput ?? "DRAFT";
  const validation = validateReportPayload({ ...payload, status }, status);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

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

/** 직전 월별 리포트의 말일 누적 원금(없으면 null) */
export async function getPreviousMonthEndPrincipalKrw(profile: string, currentMonthlyPeriodLabel: string) {
  const prev = getPreviousMonthPeriodLabel(currentMonthlyPeriodLabel);
  if (!prev) return null;
  const r = await prisma.report.findFirst({
    where: { profile, type: "MONTHLY", periodLabel: prev },
    select: { totalInvestedKrw: true },
  });
  return r?.totalInvestedKrw ?? null;
}

/** 직전 월 리포트 존재 여부 + 말일 누적 원금 (최초 작성 vs 연속 구분용) */
export async function getPreviousMonthMonthlyReportPrincipalState(
  profile: string,
  currentMonthlyPeriodLabel: string,
): Promise<{ hasPreviousReport: boolean; totalInvestedKrw: number | null }> {
  const prev = getPreviousMonthPeriodLabel(currentMonthlyPeriodLabel);
  if (!prev) return { hasPreviousReport: false, totalInvestedKrw: null };
  const r = await prisma.report.findFirst({
    where: { profile, type: "MONTHLY", periodLabel: prev },
    select: { totalInvestedKrw: true },
  });
  if (!r) return { hasPreviousReport: false, totalInvestedKrw: null };
  return { hasPreviousReport: true, totalInvestedKrw: r.totalInvestedKrw };
}

/** 분기 말 월(3·6·9·12월) 월별 리포트의 누적 원금 — 분기 원금 기준으로 사용 */
export async function getQuarterEndPrincipalFromMonthlyReports(profile: string, year: number, quarter: number) {
  const label = quarterEndMonthPeriodLabel(year, quarter);
  const r = await prisma.report.findFirst({
    where: { profile, type: "MONTHLY", periodLabel: label },
    select: { totalInvestedKrw: true },
  });
  return r?.totalInvestedKrw ?? null;
}

/** 해당 분기에 속한 월별 리포트들의 신규 투입 합계(원화) */
export async function sumMonthlyNewInvestmentsInQuarterKrw(profile: string, year: number, quarter: number) {
  const labels = monthPeriodLabelsInQuarter(year, quarter);
  const reports = await prisma.report.findMany({
    where: { profile, type: "MONTHLY", periodLabel: { in: labels } },
    include: { newInvestments: true },
  });
  let sum = 0;
  for (const r of reports) {
    for (const inv of r.newInvestments) {
      sum += inv.krwAmount;
    }
  }
  return sum;
}
