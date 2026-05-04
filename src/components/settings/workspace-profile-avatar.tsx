"use client";

import Image from "next/image";
import clsx from "clsx";

import type { WorkspaceProfile } from "@/lib/profile";
import { WORKSPACE_PROFILE_INTRO } from "@/lib/profile";
import alphaHoldingsLogo from "@assets/AlphAHoldings_LOGO.jpeg";

/** 인스타 프로필/스토리 스타일 — 바깥 그라데이션 링 + 간격 + inset 링 */
const igMintOuterLg =
    "mb-4 box-border h-28 w-28 shrink-0 rounded-full bg-gradient-to-br from-teal-400 via-teal-300 to-cyan-400 p-[4px] shadow-md ring-2 ring-teal-500/25 dark:from-teal-500 dark:via-teal-400 dark:to-emerald-500 dark:shadow-lg dark:ring-teal-400/20";
const igMintGapLg = "size-full rounded-full bg-neutral-100 p-[3px] dark:bg-neutral-950";
const igMintInnerLg =
    "relative size-full overflow-hidden rounded-full bg-card/95 ring-1 ring-inset ring-teal-600/15 dark:bg-card/90 dark:ring-teal-400/20";

const igMintOuterSm =
    "box-border size-10 shrink-0 rounded-full bg-gradient-to-br from-teal-400 via-teal-300 to-cyan-400 p-[2px] shadow-sm ring-1 ring-teal-500/35 dark:from-teal-500 dark:via-teal-400 dark:to-emerald-500 dark:ring-teal-400/25";
const igMintGapSm = "size-full rounded-full bg-neutral-100 p-px dark:bg-neutral-950";
const igMintInnerSm =
    "relative size-full overflow-hidden rounded-full bg-card/95 ring-1 ring-inset ring-teal-600/10 dark:bg-card/90 dark:ring-teal-400/15";

type WorkspaceProfileAvatarProps = {
    profile: WorkspaceProfile;
    /** sm: 모바일 상단 헤더 등 / lg: 설정 소개 카드 */
    size: "sm" | "lg";
    className?: string;
};

/**
 * 운용 프로필 표시용 아바타 — AlphA Holdings: 로고 + 민트 이중 링,
 * MindongFolio: 이니셜 M + 동일 링 스타일.
 */
export function WorkspaceProfileAvatar({
    profile,
    size,
    className,
}: WorkspaceProfileAvatarProps) {
    const isAlphaHoldings = profile === "alpha-ceo";
    const displayName = WORKSPACE_PROFILE_INTRO[profile].name;

    if (isAlphaHoldings) {
        if (size === "sm") {
            return (
                <div className={clsx(igMintOuterSm, className)}>
                    <div className={igMintGapSm}>
                        <div className={igMintInnerSm}>
                            <Image
                                src={alphaHoldingsLogo}
                                alt={`${displayName} 로고`}
                                width={40}
                                height={40}
                                className="size-full rounded-full object-cover"
                                priority
                            />
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className={clsx(igMintOuterLg, className)}>
                <div className={igMintGapLg}>
                    <div className={igMintInnerLg}>
                        <Image
                            src={alphaHoldingsLogo}
                            alt={`${displayName} 로고`}
                            width={96}
                            height={96}
                            className="size-full rounded-full object-cover"
                            priority
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (size === "sm") {
        return (
            <div className={clsx(igMintOuterSm, className)} aria-hidden>
                <div className={igMintGapSm}>
                    <div className="flex size-full items-center justify-center rounded-full bg-card/95 ring-1 ring-inset ring-teal-600/10 dark:bg-card/90 dark:ring-teal-400/15">
                        <span
                            className={clsx(
                                "text-[16px] font-bold leading-none tracking-tight text-teal-600 dark:text-teal-400",
                                "ah-profile-initial-font antialiased md:text-[13px]",
                            )}
                        >
                            M
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={clsx(igMintOuterLg, className)} aria-hidden>
            <div className={igMintGapLg}>
                <div
                    className={clsx(
                        igMintInnerLg,
                        "flex items-center justify-center",
                    )}
                >
                    <span
                        className={clsx(
                            "text-4xl font-bold leading-none tracking-tight text-teal-600 dark:text-teal-300",
                            "ah-profile-initial-font antialiased md:text-2xl",
                        )}
                    >
                        M
                    </span>
                </div>
            </div>
        </div>
    );
}
