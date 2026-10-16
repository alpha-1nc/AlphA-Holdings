"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getLocalLogoUrl } from "@/lib/ticker-logo";
import { cn } from "@/lib/utils";

export interface StockLogoProps {
  ticker: string;
  /** DB 등에 명시 저장된 URL — 있으면 최우선 */
  logoUrl?: string | null;
  size?: number;
  roundedSquare?: boolean;
  /** true이면 logoUrl 없을 때 /logos/{TICKER}.png 시도 (기본 true) */
  autoLocalLogo?: boolean;
  initialCharCount?: 1 | 2;
  className?: string;
  isSaving?: boolean;
}

function sizeToClass(size: number): string {
  if (size >= 40) return "h-10 w-10";
  if (size >= 36) return "h-9 w-9";
  if (size >= 32) return "h-8 w-8";
  if (size === 28) return "h-7 w-7";
  return "h-6 w-6";
}

export function StockLogo({
  ticker,
  logoUrl,
  size = 28,
  roundedSquare = false,
  autoLocalLogo = true,
  initialCharCount = 2,
  className,
  isSaving = false,
}: StockLogoProps) {
  const [failedCustomUrl, setFailedCustomUrl] = useState<string | null>(null);
  const [failedLocalUrl, setFailedLocalUrl] = useState<string | null>(null);

  const t = ticker.trim();
  const stripped = t.replace(/[^A-Za-z0-9가-힣]/g, "");
  const initial =
    initialCharCount === 1
      ? (stripped.slice(0, 1) || t.charAt(0) || "?").toUpperCase()
      : (stripped.slice(0, 2) || t.charAt(0) || "?").toUpperCase();

  const trimmedLogo = logoUrl?.trim() ?? "";
  const localUrl = autoLocalLogo && t ? getLocalLogoUrl(t) : null;

  const customFailed = Boolean(trimmedLogo && failedCustomUrl === trimmedLogo);
  const customOk = Boolean(trimmedLogo && !customFailed);
  const localFailed = Boolean(localUrl && failedLocalUrl === localUrl);
  const localOk = Boolean(localUrl && !localFailed);

  const displayUrl = customOk ? trimmedLogo : localOk && localUrl ? localUrl : null;
  const hasValidLogo = displayUrl !== null;

  useEffect(() => {
    setFailedCustomUrl(null);
    setFailedLocalUrl(null);
  }, [trimmedLogo, t, autoLocalLogo]);

  const shapeClass = roundedSquare ? "rounded-xl" : "rounded-full";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-neutral-200 dark:ring-neutral-700",
        sizeToClass(size),
        shapeClass,
        className,
      )}
    >
      <span
        className="absolute inset-0 flex items-center justify-center bg-neutral-100 font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
        style={{
          fontSize: Math.max(10, Math.floor(size * 0.45)),
          opacity: hasValidLogo ? 0 : 1,
        }}
        aria-hidden={hasValidLogo || undefined}
      >
        {isSaving && !hasValidLogo ? (
          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
        ) : (
          initial
        )}
      </span>
      {hasValidLogo && displayUrl && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] bg-white dark:bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={displayUrl}
            src={displayUrl}
            alt=""
            aria-hidden
            draggable={false}
            className="h-full w-full object-cover object-center"
            onError={() => {
              if (displayUrl === trimmedLogo) setFailedCustomUrl(trimmedLogo);
              else if (localUrl && displayUrl === localUrl) setFailedLocalUrl(localUrl);
            }}
          />
        </div>
      )}
      {isSaving && hasValidLogo && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        </div>
      )}
    </span>
  );
}
