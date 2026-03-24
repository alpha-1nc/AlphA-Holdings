import type { PortfolioItem } from "@/generated/prisma";
import type { PortfolioStrategy } from "@/generated/prisma";
import type { AssetRole } from "@/generated/prisma";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";

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

function isCashLike(item: PortfolioItem): boolean {
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

/**
 * 기능 A: 역할군 비중 — 최신 리포트의 PortfolioItem만 사용, Strategy 테이블 미참조.
 * 각 아이템의 role 값 기준으로 실제 비중(%)을 그룹화하여 반환. (도넛 차트용)
 */
export function computeRoleAllocation(items: PortfolioItem[]): RoleAllocationItem[] {
  const nonCashItems = items.filter(
    (i) => i.accountType !== "CASH" && i.krwAmount > 0 && !isCashLike(i),
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
 * 기능 B: 종목별 목표 대비 괴리율.
 * PortfolioStrategy(목표 포트폴리오)의 개별 종목을 기준으로,
 * 최신 리포트 PortfolioItem의 실제 비중을 매핑.
 * 실제 보유율이 0%인 목표 종목도 포함.
 */
export function computeTickerDeviation(
  items: PortfolioItem[],
  strategies: PortfolioStrategy[],
): TickerDeviationItem[] {
  const nonCashItems = items.filter(
    (i) => i.accountType !== "CASH" && i.krwAmount > 0,
  );
  const totalKrw = nonCashItems.reduce((s, i) => s + i.krwAmount, 0);

  // 실제 비중: 티커별 krwAmount 합산 (동일 종목 여러 계좌 보유 시 합산)
  const actualKrwByTicker = new Map<string, number>();
  for (const item of nonCashItems) {
    const key = item.ticker.trim().toUpperCase();
    const current = actualKrwByTicker.get(key) ?? 0;
    actualKrwByTicker.set(key, current + item.krwAmount);
  }

  return strategies.map((s) => {
    const ticker = s.ticker.trim().toUpperCase();
    const targetWeight = s.targetWeight ?? 0;
    const actualKrw = actualKrwByTicker.get(ticker) ?? 0;
    const actualWeight =
      totalKrw > 0 ? (actualKrw / totalKrw) * 100 : 0;
    const diff = actualWeight - targetWeight;
    return {
      ticker: s.ticker,
      displayLabel: getPortfolioItemDisplayLabel({
        ticker: s.ticker,
        displayName: (s as { displayName?: string | null }).displayName,
      }),
      targetWeight,
      actualWeight,
      diff,
    };
  });
}
