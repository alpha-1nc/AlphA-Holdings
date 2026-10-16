"use client";

import { Pencil, Trash2, ExternalLink, LineChart } from "lucide-react";
import { StockLogo } from "@/components/stock/stock-logo";
import {
  normalizeWatchlistStatus,
  type WatchlistEditItem,
} from "@/components/watchlist/watchlist-item-modal";
import { bulletLinesToArray } from "@/lib/bullet-list-text";
import { getTradingViewSymbolUrl } from "@/lib/tradingview-url";
import { getWatchlistStatusStyle } from "@/components/watchlist/watchlist-status-style";
import { cn } from "@/lib/utils";

const SECTION_LABEL_CLASS =
  "mb-1.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-foreground/40";

const ICON_ACTION_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/80 p-2 text-muted-foreground backdrop-blur-sm transition hover:bg-muted/50 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15";

const CARD_HOVER_ACTIONS_CLASS =
  "flex items-center gap-1 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100";

function BulletListView({ text }: { text: string }) {
  const items = bulletLinesToArray(text);
  if (items.length === 0) return null;
  return (
    <ul className="list-disc space-y-1 pl-[1.125rem] text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
      {items.map((line, i) => (
        <li key={i} className="pl-0.5 marker:text-muted-foreground/50">
          {line}
        </li>
      ))}
    </ul>
  );
}

function MemoSection({ label, text }: { label: string; text: string }) {
  const hasContent = bulletLinesToArray(text).length > 0;

  return (
    <div>
      <p className={SECTION_LABEL_CLASS}>{label}</p>
      {hasContent ? (
        <BulletListView text={text} />
      ) : (
        <p className="text-sm text-muted-foreground/45">기록 없음</p>
      )}
    </div>
  );
}

export type WatchlistCardItem = {
  id: string;
  ticker: string;
  companyName: string;
  logoUrl: string | null;
  interestReason: string | null;
  riskNotes: string | null;
  tag: string;
  addedAt: Date;
};

type WatchlistCardProps = {
  item: WatchlistCardItem;
  onEditRequest: (item: WatchlistEditItem) => void;
  onDeleteRequest: (id: string) => void;
};

export function WatchlistCard({
  item,
  onEditRequest,
  onDeleteRequest,
}: WatchlistCardProps) {
  const displayStatus = normalizeWatchlistStatus(item.tag);
  const statusStyle = getWatchlistStatusStyle(displayStatus);

  return (
    <article className="group relative flex h-full min-h-[11.5rem] overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-border/70 hover:shadow-md">
      {/* Hover actions — card top-right */}
      <div
        className={cn(
          "absolute right-3 top-3 z-10",
          CARD_HOVER_ACTIONS_CLASS,
        )}
      >
        <button
          type="button"
          onClick={() =>
            onEditRequest({
              id: item.id,
              ticker: item.ticker,
              companyName: item.companyName,
              tag: item.tag,
              interestReason: item.interestReason,
              riskNotes: item.riskNotes,
            })
          }
          className={ICON_ACTION_CLASS}
          title="수정"
          aria-label="수정"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDeleteRequest(item.id)}
          className={ICON_ACTION_CLASS}
          title="삭제"
          aria-label="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Left — identity panel (surface contrast anchor) */}
      <aside className="flex w-[8.75rem] shrink-0 flex-col items-center justify-center gap-2.5 self-stretch border-r border-border/50 bg-muted/45 px-3 py-5 dark:bg-muted/40 md:w-[10rem] md:gap-3 md:px-4 md:py-6">
        <StockLogo
          ticker={item.ticker}
          size={48}
          className="h-12 w-12 ring-border/60"
        />
        <p className="w-full text-center text-2xl font-bold leading-none tracking-tight text-foreground md:text-3xl">
          {item.ticker}
        </p>
        <p
          className="w-full break-words text-center text-xs leading-snug text-foreground/50 line-clamp-2 md:text-[0.8125rem]"
          title={item.companyName}
        >
          {item.companyName}
        </p>
        <span
          className={cn(
            "mt-0.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[0.3125rem] text-[0.6875rem] md:text-xs",
            statusStyle.badge,
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusStyle.dot)}
            aria-hidden
          />
          {displayStatus}
        </span>
      </aside>

      {/* Right — memo + footer */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 px-5 py-4 pr-14 md:gap-5 md:px-6 md:py-5 md:pr-16">
          <MemoSection label="관심 이유" text={item.interestReason ?? ""} />
          <MemoSection label="리스크" text={item.riskNotes ?? ""} />
        </div>

        <footer className="mt-auto flex items-center justify-between border-t border-border/50 px-5 py-2.5 md:px-6 md:py-3">
          <time
            dateTime={new Date(item.addedAt).toISOString()}
            className="text-[0.8125rem] text-muted-foreground/80"
          >
            {new Date(item.addedAt).toLocaleDateString("ko-KR")}
          </time>
          <a
            href={getTradingViewSymbolUrl(item.ticker)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground/70 md:text-sm"
          >
            <LineChart className="h-3.5 w-3.5 shrink-0" aria-hidden />
            TradingView
            <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
          </a>
        </footer>
      </div>
    </article>
  );
}
