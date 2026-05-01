/**
 * Rounded 도넛: 슬라이스 2개 이상일 때만 padding·모서리·배경 스트로크 간격.
 * 슬라이스 1개(100%)일 때는 paddingAngle=0 등으로 링이 끊겨 보이지 않게 함.
 */

/** inner ≈ 70% of outer — 참고 이미지처럼 얇은 링 */
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
    paddingAngle: 4,
    cornerRadius: 8,
    strokeWidth: 2,
    stroke: "var(--background)",
    isAnimationActive: true as const,
    animationDuration: 600,
  } as const;
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
