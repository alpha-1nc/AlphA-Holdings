import type { PortfolioItem } from "@/generated/prisma";
import type { PortfolioStrategy } from "@/generated/prisma";
import type { AccountType, AssetRole } from "@/generated/prisma";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";
import {
  ACCOUNT_GROUPS,
  type AccountGroupKey,
} from "@/lib/accountGroups";

export type RoleKey = AssetRole | "UNASSIGNED";

export interface RoleAllocationItem {
  role: RoleKey;
  label: string;
  actualWeight: number;   // % of total non-cash portfolio
  targetWeight: number;   // Feature A: 항상 0 (Strategy 미참조). 하위 호환용 유지.
  krwAmount: number;
  /** 역할군 툴팁에 표시할 종목 라벨(티커가 아닌 표시명) */
  holdingLabels: string[];
}

/** 종목별 목표 대비 괴리율 (기능 B) */
export interface TickerDeviationItem {
  ticker: string;
  accountType: AccountType;
  displayLabel: string;
  targetWeight: number;
  actualWeight: number;
  diff: number;  // actualWeight - targetWeight
}

export const ROLE_LABELS: Record<RoleKey, string> = {
  CORE: "코어",
  GROWTH: "성장",
  BOOSTER: "부스터",
  DEFENSIVE: "방어",
  INDEX: "지수",
  UNASSIGNED: "미지정",
};

/** 역할별 고유 색상 - 서로 명확히 구별되도록 선정 */
export const ROLE_COLORS: Record<RoleKey, string> = {
  CORE: "#2563EB",      // blue - 중심/안정
  GROWTH: "#059669",    // emerald - 성장
  BOOSTER: "#D97706",   // amber - 부스터
  DEFENSIVE: "#0891B2", // cyan - 방어
  INDEX: "#EC4899",     // pink - 지수
  UNASSIGNED: "#6B7280", // gray - 미지정
};

const CASH_TICKER_PATTERNS = /^(KRW|USD|JPY|EUR|GBP|CNY|CASH|현금)$/i;

/** 도넛·비중 계산 등에서 현금/현금성 행 식별 */
export function isCashLikePortfolioItem(item: PortfolioItem): boolean {
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
}

function strategyCompositeKey(ticker: string, accountType: AccountType): string {
  return `${ticker.trim().toUpperCase()}|${accountType}`;
}

/**
 * 기능 A: 역할군 비중 — 최신 리포트의 PortfolioItem만 사용, Strategy 테이블 미참조.
 * 각 아이템의 role 값 기준으로 실제 비중(%)을 그룹화하여 반환. (도넛 차트용)
 */
export function computeRoleAllocation(items: PortfolioItem[]): RoleAllocationItem[] {
  const nonCashItems = items.filter(
    (i) => i.accountType !== "CASH" && i.krwAmount > 0 && !isCashLikePortfolioItem(i),
  );
  const totalKrw = nonCashItems.reduce((s, i) => s + i.krwAmount, 0);

  const actualByRole = new Map<
    RoleKey,
    { krwAmount: number; holdingLabels: string[] }
  >();

  for (const item of nonCashItems) {
    const itemRole = (item as { role?: AssetRole | null }).role;
    const role: RoleKey = (itemRole != null ? (itemRole as RoleKey) : "UNASSIGNED");
    const existing = actualByRole.get(role) ?? { krwAmount: 0, holdingLabels: [] };
    const label = getPortfolioItemDisplayLabel({
      ticker: item.ticker,
      displayName: (item as { displayName?: string | null }).displayName,
    });
    actualByRole.set(role, {
      krwAmount: existing.krwAmount + item.krwAmount,
      holdingLabels: [...existing.holdingLabels, label],
    });
  }

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
      const data = actualByRole.get(role);
      return data != null && data.krwAmount > 0;
    })
    .map((role) => {
      const data = actualByRole.get(role) ?? { krwAmount: 0, holdingLabels: [] };
      const actualWeight =
        totalKrw > 0 ? (data.krwAmount / totalKrw) * 100 : 0;
      return {
        role,
        label: ROLE_LABELS[role],
        actualWeight,
        targetWeight: 0,  // 기능 A: Strategy 미참조
        krwAmount: data.krwAmount,
        holdingLabels: data.holdingLabels,
      };
    });
}

/**
 * 계좌 그룹별 목표 대비 괴리율 (최신 리포트 PortfolioItem 기준, 그룹 내 총액 대비 비중).
 * 해당 그룹에 보유 종목이 없으면 빈 배열.
 */
export function computeTickerDeviationsByAccountGroups(
  items: PortfolioItem[],
  strategies: PortfolioStrategy[],
): Record<AccountGroupKey, TickerDeviationItem[]> {
  const strategyMap = new Map<string, PortfolioStrategy>();
  for (const s of strategies) {
    strategyMap.set(
      strategyCompositeKey(s.ticker, s.accountType),
      s,
    );
  }

  const result = {} as Record<AccountGroupKey, TickerDeviationItem[]>;
  const groupKeys = Object.keys(ACCOUNT_GROUPS) as AccountGroupKey[];

  for (const groupKey of groupKeys) {
    const types = ACCOUNT_GROUPS[groupKey];
    const rawItems = items.filter(
      (i) =>
        i.accountType !== "CASH" &&
        i.krwAmount > 0 &&
        (types as readonly AccountType[]).includes(i.accountType),
    );

    if (rawItems.length === 0) {
      result[groupKey] = [];
      continue;
    }

    const merged = new Map<
      string,
      { ticker: string; accountType: AccountType; krwAmount: number; displayName: string | null | undefined }
    >();
    for (const i of rawItems) {
      const k = strategyCompositeKey(i.ticker, i.accountType);
      const prev = merged.get(k);
      const displayName = (i as { displayName?: string | null }).displayName;
      merged.set(k, {
        ticker: i.ticker,
        accountType: i.accountType,
        krwAmount: (prev?.krwAmount ?? 0) + i.krwAmount,
        displayName: prev?.displayName ?? displayName,
      });
    }

    const totalKrw = [...merged.values()].reduce((s, x) => s + x.krwAmount, 0);

    const mergedSorted = [...merged.values()].sort((a, b) => b.krwAmount - a.krwAmount);
    const rows: TickerDeviationItem[] = [];
    for (const row of mergedSorted) {
      const sk = strategyCompositeKey(row.ticker, row.accountType);
      const strat = strategyMap.get(sk);
      const targetWeight = strat?.targetWeight ?? 0;
      const actualWeight =
        totalKrw > 0 ? (row.krwAmount / totalKrw) * 100 : 0;
      const diff = actualWeight - targetWeight;
      const displayLabel = getPortfolioItemDisplayLabel({
        ticker: row.ticker,
        displayName: strat?.displayName ?? row.displayName,
      });
      rows.push({
        ticker: row.ticker,
        accountType: row.accountType,
        displayLabel,
        targetWeight,
        actualWeight,
        diff,
      });
    }

    result[groupKey] = rows;
  }

  return result;
}

/**
 * 기능 B: 종목별 목표 대비 괴리율 (AI·호환용 — 전체 그룹 결과를 평탄화).
 */
export function computeTickerDeviation(
  items: PortfolioItem[],
  strategies: PortfolioStrategy[],
): TickerDeviationItem[] {
  const byGroup = computeTickerDeviationsByAccountGroups(items, strategies);
  return [...byGroup.직투, ...byGroup.ISA, ...byGroup.연금저축];
}
