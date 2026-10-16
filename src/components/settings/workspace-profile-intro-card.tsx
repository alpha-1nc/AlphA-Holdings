"use client";

import { WORKSPACE_PROFILE_INTRO } from "@/lib/profile";
import { WorkspaceProfileAvatar } from "@/components/settings/workspace-profile-avatar";

/** Settings — AlphA Holdings 운용 프로필 소개 카드 (무채색, 글래스·그라데이션 없음) */
export function WorkspaceProfileIntroCard() {
    const { name, title, bioLines } = WORKSPACE_PROFILE_INTRO["alpha-ceo"];

    return (
        <div className="rounded-2xl border border-border bg-card">
            <div className="flex flex-col items-center px-5 py-6 text-center sm:px-6 sm:py-7 md:px-8 md:py-8">
                <WorkspaceProfileAvatar
                    profile="alpha-ceo"
                    size="lg"
                    className="mb-0"
                />

                <div className="mt-4 flex max-w-md flex-col gap-0.5">
                    <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
                        {name}
                    </h2>
                    <p className="text-xs text-muted-foreground md:text-sm">
                        {title}
                    </p>
                </div>

                <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
                    {bioLines.join(" ")}
                </p>
            </div>
        </div>
    );
}
