import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { HoldingsClient } from "./holdings-client";

export const dynamic = "force-dynamic";

function HoldingsFallback() {
  return (
    <div className="holdings-dashboard">
      <PageContainer>
        <div className="mb-6 sm:mb-8">
          <div className="mb-2 h-8 w-40 animate-pulse rounded-md bg-muted sm:h-9" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-muted/60" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[132px] animate-pulse rounded-lg border border-border bg-muted shadow-sm"
            />
          ))}
        </div>
      </PageContainer>
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
