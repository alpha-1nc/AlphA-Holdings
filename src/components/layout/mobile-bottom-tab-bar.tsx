"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  InteractiveMobileMenu,
  type InteractiveMobileMenuItem,
} from "@/components/ui/modern-mobile-menu";
import { useMobileBottomNavOverride } from "@/components/layout/mobile-bottom-nav-override";
import {
  MAIN_NAV_ITEMS,
  getBottomTabIndexForPath,
  getBottomTabIndexForReportType,
} from "@/lib/nav-items";
import { getReportTypeForBottomNav } from "@/app/actions/reports";

/** 모바일 전용 플로팅 하단 도크 — iOS 안전영역·라운드 코너·프로스티드 패널 */
export function MobileBottomTabBar() {
  const pathname = usePathname();
  const navOverride = useMobileBottomNavOverride();
  const [reportRouteTabIndex, setReportRouteTabIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const m = /^\/reports\/(\d+)(?:\/edit)?\/?$/.exec(pathname);
    const idStr = m?.[1];
    if (!idStr) {
      setReportRouteTabIndex(null);
      return;
    }
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      setReportRouteTabIndex(null);
      return;
    }
    getReportTypeForBottomNav(id)
      .then((type) => {
        if (cancelled) return;
        if (!type) {
          setReportRouteTabIndex(null);
          return;
        }
        setReportRouteTabIndex(getBottomTabIndexForReportType(type));
      })
      .catch(() => {
        if (!cancelled) setReportRouteTabIndex(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

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
    if (reportRouteTabIndex != null) {
      return reportRouteTabIndex;
    }
    if (navOverride != null) {
      return navOverride;
    }
    return getBottomTabIndexForPath(pathname);
  }, [navOverride, pathname, reportRouteTabIndex]);

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
