"use server";

import { prisma } from "@/lib/prisma";
import { parseReportPeriodEndDate } from "@/lib/report-period";
import { calcAccountCapital, sumNewInvestmentsForAccounts } from "@/lib/calcCapital";
import {
  accountTypesForDashboardGroup,
  sumPortfolioValueKrwForDashboardGroup,
  type DashboardAccountGroupFilter,
} from "@/lib/accountGroups";
import { computeGainKrw, computeReturnRatePercent } from "@/lib/report-performance";

async function resolveProfileId(profileLabel: string): Promise<string | null> {
  const p = await prisma.profile.findUnique({ where: { label: profileLabel } });
  return p?.id ?? null;
}

export type QuarterlyDashboardSeriesPoint = {
  periodLabel: string;
  totalInvested: number;
  totalCurrent: number;
  profit: number;
  returnRate: number;
};

export type DashboardQuarterlyMetrics = {
  summary: {
    periodLabel: string;
    totalInvested: number;
    totalCurrent: number;
    profit: number;
    returnRate: number;
  } | null;
  series: QuarterlyDashboardSeriesPoint[];
};

/**
 * 분기별 리포트 기준 대시보드 상단 카드·추이 그래프용 수치.
 * 상단 총 투자금은 calcAccountCapital(전체 누적), 추이 시리즈는 분기 말 시점까지의 누적 납입 기준.
 */
export async function getDashboardQuarterlyMetrics(
  profileLabel: string,
  group: DashboardAccountGroupFilter
): Promise<DashboardQuarterlyMetrics> {
  const profileId = await resolveProfileId(profileLabel);
  const accountTypes = accountTypesForDashboardGroup(group);

  const reports = await prisma.report.findMany({
    where: { profile: profileLabel, status: "PUBLISHED" },
    include: { newInvestments: true, portfolioItems: true },
  });

  reports.sort(
    (a, b) =>
      parseReportPeriodEndDate(a.periodLabel).getTime() -
      parseReportPeriodEndDate(b.periodLabel).getTime()
  );

  const quarterlyAsc = reports.filter((r) => r.type === "QUARTERLY");

  if (quarterlyAsc.length === 0) {
    return { summary: null, series: [] };
  }

  const initialSum =
    profileId != null
      ? (
          await prisma.accountInitialCapital.findMany({
            where: { profileId, accountType: { in: accountTypes } },
          })
        ).reduce((s, c) => s + c.krwAmount, 0)
      : 0;

  const series: QuarterlyDashboardSeriesPoint[] = quarterlyAsc.map((q) => {
    const qEnd = parseReportPeriodEndDate(q.periodLabel).getTime();
    let cumulativeNew = 0;
    for (const r of reports) {
      if (parseReportPeriodEndDate(r.periodLabel).getTime() <= qEnd) {
        cumulativeNew += sumNewInvestmentsForAccounts(r.newInvestments, accountTypes);
      }
    }
    const totalInvested = initialSum + cumulativeNew;
    const totalCurrent = sumPortfolioValueKrwForDashboardGroup(q.portfolioItems, group);
    const profit = computeGainKrw(totalCurrent, totalInvested);
    const returnRate = computeReturnRatePercent(totalCurrent, totalInvested);
    return {
      periodLabel: q.periodLabel,
      totalInvested,
      totalCurrent,
      profit,
      returnRate,
    };
  });

  const latestQuarter = quarterlyAsc[quarterlyAsc.length - 1];
  const totalInvestedSummary = await calcAccountCapital(
    profileId,
    accountTypes,
    profileLabel
  );
  const totalCurrentSummary = sumPortfolioValueKrwForDashboardGroup(
    latestQuarter.portfolioItems,
    group
  );
  const profit = computeGainKrw(totalCurrentSummary, totalInvestedSummary);
  const returnRate = computeReturnRatePercent(totalCurrentSummary, totalInvestedSummary);

  const summary = {
    periodLabel: latestQuarter.periodLabel,
    totalInvested: totalInvestedSummary,
    totalCurrent: totalCurrentSummary,
    profit,
    returnRate,
  };

  return { summary, series };
}
