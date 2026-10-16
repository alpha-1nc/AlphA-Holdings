import type { StatusTag } from "@/components/watchlist/watchlist-item-modal";

/** Watchlist 상태 배지 전용 — pill tint + dot (카드·필터 dot만) */
export const WATCHLIST_STATUS_STYLE: Record<
  StatusTag,
  { badge: string; dot: string }
> = {
  관심: {
    badge:
      "border-violet-500/25 bg-violet-500/10 font-medium text-violet-900/75 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200/80",
    dot: "bg-violet-600 dark:bg-violet-400",
  },
  매수검토: {
    badge:
      "border-amber-500/25 bg-amber-500/10 font-medium text-amber-900/75 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200/80",
    dot: "bg-amber-500 dark:bg-amber-400",
  },
  편입: {
    badge:
      "border-blue-500/25 bg-blue-500/10 font-medium text-blue-900/75 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200/80",
    dot: "bg-blue-600 dark:bg-blue-400",
  },
  보류: {
    badge:
      "border-slate-400/30 bg-slate-500/10 font-medium text-slate-600/75 dark:border-slate-500/25 dark:bg-slate-400/10 dark:text-slate-300/70",
    dot: "bg-slate-500 dark:bg-slate-400",
  },
};

export function getWatchlistStatusStyle(status: StatusTag) {
  return WATCHLIST_STATUS_STYLE[status] ?? WATCHLIST_STATUS_STYLE["관심"];
}
