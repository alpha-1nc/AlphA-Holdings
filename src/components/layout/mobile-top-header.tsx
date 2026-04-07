"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import clsx from "clsx";
import logo from "@assets/logo.png";
import logoDark from "@assets/logo-dark.png";
import { getMainNavForPath } from "@/lib/nav-items";
import {
  getCurrentProfile,
  PROFILE_HEADER_SHORT,
  type WorkspaceProfile,
} from "@/lib/profile";

type MobileTopHeaderProps = {
  onLogoClick: (e: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * md 미만에서만 사용 — 좌 로고 / 가운데 현재 메뉴 아이콘+제목 / 우 활성 프로필
 */
export function MobileTopHeader({ onLogoClick }: MobileTopHeaderProps) {
  const pathname = usePathname();
  const { icon: NavIcon, label: navLabel } = getMainNavForPath(pathname);

  const [profile, setProfile] = useState<WorkspaceProfile>("alpha-ceo");

  useEffect(() => {
    function sync() {
      setProfile(getCurrentProfile());
    }
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("alpha-holdings-profile-change", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("alpha-holdings-profile-change", sync);
    };
  }, [pathname]);

  const profileShort = PROFILE_HEADER_SHORT[profile];

  return (
    <div className="relative flex h-[68px] w-full items-center px-1">
      {/* 좌측 로고 */}
      <button
        type="button"
        aria-label="홈으로 이동"
        onClick={onLogoClick}
        className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none ring-offset-2 transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-950"
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
          className="h-5 w-5 shrink-0 text-blue-600 dark:text-orange-400"
          strokeWidth={2.1}
          aria-hidden
        />
        <span className="truncate text-center text-[15px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
          {navLabel}
        </span>
      </div>

      {/* 우측 프로필 */}
      <div className="relative z-20 ml-auto flex min-w-0 shrink-0 justify-end pl-1">
        <Link
          href="/settings"
          className={clsx(
            "max-w-[5.5rem] truncate rounded-full px-2.5 py-1 text-center text-[11px] font-semibold leading-tight transition-opacity active:opacity-80",
            profile === "alpha-ceo"
              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
          )}
          aria-label={`활성 프로필 ${profileShort}, 설정에서 변경`}
        >
          {profileShort}
        </Link>
      </div>
    </div>
  );
}
