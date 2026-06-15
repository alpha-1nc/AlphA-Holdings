import { Suspense } from "react";
import { HoldingsClient } from "./holdings-client";

export const dynamic = "force-dynamic";

function HoldingsFallback() {
  return (
    <div className="space-y-4 p-0">
      <div className="h-9 w-52 animate-pulse rounded-lg md:h-10 md:w-56" style={{ background: "var(--ah-card-soft)" }} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl" style={{ background: "var(--ah-card-soft)" }} />
        ))}
      </div>
    </div>
  );
}

export default function HoldingsPage() {
  return (
    <Suspense fallback={<HoldingsFallback />}>
      <HoldingsClient />
    </Suspense>
  );
}
