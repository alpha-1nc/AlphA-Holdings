import type { PortfolioItem } from "@/generated/prisma";

/** 비현금(종목) 먼저, 현금(CASH) 나중. 각 그룹 내 원화 평가액 내림차순 */
export function sortPortfolioItemsForDisplay(items: PortfolioItem[]): PortfolioItem[] {
  return [...items].sort((a, b) => {
    const aCash = a.accountType === "CASH";
    const bCash = b.accountType === "CASH";
    if (aCash !== bCash) return aCash ? 1 : -1;
    return b.krwAmount - a.krwAmount;
  });
}

/** 분기 폼 행: 종목 먼저, 현금 나중. 그룹 내 원화 환산액 내림차순 */
export function sortPortfolioFormRowsByDisplay<T extends { kind: "stock" | "cash" }>(
  rows: T[],
  rowKrw: (row: T) => number
): T[] {
  return [...rows].sort((a, b) => {
    const aCash = a.kind === "cash";
    const bCash = b.kind === "cash";
    if (aCash !== bCash) return aCash ? 1 : -1;
    return rowKrw(b) - rowKrw(a);
  });
}
