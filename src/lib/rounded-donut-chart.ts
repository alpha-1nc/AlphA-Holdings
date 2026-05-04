/**
 * Rounded 도넛: 슬라이스 2개 이상일 때 paddingAngle·cornerRadius로 간격과 라운드를 표현.
 * 슬라이스 1개(100%)일 때는 paddingAngle=0 등으로 링이 끊겨 보이지 않게 함.
 */

/** Recharts `Sector`와 동일 (PolarUtils RADIAN). */
const RADIAN = Math.PI / 180;

/** 작은 호에서 cornerRadius 가 호보다 크면 볼록 호가 깨져 각진 path 로 폴백됨 — 라운딩이 필요한 각(도). */
function minSectorDeltaNeededForCornersDeg(cornerEffective: number, innerR: number, outerR: number): number {
  if (cornerEffective <= 0) return 0;
  const c = cornerEffective;
  const outerPivot = outerR - c;
  const innerPivot = innerR + c;
  if (outerPivot <= 1e-6 || innerPivot <= 1e-6) return 360;
  const ratioO = Math.min(c / outerPivot, 1 - 1e-9);
  const ratioI = Math.min(c / innerPivot, 1 - 1e-9);
  const thetaO = Math.asin(ratioO) / RADIAN;
  const thetaI = Math.asin(ratioI) / RADIAN;
  return 2 * Math.max(thetaO, thetaI);
}

/**
 * Recharts Pie `computePieSectors`와 동일한 전제(기본 start 0·end 360, minAngle 0):
 * 가장 작은 슬라이스의 중심각(도).
 */
export function minPieSliceDeltaDegrees(
  positiveWeights: readonly number[],
  paddingAngleDeg: number,
  absDeltaAngle = 360,
): number {
  const nonzero = positiveWeights.filter((w) => w > 0);
  const nz = nonzero.length;
  const total = nonzero.reduce((a, b) => a + b, 0);
  if (total <= 1e-9 || nz <= 1) return absDeltaAngle;
  const totalPad =
    absDeltaAngle >= 360 ? nz * paddingAngleDeg : (nz - 1) * paddingAngleDeg;
  const realTotal = Math.max(1e-6, Math.abs(absDeltaAngle) - totalPad);
  let minFrac = 1;
  for (const w of nonzero) {
    const f = w / total;
    if (f < minFrac) minFrac = f;
  }
  return minFrac * realTotal;
}

/** `minPieSliceDeltaDegrees` 에 맞도록 cornerRadius 상한 적용(Recharts 폴백 방지). */
export function clampDonutCornerRadius(
  desired: number,
  innerRadius: number,
  outerRadius: number,
  minSliceDeltaDegrees: number,
): number {
  const deltaR = outerRadius - innerRadius;
  if (desired <= 0 || deltaR <= 0 || minSliceDeltaDegrees <= 0) return 0;
  let hi = Math.min(desired, deltaR / 2);
  if (hi <= 0) return 0;
  /** Sector.js: 필요 각을 살짝 넘겨 두어 반올림·부동소수 때문에 폴백 나지 않게 */
  const needAtLeast = Math.max(1e-3, minSliceDeltaDegrees - 0.75);
  if (minSectorDeltaNeededForCornersDeg(hi, innerRadius, outerRadius) > needAtLeast) {
    let lo = 0;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (minSectorDeltaNeededForCornersDeg(mid, innerRadius, outerRadius) <= needAtLeast) lo = mid;
      else hi = mid;
    }
    return Math.round(lo * 1000) / 1000;
  }
  return Math.round(hi * 1000) / 1000;
}

export type DonutPieRoundedInput = {
  sliceCount: number;
  weights?: readonly number[];
  innerRadius: number;
  outerRadius: number;
};

/** weights 없음(레거시) 또는 일부 페이지: 작은 조각에서 각진 폴백 가능. */
export function roundedDonutPieProps(sliceCount: number) {
  if (sliceCount <= 1) {
    return {
      paddingAngle: 0,
      cornerRadius: 0,
      strokeWidth: 0,
      stroke: "transparent",
      isAnimationActive: true as const,
      animationDuration: 600,
    } as const;
  }
  return {
    paddingAngle: 6,
    cornerRadius: 10,
    strokeWidth: 0,
    stroke: "transparent",
    isAnimationActive: true as const,
    animationDuration: 600,
  } as const;
}

