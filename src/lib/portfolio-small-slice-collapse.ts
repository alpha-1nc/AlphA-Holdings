/** 개별 슬라이스 비중(%)이 이 값 이하이면 레전드·도넛·바에서 "기타"로 합산 */
export const SMALL_SLICE_MAX_PERCENT = 10;

/** weight가 이미 포트폴리오 내 비율(%)인 행 묶기 */
export function collapseWeightPercentSegments(
    segments: readonly { name: string; weight: number }[],
    options?: { thresholdPercent?: number; otherLabel?: string },
): { name: string; weight: number }[] {
    const threshold = options?.thresholdPercent ?? SMALL_SLICE_MAX_PERCENT;
    const otherLabel = options?.otherLabel ?? "기타";

    const positives = segments.filter((s) => s.weight > 0);
    if (positives.length === 0) return [];

    const major = positives.filter((s) => s.weight > threshold);
    const minorSum = positives.filter((s) => s.weight <= threshold).reduce((acc, s) => acc + s.weight, 0);

    const majorSorted = [...major].sort((a, b) => b.weight - a.weight);

    if (minorSum <= 1e-9) return majorSorted;

    return [...majorSorted, { name: otherLabel, weight: minorSum }];
}

export interface ValueSliceRow {
    ticker: string;
    name: string;
    value: number;
}

/** `ReportDonutChart` 과 동일: `krwAmount > 0` 인 행만 합산하여 비중(%) 분모로 사용 */
export function totalKrwPositiveHoldings(
    items: readonly { krwAmount: number }[],
): number {
    return items.reduce((s, i) => (i.krwAmount > 0 ? s + i.krwAmount : s), 0);
}

/** 평가금액(value) 기준 비중으로 ≤ threshold% 행 합산 */
export function collapseValueSlicesToOther<T extends ValueSliceRow>(
    slices: readonly T[],
    options?: { thresholdPercent?: number; otherLabel?: string },
): T[] {
    const threshold = options?.thresholdPercent ?? SMALL_SLICE_MAX_PERCENT;
    const otherLabel = options?.otherLabel ?? "기타";

    const positives = slices.filter((s) => s.value > 0);
    const total = positives.reduce((s, d) => s + d.value, 0);
    if (total <= 1e-9) return [];

    const withPct = positives.map((d) => ({
        row: d,
        pct: (d.value / total) * 100,
    }));

    const major = withPct.filter((x) => x.pct > threshold);
    const minor = withPct.filter((x) => x.pct <= threshold);

    const majorSorted = [...major].sort((a, b) => b.row.value - a.row.value);
    const out: T[] = majorSorted.map((x) => x.row);

    if (minor.length > 0) {
        const sumValue = minor.reduce((s, x) => s + x.row.value, 0);
        const first = minor[0]!.row;
        out.push({
            ...first,
            ticker: "__OTHER__",
            name: otherLabel,
            value: sumValue,
        } as T);
    }

    return out;
}

/** krwAmount 합계 대비 pct로 작은 줄들을 하나의 블록으로 (분기 리포트 카드 바 등) */
export type CollapsedHoldingBarRow<T extends { id: string | number; krwAmount: number }> =
    | { kind: "single"; item: T; pct: number }
    | { kind: "other"; items: T[]; pct: number };

export function collapseHoldingsForBarDisplay<T extends { id: string | number; krwAmount: number }>(
    sortedHoldings: readonly T[],
    totalKrw: number,
    options?: { thresholdPercent?: number },
): CollapsedHoldingBarRow<T>[] {
    const threshold = options?.thresholdPercent ?? SMALL_SLICE_MAX_PERCENT;
    if (totalKrw <= 1e-9 || sortedHoldings.length === 0) return [];

    const withPct = sortedHoldings.map((item) => ({
        item,
        pct: (item.krwAmount / totalKrw) * 100,
    }));

    const large = withPct.filter((x) => x.pct > threshold);
    const small = withPct.filter((x) => x.pct <= threshold);

    /** `collapseValueSlicesToOther`(도넛)과 동일: 메이저 슬라이스만 평가액 내림차순 */
    const majorSortedDesc = [...large].sort((a, b) => b.item.krwAmount - a.item.krwAmount);

    const rows: CollapsedHoldingBarRow<T>[] = majorSortedDesc.map(({ item, pct }) => ({
        kind: "single" as const,
        item,
        pct,
    }));

    if (small.length > 0) {
        rows.push({
            kind: "other",
            items: small.map((x) => x.item),
            pct: small.reduce((s, x) => s + x.pct, 0),
        });
    }

    return rows;
}
