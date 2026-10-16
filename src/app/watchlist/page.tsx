import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { WatchlistClient } from "./watchlist-client";

export const dynamic = "force-dynamic";

function WatchlistFallback() {
  return (
    <PageContainer>
      <div className="mb-6 sm:mb-8">
        <div className="mb-2 h-8 w-40 animate-pulse rounded-lg bg-muted sm:h-9" />
        <div className="h-4 w-56 animate-pulse rounded-lg bg-muted/60" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-52 animate-pulse rounded-2xl border border-border bg-muted/40 md:h-56"
          />
        ))}
      </div>
    </PageContainer>
  );
}

export default function WatchlistPage() {
  return (
    <Suspense fallback={<WatchlistFallback />}>
      <WatchlistClient />
    </Suspense>
  );
}
