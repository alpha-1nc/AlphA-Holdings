import type { LucideIcon } from "lucide-react";
import { Home, Wallet, Bookmark, PenLine, Settings } from "lucide-react";
import type { ReportType } from "@/generated/prisma";

/** 상단/하단 네비 공통 — href, 아이콘, 접근성 라벨, 하단 탭 짧은 레이블 */
export const MAIN_NAV_ITEMS: {
  href: string;
  icon: LucideIcon;
  label: string;
  /** 모바일 하단 탭용 (한 줄, 영문) */
  shortLabel: string;
}[] = [
  { href: "/", icon: Home, label: "홈", shortLabel: "Home" },
  { href: "/holdings", icon: Wallet, label: "보유종목", shortLabel: "Holdings" },
  { href: "/journal", icon: PenLine, label: "일지", shortLabel: "Journal" },
  { href: "/watchlist", icon: Bookmark, label: "와치리스트", shortLabel: "Watch" },
  { href: "/settings", icon: Settings, label: "설정", shortLabel: "Settings" },
];

/** pathname에 맞는 상단(모바일) 표시용 아이콘·제목 — 메인 메뉴 및 리포트 하위 경로 */
export function getMainNavForPath(pathname: string): { icon: LucideIcon; label: string } {
  if (pathname === "/") {
    return { icon: Home, label: "홈" };
  }
  if (pathname.startsWith("/holdings")) {
    const item = MAIN_NAV_ITEMS.find((x) => x.href === "/holdings")!;
    return { icon: item.icon, label: item.label };
  }
  if (pathname.startsWith("/journal")) {
    const item = MAIN_NAV_ITEMS.find((x) => x.href === "/journal")!;
    return { icon: item.icon, label: item.label };
  }
  if (/^\/reports\/[^/]+\/edit/.test(pathname)) {
    return { icon: PenLine, label: "리포트 편집" };
  }
  if (/^\/reports\/[^/]+$/.test(pathname)) {
    return { icon: PenLine, label: "리포트" };
  }

  const ordered = [...MAIN_NAV_ITEMS]
    .filter((x) => x.href !== "/")
    .sort((a, b) => b.href.length - a.href.length);

  for (const item of ordered) {
    if (pathname.startsWith(item.href)) {
      return { icon: item.icon, label: item.label };
    }
  }

  return { icon: Home, label: "홈" };
}

/** 리포트 상세·편집 URL은 `/journal` 프리픽스가 없음 — 하단 탭은 일지로 통일 */
export function getBottomTabIndexForReportType(_type: ReportType): number {
  return MAIN_NAV_ITEMS.findIndex((x) => x.href === "/journal");
}

/**
 * 모바일 하단 탭 — 가장 긴 href 프리픽스가 우선 (`/` 제외 후 정렬).
 * `/reports/[id]`·`/reports/[id]/edit`는 경로만으로 월/분기 구분 불가 →
 * `MobileBottomTabBar`가 서버에서 `type` 조회 후 `getBottomTabIndexForReportType` 적용.
 */
export function getBottomTabIndexForPath(pathname: string): number {
  if (pathname === "/") {
    return 0;
  }
  const scored = MAIN_NAV_ITEMS.map((item, index) => ({ ...item, index })).filter(
    (x) => x.href !== "/",
  );
  scored.sort((a, b) => b.href.length - a.href.length);
  for (const item of scored) {
    if (pathname.startsWith(item.href)) {
      return item.index;
    }
  }
  return 0;
}
