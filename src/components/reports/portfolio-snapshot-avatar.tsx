"use client";

import { CircleDollarSign } from "lucide-react";
import type { AccountType } from "@/generated/prisma";
import { TickerAvatar } from "@/components/dashboard/ticker-avatar";
import { cn } from "@/lib/utils";

function isCashSnapshotRow(
  accountType: AccountType,
  ticker: string,
  displayName?: string | null,
): boolean {
  if (accountType === "CASH") return true;
  const t = ticker.trim();
  const n = (displayName ?? "").trim();
  if (/^(KRW|USD|JPY|EUR|GBP|CNY|CASH|현금)$/i.test(t) || t.toUpperCase() === "CASH") {
    return true;
  }
  if (n.includes("현금") || n.includes("💵") || t.includes("현금")) return true;
  return false;
}

export function PortfolioSnapshotAvatar({
  accountType,
  ticker,
  displayName,
  logoUrl,
  size = 44,
}: {
  accountType: AccountType;
  ticker: string;
  displayName?: string | null;
  logoUrl?: string | null;
  /** 리포트 상세 44, 폼 하단 미리보기 28 */
  size?: 28 | 44;
}) {
  if (isCashSnapshotRow(accountType, ticker, displayName)) {
    const dim = size >= 40 ? "h-10 w-10" : "h-7 w-7";
    const iconClass = size >= 40 ? "h-[22px] w-[22px]" : "h-[15px] w-[15px]";
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700",
          dim,
        )}
        aria-hidden
      >
        <CircleDollarSign className={iconClass} strokeWidth={1.5} />
      </span>
    );
  }

  return (
    <TickerAvatar
      ticker={ticker}
      displayName={displayName}
      logoUrl={logoUrl}
      size={size}
      autoLocalLogo
      initialCharCount={1}
    />
  );
}
