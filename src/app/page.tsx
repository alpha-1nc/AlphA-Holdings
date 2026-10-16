import { Suspense } from "react";
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";
import { PageContainer } from "@/components/layout/page-container";

function DashboardFallback() {
    return (
        <PageContainer>
            <div className="h-64 animate-pulse rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-7 grid grid-cols-1 gap-7 md:grid-cols-2">
                <div className="h-72 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-72 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800" />
            </div>
        </PageContainer>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<DashboardFallback />}>
            <DashboardPageClient />
        </Suspense>
    );
}
