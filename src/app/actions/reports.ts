"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { AssetRole, ReportType, ReportStatus } from "@/generated/prisma";

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

// ── 리포트 목록 (전체 / 타입별 필터) ────────────────────────
export async function listReports(type?: ReportTypeInput, profile?: string) {
  const reports = await prisma.report.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(profile ? { profile } : {}),
    },
    include: {
      portfolioItems: true,
      newInvestments: true,
    },
  });
  
  // periodLabel 기준으로 정렬 (최신순)
  return reports.sort((a, b) => {
    const dateA = parsePeriodLabel(a.periodLabel);
    const dateB = parsePeriodLabel(b.periodLabel);
    return dateB.getTime() - dateA.getTime(); // 내림차순
  });
}

// ── 프로필별 리포트 목록 (최근 순) ───────────────────────────
export async function getReportsByProfile(profile: string) {
  const reports = await prisma.report.findMany({
    where: { profile },
    include: {
      portfolioItems: true,
      newInvestments: true,
    },
  });
  
  
  // periodLabel 기준으로 정렬 (최신순)
  return reports.sort((a, b) => {
    const dateA = parsePeriodLabel(a.periodLabel);
    const dateB = parsePeriodLabel(b.periodLabel);
    return dateB.getTime() - dateA.getTime(); // 내림차순
  });
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

// ── 프로필·타입별 PUBLISHED 리포트 (차트용, 오름차순) ───────────────
export async function getReportsByProfileAndTypePublished(profile: string, type?: ReportTypeInput) {
  const reports = await prisma.report.findMany({
    where: {
      profile,
      status: "PUBLISHED",
      ...(type ? { type } : {}),
    },
    include: {
      portfolioItems: true,
      newInvestments: true,
    },
  });
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

  // 공통: 수치 데이터 필수
  if (typeof totalInvestedKrw !== "number" || totalInvestedKrw < 0) {
    return { ok: false, error: "총 투자금을 입력해주세요." };
  }
  if (typeof totalCurrentKrw !== "number" || totalCurrentKrw < 0) {
    return { ok: false, error: "총 평가금을 입력해주세요." };
  }

  // MONTHLY: 신규 투입금 행 검증
  if (type === "MONTHLY") {
    const incompleteNewInv = newInvestments.filter((inv) => (inv.originalAmount || 0) <= 0);
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
  usdRate: number;
  jpyRate: number;
  totalInvestedKrw: number;
  totalCurrentKrw: number;
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
    accountType: "US_DIRECT" | "ISA" | "JP_DIRECT" | "CASH";
    originalCurrency: "USD" | "KRW" | "JPY";
    originalAmount: number;
    krwAmount: number;
  }[];
  newInvestments?: {
    accountType: "US_DIRECT" | "ISA" | "JP_DIRECT" | "CASH";
    originalCurrency: "USD" | "KRW" | "JPY";
    originalAmount: number;
    krwAmount: number;
  }[];
}

// ── 리포트 생성 ────────────────────────────────────────────
export async function createReport(payload: CreateReportPayload) {
  const { portfolioItems, newInvestments = [], earningsReview, profile, status: statusInput, ...reportData } = payload;

  const status: ReportStatusInput = statusInput ?? "DRAFT";
  const validation = validateReportPayload({ ...payload, status }, status);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const profileValue = profile || "AlphA Holdings Portfolio";

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

  revalidatePath("/");
  revalidatePath("/monthly");
  revalidatePath("/quarterly");
  return report;
}

// ── 리포트 수정 (기본 필드만) ────────────────────────────────────────────
export async function updateReport(
  id: number,
  data: Partial<{
    type: ReportType;
    periodLabel: string;
    usdRate: number;
    jpyRate: number;
    totalInvestedKrw: number;
    totalCurrentKrw: number;
    summary: string;
    journal: string;
    strategy: string;
    earningsReview: string;
  }>
) {
  const report = await prisma.report.update({ where: { id }, data });
  revalidatePath("/");
  revalidatePath("/monthly");
  revalidatePath("/quarterly");
  revalidatePath(`/reports/${id}`);
  return report;
}

// ── 리포트 전체 수정 (포트폴리오 아이템 포함) ──────────────────────────────
export async function updateReportFull(id: number, payload: CreateReportPayload) {
  const { portfolioItems, newInvestments = [], earningsReview, profile, status: statusInput, ...reportData } = payload;

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

// ── 캐시 재검증 헬퍼 ──────────────────────────────────────
export async function revalidateReportPaths() {
  revalidatePath("/");
  revalidatePath("/monthly");
  revalidatePath("/quarterly");
}
