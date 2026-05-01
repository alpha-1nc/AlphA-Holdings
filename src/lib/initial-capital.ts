import type { PrismaClient } from "@/generated/prisma";

/** 분기 리포트 최초 계좌별 초기 원금 (CASH 제외) */
export type InitialCapitalAccountType =
  | "US_DIRECT"
  | "KR_DIRECT"
  | "JP_DIRECT"
  | "ISA"
  | "PENSION";

export const INITIAL_CAPITAL_ACCOUNT_TYPES: InitialCapitalAccountType[] = [
  "US_DIRECT",
  "KR_DIRECT",
  "JP_DIRECT",
  "ISA",
  "PENSION",
];

/** Prisma `$transaction` 콜백 등 — 초기 원금 upsert 시 사용 */
export type PrismaTransaction = Pick<
  PrismaClient,
  "profile" | "report" | "accountInitialCapital" | "profileInvestment"
>;
