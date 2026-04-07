"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { motion, useMotionValueEvent, useSpring, useTransform } from "framer-motion";
import { MAIN_NAV_ITEMS } from "@/lib/nav-items";

const VIEW_W = 100;
const VIEW_H = 56;
/** 상단 딥 깊이 (viewBox y 기준) */
const DIP_DEPTH = 11;
const DIP_HALF = 11.5;
const CORNER = 6;

/**
 * viewBox 0 0 100 56 기준 — 활성 탭 중심(cx)에 맞춰 상단이 부드럽게 파인 바 실루엣
 */
function buildBarPath(cx: number): string {
  const m = CORNER;
  const L = Math.max(m + 0.5, cx - DIP_HALF);
  const R = Math.min(VIEW_W - m - 0.5, cx + DIP_HALF);
  const d = DIP_DEPTH;

  return [
    `M 0 ${VIEW_H - m}`,
    `Q 0 ${VIEW_H} ${m} ${VIEW_H}`,
    `H ${VIEW_W - m}`,
    `Q ${VIEW_W} ${VIEW_H} ${VIEW_W} ${VIEW_H - m}`,
    `V ${m}`,
    `Q ${VIEW_W} 0 ${VIEW_W - m} 0`,
    `H ${R}`,
    `C ${R - 3} 0 ${cx + 4} ${d} ${cx} ${d}`,
    `C ${cx - 4} ${d} ${L + 3} 0 ${L} 0`,
    `H ${m}`,
    `Q 0 0 0 ${m}`,
    `V ${VIEW_H - m}`,
    `Z`,
  ].join(" ");
}

/**
 * 모바일 전용 하단 고정 탭 (md 이상에서는 숨김).
 * 상단 아이콘 네비와 동일 경로 — 아이콘만, 활성 시 상단 딥 + 떠 있는 원형 인디케이터.
 */
export function MobileBottomTabBar() {
  const pathname = usePathname();
  const n = MAIN_NAV_ITEMS.length;

  const activeIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < MAIN_NAV_ITEMS.length; i++) {
      const { href } = MAIN_NAV_ITEMS[i];
      const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
      if (isActive) {
        idx = i;
        break;
      }
    }
    return idx;
  }, [pathname]);

  const targetCx = ((activeIndex + 0.5) / n) * VIEW_W;
  const cxSpring = useSpring(targetCx, { stiffness: 380, damping: 34, mass: 0.55 });

  const [pathD, setPathD] = useState(() => buildBarPath(targetCx));

  useEffect(() => {
    cxSpring.set(targetCx);
  }, [targetCx, cxSpring]);

  useMotionValueEvent(cxSpring, "change", (v) => {
    setPathD(buildBarPath(v));
  });

  const tabLeft = useTransform(cxSpring, (v) => `${v}%`);
  const ActiveIcon = MAIN_NAV_ITEMS[activeIndex].icon;

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="주요 메뉴"
    >
      <div className="pointer-events-auto mx-auto max-w-screen-2xl px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="relative">
          {/* 배경 실루엣 + 상단 딥 */}
          <svg
            className="absolute inset-x-0 bottom-0 h-[56px] w-full overflow-visible drop-shadow-[0_-6px_28px_rgba(15,23,42,0.07)] dark:drop-shadow-[0_-6px_32px_rgba(0,0,0,0.45)]"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d={pathD}
              className="fill-white stroke-neutral-200/90 dark:fill-neutral-900 dark:stroke-white/10"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* 떠 있는 활성 원 + 아이콘 */}
          <motion.div
            className="absolute top-4 z-20 flex h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 shadow-[0_10px_28px_-6px_rgba(37,99,235,0.55)] dark:bg-orange-500 dark:shadow-[0_10px_28px_-6px_rgba(249,115,22,0.48)]"
            style={{ left: tabLeft }}
          >
            <ActiveIcon className="h-[22px] w-[22px] text-white" strokeWidth={2.15} aria-hidden />
          </motion.div>

          {/* 비활성 아이콘 행 (활성 칸은 투명 플레이스홀더로 자리 유지) */}
          <div className="relative z-10 flex h-14 items-center justify-between px-0.5">
            {MAIN_NAV_ITEMS.map(({ href, icon: Icon, label }, i) => {
              const isActive = i === activeIndex;
              const isPathActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  aria-current={isPathActive ? "page" : undefined}
                  className={clsx(
                    "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center py-1 transition-colors",
                    isActive && "pointer-events-none",
                  )}
                >
                  <span
                    className={clsx(
                      "flex items-center justify-center",
                      isActive ? "opacity-0" : "opacity-100",
                    )}
                    aria-hidden
                  >
                    <Icon
                      className="h-[22px] w-[22px] text-neutral-400 dark:text-neutral-500"
                      strokeWidth={1.65}
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
