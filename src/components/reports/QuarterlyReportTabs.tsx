"use client";

import { useState } from "react";

type TabKey = "overview" | "journal";

export function QuarterlyReportTabs({
    overview,
    journal,
}: {
    overview: React.ReactNode;
    journal: React.ReactNode;
}) {
    const [tab, setTab] = useState<TabKey>("overview");

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800/80">
                <button
                    type="button"
                    onClick={() => setTab("overview")}
                    className={[
                        "rounded-lg px-4 py-2 text-sm font-medium transition",
                        tab === "overview"
                            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                            : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
                    ].join(" ")}
                >
                    개요
                </button>
                <button
                    type="button"
                    onClick={() => setTab("journal")}
                    className={[
                        "rounded-lg px-4 py-2 text-sm font-medium transition",
                        tab === "journal"
                            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                            : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
                    ].join(" ")}
                >
                    회고 · Journal
                </button>
            </div>
            {tab === "overview" ? overview : journal}
        </div>
    );
}
