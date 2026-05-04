import type { LucideIcon } from "lucide-react";
import { Home, BarChart2, TrendingUp, Bookmark, PenLine, Settings } from "lucide-react";
import type { ReportType } from "@/generated/prisma";

/** 상단/하단 네비 공통 — href, 아이콘, 접근성 라벨, 하단 탭 짧은 레이블 */
export const MAIN_NAV_ITEMS: {
  href: string;
  icon: LucideIcon;
  label: string;
  /** 모바일 하단 탭용 (한 줄) */
  shortLabel: string;
}[] = [
  { href: "/", icon: Home, label: "홈", shortLabel: "홈" },
  { href: "/monthly", icon: BarChart2, label: "월별 리포트", shortLabel: "월별" },
  { href: "/quarterly", icon: TrendingUp, label: "분기별 리포트", shortLabel: "분기" },
  { href: "/watchlist", icon: Bookmark, label: "와치리스트", shortLabel: "관심" },
  { href: "/reports/new", icon: PenLine, label: "새 리포트", shortLabel: "작성" },
  { href: "/settings", icon: Settings, label: "설정", shortLabel: "설정" },
];

/** pathname에 맞는 상단(모바일) 표시용 아이콘·제목 — 메인 메뉴 및 리포트 하위 경로 */
export function getMainNavForPath(pathname: string): { icon: LucideIcon; label: string } {
  if (pathname === "/") {
    return { icon: Home, label: "홈" };
  }
  if (pathname.startsWith("/reports/new")) {
    const item = MAIN_NAV_ITEMS.find((x) => x.href === "/reports/new")!;
    return { icon: item.icon, label: item.label };
  }
  if (/^\/reports\/[^/]+\/edit/.test(pathname)) {
    return { icon: PenLine, label: "리포트 편집" };
  }
  if (/^\/reports\/[^/]+$/.test(pathname)) {
    return { icon: BarChart2, label: "리포트" };
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

/** 리포트 상세·편집 URL은 `/monthly`·`/quarterly` 프리픽스가 없음 — DB `type`으로 하단 탭 인덱스 결정 */
export function getBottomTabIndexForReportType(type: ReportType): number {
  if (type === "QUARTERLY") {
    return MAIN_NAV_ITEMS.findIndex((x) => x.href === "/quarterly");
  }
  return MAIN_NAV_ITEMS.findIndex((x) => x.href === "/monthly");
}

/**
 * 모바일 하단 탭 — 가장 긴 href 프리픽스가 우선 (`/` 제외 후 정렬).
 * `/reports/[id]` 등 매칭 없으면 홈(0). (리포트 상세는 레이아웃에서 타입 기반 오버라이드)
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
