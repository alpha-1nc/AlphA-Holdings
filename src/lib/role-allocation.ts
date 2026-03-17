import type { PortfolioItem } from "@/generated/prisma";
import type { PortfolioStrategy } from "@/generated/prisma";
import type { AssetRole } from "@/generated/prisma";

export type RoleKey = AssetRole | "UNASSIGNED";

export interface RoleAllocationItem {
  role: RoleKey;
  label: string;
  actualWeight: number;   // % of total non-cash portfolio
  targetWeight: number;   // % from PortfolioStrategy (sum of tickers in role)
  krwAmount: number;
  tickers: string[];
}

export const ROLE_LABELS: Record<RoleKey, string> = {
  CORE: "코어",
  GROWTH: "성장",
  BOOSTER: "부스터",
  DEFENSIVE: "방어",
  INDEX: "지수",
  UNASSIGNED: "미지정",
};

export const ROLE_COLORS: Record<RoleKey, string> = {
  CORE: "#6366F1",
  GROWTH: "#10B981",
  BOOSTER: "#F59E0B",
  DEFENSIVE: "#3B82F6",
  INDEX: "#8B5CF6",
  UNASSIGNED: "#A3A3A3",
};

/**
 * Merges portfolio items with strategy data to compute per-role actual vs target weights.
 * Cash (accountType === "CASH") is excluded from weight calculations.
 *
 * Target weight is summed from the full strategies array (regardless of holdings).
 * Roles with target >= 1% are always included, even when actual weight is 0%.
 */
export function computeRoleAllocation(
  items: PortfolioItem[],
  strategies: PortfolioStrategy[],
): RoleAllocationItem[] {
  const nonCashItems = items.filter(
    (i) => i.accountType !== "CASH" && i.krwAmount > 0,
  );
  const totalKrw = nonCashItems.reduce((s, i) => s + i.krwAmount, 0);

  // 1. Target weight per role — from FULL strategies array (보유 여부 무관)
  const targetWeightByRole = new Map<RoleKey, number>();
  for (const s of strategies) {
    const role: RoleKey = s.role ?? "UNASSIGNED";
    const current = targetWeightByRole.get(role) ?? 0;
    targetWeightByRole.set(role, current + (s.targetWeight ?? 0));
  }

  // 2. Actual weight per role — from held items only
  const strategyMap = new Map<string, PortfolioStrategy>();
  for (const s of strategies) {
    strategyMap.set(s.ticker.toUpperCase(), s);
  }

  // 현금성 티커 목록 — 이름/티커에 '현금', '💵', CASH 등이 포함된 항목은 미지정 분류 대상에서 완전 제외
  const CASH_TICKER_PATTERNS = /^(KRW|USD|JPY|EUR|GBP|CNY|CASH|현금)$/i;
  const isCashLike = (item: PortfolioItem): boolean => {
    const t = (item.ticker ?? "").trim();
    const n = (item as { name?: string }).name ?? "";
    if (!t && !n) return false;
    return (
      n.includes("현금") ||
      n.includes("💵") ||
      t.includes("현금") ||
      t.includes("💵") ||
      CASH_TICKER_PATTERNS.test(t) ||
      t.toUpperCase() === "CASH"
    );
  };

  const actualByRole = new Map<
    RoleKey,
    { krwAmount: number; tickers: string[] }
  >();
  for (const item of nonCashItems) {
    if (isCashLike(item)) continue;
    const strategy = strategyMap.get(item.ticker.toUpperCase());
    const role: RoleKey = strategy?.role ?? "UNASSIGNED";
    const existing = actualByRole.get(role) ?? {
      krwAmount: 0,
      tickers: [],
    };
    actualByRole.set(role, {
      krwAmount: existing.krwAmount + item.krwAmount,
      tickers: [...existing.tickers, item.ticker],
    });
  }

  // 3. Include roles: target >= 1% from strategies OR has actual holdings
  const roleOrder: RoleKey[] = [
    "CORE",
    "GROWTH",
    "BOOSTER",
    "DEFENSIVE",
    "INDEX",
    "UNASSIGNED",
  ];

  return roleOrder
    .filter((role) => {
      const targetFromStrategies = targetWeightByRole.get(role) ?? 0;
      const actualData = actualByRole.get(role);
      return (
        targetFromStrategies >= 1 ||
        (actualData != null && actualData.krwAmount > 0)
      );
    })
    .map((role) => {
      const targetWeight = targetWeightByRole.get(role) ?? 0;
      const actualData = actualByRole.get(role) ?? {
        krwAmount: 0,
        tickers: [],
      };
      const actualWeight =
        totalKrw > 0 ? (actualData.krwAmount / totalKrw) * 100 : 0;
      return {
        role,
        label: ROLE_LABELS[role],
        actualWeight,
        targetWeight,
        krwAmount: actualData.krwAmount,
        tickers: actualData.tickers,
      };
    });
}
