import { AccountType } from "@/generated/prisma";
import type { PortfolioItem } from "@/generated/prisma";

export const ACCOUNT_GROUPS = {
  직투: [AccountType.US_DIRECT, AccountType.KR_DIRECT, AccountType.JP_DIRECT],
  ISA: [AccountType.ISA],
  연금저축: [AccountType.PENSION],
} as const;

export type AccountGroupKey = keyof typeof ACCOUNT_GROUPS;

/** 대시보드 URL `?group=` 및 세그먼트와 동일한 필터 */
export type DashboardAccountGroupFilter = "all" | AccountGroupKey;

/** 대시보드 계좌 필터 → AccountType 목록 (ACCOUNT_GROUPS만 사용) */
export function accountTypesForDashboardGroup(
  group: DashboardAccountGroupFilter
): AccountType[] {
  if (group === "all") {
    const set = new Set<AccountType>();
    (Object.keys(ACCOUNT_GROUPS) as AccountGroupKey[]).forEach((k) => {
      for (const t of ACCOUNT_GROUPS[k]) {
        set.add(t);
      }
    });
    return Array.from(set);
  }
  return [...ACCOUNT_GROUPS[group]];
}

// 계좌 뱃지 표시용
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  US_DIRECT: "🇺🇸 미국",
  KR_DIRECT: "🇰🇷 한국",
  JP_DIRECT: "🇯🇵 일본",
  ISA: "ISA",
  PENSION: "연금저축",
  CASH: "현금",
};

// 종목 추가 드롭다운용 — 직투 탭에서만 사용
export const DIRECT_ACCOUNT_OPTIONS = [
  { value: AccountType.US_DIRECT, label: "🇺🇸 미국 직투" },
  { value: AccountType.KR_DIRECT, label: "🇰🇷 한국 직투" },
  { value: AccountType.JP_DIRECT, label: "🇯🇵 일본 직투" },
];

// accountType → 그룹 키 역방향 조회
export function getGroupKey(accountType: AccountType): AccountGroupKey | null {
  for (const [key, types] of Object.entries(ACCOUNT_GROUPS)) {
    if ((types as readonly AccountType[]).includes(accountType)) {
      return key as AccountGroupKey;
    }
  }
  return null;
}

/** 분기 리포트 현금 행(DB accountType CASH) — displayName/ticker로 ISA·연금 구분 보조 */
export function isIsaCashHint(item: PortfolioItem): boolean {
  const t = `${item.displayName ?? ""} ${item.ticker ?? ""}`.toUpperCase();
  return t.includes("ISA");
}

export function isPensionCashHint(item: PortfolioItem): boolean {
  const t = `${item.displayName ?? ""} ${item.ticker ?? ""}`;
  return t.includes("연금") || t.toUpperCase().includes("PENSION");
}

/**
 * 대시보드 계좌 필터와 연동 — DB에는 현금이 accountType CASH로만 저장되므로
 * 통화·표시명 힌트로 그룹을 나눕니다.
 */
export function cashBelongsToDashboardGroup(
  item: PortfolioItem,
  group: DashboardAccountGroupFilter,
): boolean {
  if (item.accountType !== "CASH") return false;
  if (group === "all") return true;
  if (group === "ISA") return isIsaCashHint(item);
  if (group === "연금저축") return isPensionCashHint(item);
  if (group === "직투") {
    return !isIsaCashHint(item) && !isPensionCashHint(item);
  }
  return false;
}

/** 필터 그룹에 속하는 포트폴리오 행(종목 + 해당 그룹에 포함되는 현금) */
export function portfolioItemsForDashboardGroup(
  items: PortfolioItem[],
  group: DashboardAccountGroupFilter,
): PortfolioItem[] {
  const types = accountTypesForDashboardGroup(group);
  return items.filter((i) => {
    if (i.krwAmount <= 0) return false;
    if (i.accountType === "CASH") return cashBelongsToDashboardGroup(i, group);
    return types.includes(i.accountType);
  });
}

/** 대시보드 상단·분기 추이용 총 평가금(현금 포함, 그룹 필터 반영) */
export function sumPortfolioValueKrwForDashboardGroup(
  items: PortfolioItem[],
  group: DashboardAccountGroupFilter,
): number {
  return portfolioItemsForDashboardGroup(items, group).reduce((s, i) => s + i.krwAmount, 0);
}
