"use client";

import { type CSSProperties } from "react";
import "./account-glass-switcher.css";
import type { DashboardAccountGroupFilter } from "@/lib/accountGroups";

const TABS: { key: DashboardAccountGroupFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "직투", label: "직투" },
  { key: "ISA", label: "ISA" },
  { key: "연금저축", label: "연금" },
];

interface AccountGlassSwitcherProps {
  value: DashboardAccountGroupFilter;
  onValueChange: (value: DashboardAccountGroupFilter) => void;
  className?: string;
  /** hero — 히어로 영역용 대형 스위처 */
  size?: "default" | "hero";
}

/**
 * 대시보드 계좌 필터 — 슬림 4탭 무채색 액체 글래스 스위처.
 * 색 테마 없이 쫀득한 인디케이터 슬라이드(squish)만 사용.
 */
export function AccountGlassSwitcher({
  value,
  onValueChange,
  className,
  size = "default",
}: AccountGlassSwitcherProps) {
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.key === value),
  );

  return (
    <div
      className={`ag-switcher ${size === "hero" ? "ag-switcher--hero" : ""} ${className ?? ""}`}
      data-idx={activeIndex}
      role="tablist"
      aria-label="계좌 필터"
      style={
        {
          "--ag-idx": activeIndex,
          "--ag-count": TABS.length,
        } as CSSProperties
      }
    >
      <span className="ag-switcher__indicator" aria-hidden />
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            className="ag-switcher__option"
            onClick={() => onValueChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
