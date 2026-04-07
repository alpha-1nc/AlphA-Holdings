/** 분기 리포트 최초 계좌별 초기 원금 (CASH 제외) */
export type InitialCapitalAccountType =
  | "US_DIRECT"
  | "KR_DIRECT"
  | "JP_DIRECT"
  | "ISA"
  | "PENSION";

export const INITIAL_CAPITAL_ACCOUNT_TYPES: readonly InitialCapitalAccountType[] = [
  "US_DIRECT",
  "KR_DIRECT",
  "JP_DIRECT",
  "ISA",
  "PENSION",
] as const;
