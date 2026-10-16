import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Holdings 기준 — 본문 상하좌우 여백·최대폭 */
export const PAGE_OUTER_CLASS =
  "w-full px-6 sm:px-10 md:px-12 lg:px-16 pt-2 sm:pt-6 pb-16 sm:pb-20 md:pb-28";

export const PAGE_INNER_CLASS = "mx-auto w-full max-w-6xl";

export function PageContainer({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn(PAGE_OUTER_CLASS, className)}>
      <div className={cn(PAGE_INNER_CLASS, innerClassName)}>{children}</div>
    </div>
  );
}
