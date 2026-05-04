"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useMemo,
  type CSSProperties,
} from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export type InteractiveMobileMenuItem = {
  href: string;
  /** 표시 짧은 라벨 */
  label: string;
  /** 접근성용 설명 라벨 (없으면 `label`) */
  accessibleLabel?: string;
  icon: LucideIcon;
};

export interface InteractiveMobileMenuProps {
  items: InteractiveMobileMenuItem[];
  activeIndex: number;
  /** 기본값: 브랜드 메인 포인트 `var(--primary)` (#5dfcb3) */
  accentColor?: string;
}

/** 하단 고정 레이아웃용 네비 — 아이콘 + 활성 라인이 라벨 너비에 맞춤 */
export function InteractiveMobileMenu({
  items,
  activeIndex,
  accentColor,
}: InteractiveMobileMenuProps) {
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const textRefs = useRef<(HTMLElement | null)[]>([]);

  const safeLength = Math.max(items.length, 1);
  const clampedActive = Math.min(
    Math.max(activeIndex, 0),
    safeLength - 1,
  );

  const navStyle = useMemo(
    () =>
      ({
        "--ah-mm-accent":
          accentColor?.trim() || "var(--primary)",
      }) as CSSProperties,
    [accentColor],
  );

  useEffect(() => {
    const measure = () => {
      const itemEl = itemRefs.current[clampedActive];
      const textEl = textRefs.current[clampedActive];
      if (!itemEl || !textEl) {
        return;
      }
      const w = Math.ceil(textEl.getBoundingClientRect().width);
      itemEl.style.setProperty("--ah-mm-line", `${w}px`);
    };

    queueMicrotask(measure);

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [clampedActive, items]);

  if (!items.length) {
    return null;
  }

  return (
    <nav
      className="ah-mm-nav"
      style={navStyle}
      aria-label="주요 메뉴"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = index === clampedActive;
        const a11yLabel = item.accessibleLabel ?? item.label;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            aria-label={a11yLabel}
            aria-current={isActive ? "page" : undefined}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            style={
              ({
                "--ah-mm-line": "0px",
              }) as CSSProperties
            }
            className={clsx(
              "ah-mm-item flex min-h-[3.375rem] min-w-0 flex-1 flex-col items-center justify-center gap-px py-[3px] outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--ah-mm-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
              isActive ? "ah-mm-item--active" : "",
            )}
          >
            <div className="ah-mm-iconWrap flex shrink-0 items-center justify-center">
              <Icon
                className={clsx(
                  "ah-mm-icon h-[22px] w-[22px]",
                  "transition-[color,stroke-width]",
                )}
                strokeWidth={isActive ? 2.15 : 1.65}
                aria-hidden
              />
            </div>
            <strong
              className={clsx(
                "ah-mm-label max-w-[4.75rem] truncate text-center font-semibold leading-none tracking-tight",
                isActive ? "ah-mm-label--active" : "text-muted-foreground",
              )}
              ref={(el) => {
                textRefs.current[index] = el;
              }}
            >
              {item.label}
            </strong>
          </Link>
        );
      })}
    </nav>
  );
}
