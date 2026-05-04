import type { PortfolioItem } from "@/generated/prisma";
import type { AccountGroupKey } from "@/lib/accountGroups";
import { portfolioItemsForDashboardGroup } from "@/lib/accountGroups";
import { portfolioTickerAccountKey } from "@/lib/role-allocation";

/** 순환 채색 슬롯 개수 (`--chart-1` … `--chart-7` 과 대응). `--donut-8`은 기타 전용으로 순환에서 제외 */
export const DONUT_PALETTE_SLOTS = 7;

/** ISA·연금 카드 PortfolioSegmentBar 의 colorOffset 과 동일 (직투 도넛은 offset 0) */
function donutPaletteOffsetForGroup(group: AccountGroupKey): number {
    if (group === "ISA") return 2;
    if (group === "연금저축") return 4;
    return 0;
}

/**
 * 직투 Pie / ISA·연금 세그먼트 바와 동일: 그룹 내 금액 내림차순 슬라이스 i에
 * `var(--donut-${((i+offset)%7)+1})` (chart 순서) 색을 쓰는 것과 같은 규칙으로
 * (티커|계좌) → CSS 변수 문자열 lookup.
 */
export function buildDonutGaugeColorVarsByTickerAccount(
    portfolioItems: PortfolioItem[],
    group: AccountGroupKey,
): Map<string, string> {
    const raw = portfolioItemsForDashboardGroup(portfolioItems, group).filter(
        (i) => i.accountType !== "CASH" && i.krwAmount > 0,
    );
    const sorted = [...raw].sort((a, b) => b.krwAmount - a.krwAmount);
    const offset = donutPaletteOffsetForGroup(group);
    const map = new Map<string, string>();

    for (let i = 0; i < sorted.length; i++) {
        const key = portfolioTickerAccountKey(sorted[i].ticker, sorted[i].accountType);
        if (!map.has(key)) {
            const slot = ((i + offset) % DONUT_PALETTE_SLOTS) + 1;
            map.set(key, `var(--donut-${slot})`);
        }
    }
    return map;
}
