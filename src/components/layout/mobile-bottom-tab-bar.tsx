"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { MAIN_NAV_ITEMS } from "@/lib/nav-items";

/**
 * 모바일 전용 하단 고정 탭 (md 이상에서는 숨김).
 * 활성/비활성 모두 동일 크기/스타일로 통일, 원형 버튼 없음.
 */
export function MobileBottomTabBar() {
  const pathname = usePathname();

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

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="주요 메뉴"
    >
      <div className="pointer-events-auto border-t border-border bg-background pb-[max(0px,env(safe-area-inset-bottom))]">
        <div className="flex h-14 items-center justify-around px-1">
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
                className="flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center py-1 transition-colors"
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.15 : 1.65}
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