/**
 * 모든 슬라이스에서 둥근 링 형태 유지(Recharts 각진 폴백 방지) + 디자인용 paddingAngle.
 */
export function donutPieRoundedProps(input: DonutPieRoundedInput) {
  const { sliceCount, weights, innerRadius, outerRadius } = input;

  if (sliceCount <= 1) {
    return {
      paddingAngle: 0,
      cornerRadius: 0,
      strokeWidth: 0 as const,
      stroke: "transparent" as const,
      isAnimationActive: true as const,
      animationDuration: 600,
    } as const;
  }

  const basePaddingAngle = 6;
  const desiredCornerRadius = 10;

  if (!weights?.length) {
    return roundedDonutPieProps(sliceCount);
  }

  const positives = weights.filter((w) => w > 0);
  if (positives.length <= 1) {
    return {
      paddingAngle: 0,
      cornerRadius: 0,
      strokeWidth: 0 as const,
      stroke: "transparent" as const,
      isAnimationActive: true as const,
      animationDuration: 600,
    } as const;
  }

  const minDeg = minPieSliceDeltaDegrees(weights, basePaddingAngle, 360);
  const cornerRadius = clampDonutCornerRadius(
    desiredCornerRadius,
    innerRadius,
    outerRadius,
    minDeg,
  );

  return {
    paddingAngle: basePaddingAngle,
    cornerRadius,
    strokeWidth: 0 as const,
    stroke: "transparent" as const,
    isAnimationActive: true as const,
    animationDuration: 600,
  } as const;
}

/** 기본 리포트용: inner ≈ outer의 70% — 상대적으로 얇은 링 */
export function roundedDonutRadiiPx(options: { compact: boolean }) {
  if (options.compact) {
    return { innerRadius: 47, outerRadius: 68 };
  }
  return { innerRadius: 60, outerRadius: 86 };
}

/** StatisticCard 안 미니 도넛 — 동일 비율 */
export function miniRoundedDonutRadiiPx() {
  return { innerRadius: 35, outerRadius: 50 };
}

/**
 * 모든 도넛 공통 디자인의 기준: 정사각형 차트 박스 변 길이(대시보드 `h-44 w-44` 픽셀).
 * 이 크기일 때 반지름 = inner 37 / outer 73.
 */
export const CANONICAL_DONUT_CHART_REFERENCE_MIN_SIDE_PX = 176;

/**
 * 위 기준 도넛과 동일 두께·구멍 비율 유지하면서 차트 영역 최소변(px)에 맞춤.
 */
export function donutRadiiScaledToMinSidePx(chartMinPx: number): {
  innerRadius: number;
  outerRadius: number;
} {
  const refPx = CANONICAL_DONUT_CHART_REFERENCE_MIN_SIDE_PX;
  const m = Number.isFinite(chartMinPx) && chartMinPx > 32 ? chartMinPx : refPx;
  const s = m / refPx;
  let inner = Math.round(37 * s);
  let outer = Math.round(73 * s);
  if (outer <= inner + 10) outer = inner + Math.max(14, Math.round((73 - 37) * s));
  return { innerRadius: inner, outerRadius: outer };
}

/**
 * 대시보드 도넛 카드 공통 (`h-44` 카드 높이 = 기준변 176 과 일치 시 반지름 37·73).
 */
export function dashboardPortfolioWeightDonutRadiiPx(): {
  innerRadius: number;
  outerRadius: number;
} {
  return donutRadiiScaledToMinSidePx(CANONICAL_DONUT_CHART_REFERENCE_MIN_SIDE_PX);
}

/** 슬라이스 순환색 — :root / .dark 의 --chart-* (슬라이스마다 서로 다른 색) */
export const CHART_CYCLE_FILLS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
] as const;

/**
 * 모든 도넛·비중 막대 공통: **표시 순서** i(0-based)만 사용.
 * 종목·역할·섹터·기타 구분 없이 N개 세그먼트면 첫 줄부터 `--chart-1`…`--chart-7` 순환.
 */
export function fillForPortfolioOrdinalSlice(sliceIndexZeroBased: number): string {
  const cycleLen = CHART_CYCLE_FILLS.length;
  const n = Number.isFinite(sliceIndexZeroBased) ? Math.floor(sliceIndexZeroBased) : 0;
  const i = ((n % cycleLen) + cycleLen) % cycleLen;
  return CHART_CYCLE_FILLS[i];
}
