"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
    "/": "Dashboard",
    "/monthly": "Monthly Report",
    "/quarterly": "Quarterly Report",
};

export function Navbar() {
    const pathname = usePathname();
    const title = titles[pathname] ?? "AlphA Holdings";

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-neutral-100/80 bg-white/80 px-8 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/80">
            <div className="flex flex-col gap-0.5">
                <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {title}
                </h1>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    AlphA Holdings — Portfolio
                </p>
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral500">
                {dateStr}
            </p>
        </header>
    );
}
