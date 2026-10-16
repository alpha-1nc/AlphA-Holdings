import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const PAGE_TITLE_CLASS =
  "mb-2 text-2xl font-bold tracking-tight sm:text-3xl";

export const PAGE_SUBTITLE_CLASS = "text-sm text-foreground/60 sm:text-base";

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const titleBlock = (
    <div className="min-w-0">
      <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
      {subtitle != null && subtitle !== "" ? (
        <p className={PAGE_SUBTITLE_CLASS}>{subtitle}</p>
      ) : null}
    </div>
  );

  return (
    <div className={cn("mb-6 sm:mb-8", className)}>
      {actions ? (
        <div className="flex items-start justify-between gap-4">
          {titleBlock}
          {actions}
        </div>
      ) : (
        titleBlock
      )}
    </div>
  );
}
