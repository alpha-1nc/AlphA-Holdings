import { Suspense } from "react";
import { WatchlistClient } from "./watchlist-client";

export const dynamic = "force-dynamic";

export default function WatchlistPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 p-0">
        <div className="h-9 w-52 animate-pulse rounded-lg md:h-10 md:w-56"
             style={{ background: "var(--ah-card-soft)" }} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl md:h-56"
                 style={{ background: "var(--ah-card-soft)" }} />
          ))}
        </div>
      </div>
    }>
      <WatchlistClient />
    </Suspense>
  );
}
