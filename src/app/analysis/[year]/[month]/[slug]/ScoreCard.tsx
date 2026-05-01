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
        card: "border-[var(--positive)]/25 bg-[var(--positive-soft)]",
        title: "text-foreground",
        score: "text-[var(--positive)]",
        maxSlash: "text-[var(--positive)]/75",
        barFill: "bg-[var(--positive)]",
        barTrack: "bg-muted",
        rationale: "text-muted-foreground",
        moreBtn: "text-muted-foreground hover:text-foreground",
    },
    mid: {
        card: "border-border bg-muted/50",
        title: "text-foreground",
        score: "text-primary",
        maxSlash: "text-primary/70",
        barFill: "bg-primary",
        barTrack: "bg-muted",
        rationale: "text-muted-foreground",
        moreBtn: "text-muted-foreground hover:text-foreground",
    },
    low: {
        card: "border-[var(--negative)]/25 bg-[var(--negative-soft)]",
        title: "text-foreground",
        score: "text-[var(--negative)]",
        maxSlash: "text-[var(--negative)]/75",
        barFill: "bg-[var(--negative)]",
        barTrack: "bg-muted",
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
