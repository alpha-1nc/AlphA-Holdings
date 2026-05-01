import { Suspense } from "react";
import { WatchlistClient } from "./watchlist-client";

export const dynamic = "force-dynamic";

export default function WatchlistPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 p-0">
        <div className="h-8 w-48 animate-pulse rounded-lg"
             style={{ background: "var(--ah-card-soft)" }} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl"
                 style={{ background: "var(--ah-card-soft)" }} />
          ))}
        </div>
      </div>
    }>
      <WatchlistClient />
    </Suspense>
  );
}
