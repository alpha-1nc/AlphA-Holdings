/**
 * 분기 목록(getQuarterlyArchiveWithIntervals)과 상세(getQuarterlyReportFinancialSummary)의
 * 구간 수익금·수익률 일치 여부를 마지막 분기 리포트 기준으로 출력합니다.
 *
 * npx tsx scripts/verify-investment-metrics.ts
 */
import "./load-env-before-prisma.ts";

import {
  getQuarterlyArchiveWithIntervals,
  getQuarterlyReportFinancialSummary,
  getProfileCumulativePrincipalKrw,
} from "../src/app/actions/reports";
import { getDashboardQuarterlyMetrics } from "../src/app/actions/dashboard";
import { calcAccountCapital } from "../src/lib/calcCapital";
import { AccountType } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";

const PROFILE = process.env.VERIFY_PROFILE_LABEL ?? "AlphA Holdings Portfolio";

async function main() {
  const archive = await getQuarterlyArchiveWithIntervals(PROFILE);
  if (archive.length === 0) {
    console.log("분기별 리포트가 없습니다.");
    return;
  }
  const last = archive[archive.length - 1];
  const summary = await getQuarterlyReportFinancialSummary(last.report.id);

  const pid = await prisma.profile.findUnique({ where: { label: PROFILE } });
  const allTypes: AccountType[] = [
    "US_DIRECT",
    "KR_DIRECT",
    "JP_DIRECT",
    "ISA",
    "PENSION",
    "CASH",
  ];
  const cap = await calcAccountCapital(pid?.id ?? null, allTypes, PROFILE);
  const cum = await getProfileCumulativePrincipalKrw(PROFILE);
  const dash = await getDashboardQuarterlyMetrics(PROFILE, "all");

  console.log("프로필:", PROFILE);
  console.log("목록(마지막 분기) 구간 수익금 / 수익률(%):", last.intervalGainKrw, last.intervalReturnRatePercent);
  console.log("상세(동일 리포트 id) 분기 수익금 / 분기 수익률(%):", summary?.quarterlyProfitKrw, summary?.quarterlyProfitRatePercent);
  console.log(
    "구간 일치(부동소수):",
    summary != null &&
      Math.abs(summary.quarterlyProfitKrw - last.intervalGainKrw) < 1 &&
      Math.abs(summary.quarterlyProfitRatePercent - last.intervalReturnRatePercent) < 0.0001,
  );
  console.log("누적 원금 폼(getProfileCumulativePrincipalKrw):", cum);
  console.log("계좌 전체 누적 원금(calcAccountCapital·전 계좌):", cap);
  console.log(
    "대시보드 요약 총 투자금:",
    dash.summary?.totalInvested,
    "↔ cum/cap 일치:",
    dash.summary != null &&
      Math.abs(dash.summary.totalInvested - cum) < 1 &&
      Math.abs(dash.summary.totalInvested - cap) < 1,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
