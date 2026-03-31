"use client";

import { useLayoutEffect, useRef, useState } from "react";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tier = "high" | "mid" | "low";

function getTier(ratio: number): Tier {
    if (ratio >= 0.8) return "high";
    if (ratio >= 0.5) return "mid";
    return "low";
}

const TIER: Record<
    Tier,
    {
        card: string;
        title: string;
        score: string;
        maxSlash: string;
        barFill: string;
        barTrack: string;
        rationale: string;
        moreBtn: string;
    }
> = {
    high: {
        card: "border-emerald-200/90 bg-emerald-50/80 dark:border-[#1a3d2b] dark:bg-[#0d2016]",
        title: "text-foreground",
        score: "text-emerald-700 dark:text-[#4ade80]",
        maxSlash: "text-emerald-600/75 dark:text-[#6ee7a0]/70",
        barFill: "bg-emerald-500 dark:bg-[#4ade80]",
        barTrack: "bg-emerald-100 dark:bg-[#0a1812]",
        rationale: "text-muted-foreground",
        moreBtn: "text-muted-foreground hover:text-foreground",
    },
    mid: {
        card: "border-amber-200/90 bg-amber-50/80 dark:border-[#3d3610] dark:bg-[#1c1a08]",
        title: "text-foreground",
        score: "text-amber-800 dark:text-[#facc15]",
        maxSlash: "text-amber-700/80 dark:text-[#fde047]/70",
        barFill: "bg-amber-500 dark:bg-[#facc15]",
        barTrack: "bg-amber-100 dark:bg-[#141208]",
        rationale: "text-muted-foreground",
        moreBtn: "text-muted-foreground hover:text-foreground",
    },
    low: {
        card: "border-red-200/90 bg-red-50/80 dark:border-[#3d1515] dark:bg-[#1f0a0a]",
        title: "text-foreground",
        score: "text-red-700 dark:text-[#f87171]",
        maxSlash: "text-red-600/75 dark:text-[#fca5a5]/70",
        barFill: "bg-red-500 dark:bg-[#f87171]",
        barTrack: "bg-red-100 dark:bg-[#2a1212]",
        rationale: "text-muted-foreground",
        moreBtn: "text-muted-foreground hover:text-foreground",
    },
};

export function ScoreCard({
    dimensionName,
    score,
    maxScore,
    rationale,
}: {
    dimensionName: string;
    score: number;
    maxScore: number;
    rationale: string;
}) {
    const ratio = maxScore > 0 ? score / maxScore : 0;
    const tier = getTier(ratio);
    const t = TIER[tier];
    const scoreLabel = Number.isInteger(score)
        ? String(score)
        : score.toFixed(1);

    const textRef = useRef<HTMLParagraphElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [canToggle, setCanToggle] = useState(false);

    useLayoutEffect(() => {
        const el = textRef.current;
        if (!el) return;
        if (expanded) {
            setCanToggle(true);
            return;
        }
        setCanToggle(el.scrollHeight > el.clientHeight + 1);
    }, [rationale, expanded]);

    return (
        <Card size="sm" className={cn("ring-0", t.card)}>
            <CardHeader className="pb-2">
                <CardTitle
                    className={cn(
                        "text-sm font-medium leading-snug",
                        t.title
                    )}
                >
                    {dimensionName}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
                <div
                    className={cn("text-2xl font-bold tabular-nums", t.score)}
                >
                    {scoreLabel}{" "}
                    <span className={cn("text-base font-semibold", t.maxSlash)}>
                        / {maxScore}
                    </span>
                </div>
                <div
                    className={cn(
                        "h-2 w-full overflow-hidden rounded-full",
                        t.barTrack
                    )}
                >
                    <div
                        className={cn(
                            "h-full rounded-full transition-all",
                            t.barFill
                        )}
                        style={{
                            width: `${Math.min(100, ratio * 100)}%`,
                        }}
                    />
                </div>
                <div className="space-y-1.5">
                    <p
                        ref={textRef}
                        className={cn(
                            "text-xs leading-relaxed",
                            t.rationale,
                            !expanded && "line-clamp-3"
                        )}
                    >
                        {rationale}
                    </p>
                    {canToggle ? (
                        <button
                            type="button"
                            onClick={() => setExpanded((e) => !e)}
                            className={cn(
                                "text-xs font-medium underline-offset-2 hover:underline",
                                t.moreBtn
                            )}
                        >
                            {expanded ? "접기" : "더보기"}
                        </button>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
