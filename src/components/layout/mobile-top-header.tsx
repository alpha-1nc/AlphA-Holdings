"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { type MouseEvent } from "react";
import logo from "@assets/logo.png";
import logoDark from "@assets/logo-dark.png";
import { getMainNavForPath } from "@/lib/nav-items";

type MobileTopHeaderProps = {
  onLogoClick: (e: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * md 미만에서만 사용 — 좌 로고 · 가운데 현재 메뉴 아이콘+제목 · 우측은 로고 폭 스페이서(정렬 균형)
 */
export function MobileTopHeader({ onLogoClick }: MobileTopHeaderProps) {
  const pathname = usePathname();
  const { icon: NavIcon, label: navLabel } = getMainNavForPath(pathname);

  return (
    <div className="relative flex h-[68px] w-full items-center px-1">
      {/* 좌측 로고 */}
      <button
        type="button"
        aria-label="홈으로 이동"
        onClick={onLogoClick}
        className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none ring-offset-2 transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring dark:ring-offset-background"
      >
        <Image
          src={logo}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 object-contain dark:hidden"
          priority
          aria-hidden
        />
        <Image
          src={logoDark}
          alt=""
          width={36}
          height={36}
          className="hidden h-9 w-9 object-contain dark:block"
          priority
          aria-hidden
        />
      </button>

      {/* 가운데: 아이콘 + 제목 (뷰포트 기준 중앙) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex max-w-[min(100%,calc(100vw-9.5rem))] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 px-2">
        <NavIcon
          className="h-5 w-5 shrink-0 text-primary"
          strokeWidth={2.1}
          aria-hidden
        />
        <span className="truncate text-center text-[15px] font-semibold leading-tight tracking-tight text-foreground">
          {navLabel}
        </span>
      </div>

      <div
        className="relative z-20 ml-auto h-11 w-11 shrink-0"
        aria-hidden
      />
    </div>
  );
}
