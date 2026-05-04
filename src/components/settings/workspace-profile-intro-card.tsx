"use client";

import clsx from "clsx";

import type { WorkspaceProfile } from "@/lib/profile";
import { WORKSPACE_PROFILE_INTRO } from "@/lib/profile";
import { WorkspaceProfileAvatar } from "@/components/settings/workspace-profile-avatar";

type WorkspaceProfileIntroCardProps = {
    profile: WorkspaceProfile;
};

/**
 * 운용 프로필 선택 아래에 표시되는 글래스모피즘 소개 카드 (소셜·CTA 없음).
 * AlphA Holdings: 로고 아바타 + 이미지와 띄어진 민트 링.
 */
export function WorkspaceProfileIntroCard({ profile }: WorkspaceProfileIntroCardProps) {
    const { name, title, bio } = WORKSPACE_PROFILE_INTRO[profile];
    const mintHeading = profile === "partner";

    return (
        <div className="relative mt-6 w-full">
            <div
                className="relative flex flex-col items-center rounded-3xl border border-white/10 bg-card/40 p-6 backdrop-blur-xl transition-all duration-500 ease-out md:p-8 dark:border-white/10"
                style={{ boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
            >
                <WorkspaceProfileAvatar profile={profile} size="lg" />

                <h2
                    className={clsx(
                        "text-center text-xl font-bold md:text-2xl",
                        mintHeading
                            ? "text-teal-600 dark:text-teal-400"
                            : "text-card-foreground",
                    )}
                >
                    {name}
                </h2>
                <p
                    className={clsx(
                        "mt-1 text-center text-sm font-medium md:text-sm",
                        mintHeading
                            ? "text-teal-600 dark:text-teal-400"
                            : "text-primary",
                    )}
                >
                    {title}
                </p>
                <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground md:text-sm md:leading-relaxed">
                    {bio}
                </p>
            </div>

            <div
                className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-indigo-500/50 to-purple-500/50 opacity-30 blur-2xl transition-all duration-500 ease-out"
                aria-hidden
            />
        </div>
    );
}
