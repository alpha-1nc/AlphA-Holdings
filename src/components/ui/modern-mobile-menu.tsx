"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useMemo,
  type CSSProperties,
  type TransitionEvent,
} from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export type InteractiveMobileMenuItem = {
  href: string;
  label: string;
  accessibleLabel?: string;
  icon: LucideIcon;
};

export interface InteractiveMobileMenuProps {
  items: InteractiveMobileMenuItem[];
  activeIndex: number;
  /** 기본값: 브랜드 포인트 `var(--primary)` */
  accentColor?: string;
}

/** 활성 레이아웃 전환 시간 — CSS 변수와 함께 사용 */
const ACTIVE_LAYOUT_MS = 420;

const easeOutSmooth = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * 모바일 하단 도크 — 활성: 아이콘 우측 라벨 + 언더라인 (grid 펼치기 + 페이드)
 */
export function InteractiveMobileMenu({
  items,
  activeIndex,
  accentColor,
}: InteractiveMobileMenuProps) {
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);

  const clampedActive = Math.min(
    Math.max(activeIndex, 0),
    Math.max(items.length - 1, 0),
  );

  const navStyle = useMemo(
    () =>
      ({
        "--ah-mm-accent":
          accentColor?.trim() || "var(--primary)",
        "--ah-mm-ease": easeOutSmooth,
        "--ah-mm-layout-ms": `${ACTIVE_LAYOUT_MS}ms`,
      }) as CSSProperties,
    [accentColor],
  );

  useEffect(() => {
    let raf = 0;
    const syncLine = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const itemEl = itemRefs.current[clampedActive];
        const labelEl = labelRefs.current[clampedActive];
        if (!itemEl || !labelEl) return;
        const w = Math.ceil(labelEl.getBoundingClientRect().width);
        itemEl.style.setProperty("--ah-mm-line", `${w}px`);
      });
    };

    syncLine();

    window.addEventListener("resize", syncLine);

    const labelEl = labelRefs.current[clampedActive];
    const ro =
      typeof ResizeObserver !== "undefined" && labelEl
        ? new ResizeObserver(syncLine)
        : null;
    if (ro && labelEl) {
      ro.observe(labelEl);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncLine);
      ro?.disconnect();
    };
  }, [clampedActive, items]);

  const onShellTransitionEnd = (e: TransitionEvent<HTMLElement>) => {
    if (e.propertyName !== "grid-template-columns") return;
    const anchor = e.currentTarget.closest(".ah-mm-item") as
      | HTMLAnchorElement
      | null;
    if (!anchor?.classList.contains("ah-mm-item--active")) return;
    const labelEl =
      anchor.querySelector<HTMLElement>("[data-mm-label]");
    if (!labelEl) return;
    anchor.style.setProperty(
      "--ah-mm-line",
      `${Math.ceil(labelEl.getBoundingClientRect().width)}px`,
    );
  };

  if (!items.length) return null;

  return (
    <nav className="ah-mm-nav" style={navStyle} aria-label="주요 메뉴">
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
            style={{ "--ah-mm-line": "0px" } as CSSProperties}
            className={clsx(
              "ah-mm-item",
              "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ah-mm-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
              isActive ? "ah-mm-item--active" : "",
            )}
          >
            <div className="ah-mm-iconWrap">
              <Icon
                className="ah-mm-icon"
                strokeWidth={isActive ? 2.05 : 1.65}
                aria-hidden
              />
            </div>

            <span
              className={clsx(
                "ah-mm-labelShell",
                isActive && "ah-mm-labelShell--open",
              )}
              aria-hidden
              onTransitionEnd={onShellTransitionEnd}
            >
              <span className="ah-mm-labelClip">
                <strong
                  className={clsx(
                    "ah-mm-label",
                    isActive && "ah-mm-label--visible",
                  )}
                  data-mm-label=""
                  ref={(el) => {
                    labelRefs.current[index] = el;
                  }}
                >
                  {item.label}
                </strong>
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
