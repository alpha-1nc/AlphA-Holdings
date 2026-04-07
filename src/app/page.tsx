import { Suspense } from "react";
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";

function DashboardFallback() {
    return (
        <div className="p-0">
            <div className="mb-6 md:mb-8">
                <div className="h-7 w-48 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-2 h-4 w-72 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-700" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-36 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
                ))}
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<DashboardFallback />}>
            <DashboardPageClient />
        </Suspense>
    );
}
