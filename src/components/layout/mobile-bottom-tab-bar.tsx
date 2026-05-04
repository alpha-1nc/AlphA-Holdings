"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  InteractiveMobileMenu,
  type InteractiveMobileMenuItem,
} from "@/components/ui/modern-mobile-menu";
import { useMobileBottomNavOverride } from "@/components/layout/mobile-bottom-nav-override";
import { MAIN_NAV_ITEMS, getBottomTabIndexForPath } from "@/lib/nav-items";

/** 모바일 전용 플로팅 하단 도크 — iOS 안전영역·라운드 코너·프로스티드 패널 */
export function MobileBottomTabBar() {
  const pathname = usePathname();
  const navOverride = useMobileBottomNavOverride();

  const menuItems = useMemo<InteractiveMobileMenuItem[]>(
    () =>
      MAIN_NAV_ITEMS.map(({ href, icon, shortLabel, label }) => ({
        href,
        icon,
        label: shortLabel,
        accessibleLabel: label,
      })),
    [],
  );

  const activeIndex = useMemo(() => {
    if (navOverride != null) {
      return navOverride;
    }
    return getBottomTabIndexForPath(pathname);
  }, [navOverride, pathname]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 ah-mm-dock-shell md:hidden">
      {/* 프로스티드 캡슐 — 디스플레이 라운드·홈 인디케이터 위에 띄움 */}
      <div className="ah-mm-dock-pane pointer-events-auto">
        <InteractiveMobileMenu
          items={menuItems}
          activeIndex={activeIndex}
        />
      </div>
    </div>
  );
}
