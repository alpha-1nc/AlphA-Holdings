"use client";

import { useSyncExternalStore } from "react";

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type ScreenBreakpoint = keyof typeof BREAKPOINTS;

type Dimensions = {
  width: number;
  height: number;
};

/** SSR/하이드레이션용 — 매 호출마다 동일 참조 */
const SERVER_SNAPSHOT: Dimensions = Object.freeze({ width: 1280, height: 800 });

/** 클라이언트 스냅샷 — 크기가 바뀔 때만 새 객체 생성 */
let clientSnapshot: Dimensions = SERVER_SNAPSHOT;

function readDimensions(): Dimensions {
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (clientSnapshot.width === width && clientSnapshot.height === height) {
    return clientSnapshot;
  }

  clientSnapshot = { width, height };
  return clientSnapshot;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function getServerSnapshot(): Dimensions {
  return SERVER_SNAPSHOT;
}

function getBreakpoint(width: number): ScreenBreakpoint {
  if (width >= BREAKPOINTS["2xl"]) return "2xl";
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
}

/** xs/sm/md/lg/xl/2xl 비교 가능한 화면 크기 훅 */
export function useScreenSize() {
  const { width, height } = useSyncExternalStore(
    subscribe,
    readDimensions,
    getServerSnapshot,
  );

  const breakpoint = getBreakpoint(width);

  return {
    width,
    height,
    breakpoint,
    isXs: breakpoint === "xs",
    isSm: width >= BREAKPOINTS.sm,
    isMd: width >= BREAKPOINTS.md,
    isLg: width >= BREAKPOINTS.lg,
    isXl: width >= BREAKPOINTS.xl,
    is2xl: width >= BREAKPOINTS["2xl"],
    isAtLeast: (bp: ScreenBreakpoint) => width >= BREAKPOINTS[bp],
    isBelow: (bp: ScreenBreakpoint) => width < BREAKPOINTS[bp],
  };
}
