import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** 메인 화면(Dashboard, Monthly, Quarterly, Analysis, Settings) 상단 제목 공통 스타일 */
export const PAGE_MAIN_TITLE_CLASS =
  "text-xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-4xl";

export function PageMainTitle({
  children,
  className,
  icon: Icon,
}: {
  children: ReactNode;
  className?: string;
  /** 상단 네비 아이콘과 동일한 Lucide 아이콘 */
  icon?: LucideIcon;
}) {
  return (
    <h1
      className={cn(
        "hidden",
        Icon ? "md:flex md:items-center md:gap-3" : "md:block",
        PAGE_MAIN_TITLE_CLASS,
        className,
      )}
    >
      {Icon ? (
        <Icon
          className="h-7 w-7 shrink-0 text-neutral-900 dark:text-white md:h-9 md:w-9"
          strokeWidth={1.8}
          aria-hidden
        />
      ) : null}
      {children}
    </h1>
  );
}
