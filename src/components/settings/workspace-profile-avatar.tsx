"use client";

import Image from "next/image";
import clsx from "clsx";

import type { WorkspaceProfile } from "@/lib/profile";
import { WORKSPACE_PROFILE_INTRO } from "@/lib/profile";
import alphaHoldingsLogo from "@assets/AlphAHoldings_LOGO.jpeg";

const avatarOuterLg =
    "mb-4 box-border h-28 w-28 shrink-0 rounded-full border border-border bg-muted/40 p-1 shadow-sm";
const avatarInnerLg =
    "relative size-full overflow-hidden rounded-full bg-card ring-1 ring-border";

const avatarOuterSm =
    "box-border size-10 shrink-0 rounded-full border border-border bg-muted/40 p-0.5 shadow-sm";
const avatarInnerSm =
    "relative size-full overflow-hidden rounded-full bg-card ring-1 ring-border";

type WorkspaceProfileAvatarProps = {
    profile: WorkspaceProfile;
    /** sm: 모바일 상단 헤더 등 / lg: 설정 소개 카드 */
    size: "sm" | "lg";
    className?: string;
};

/**
 * 운용 프로필 표시용 아바타 — AlphA Holdings: 로고, MindongFolio: 이니셜 M.
 * 무채색 링·배경 (설정·헤더 공통).
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
                <div className={clsx(avatarOuterSm, className)}>
                    <div className={avatarInnerSm}>
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
            );
        }
        return (
            <div className={clsx(avatarOuterLg, className)}>
                <div className={avatarInnerLg}>
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
        );
    }

    if (size === "sm") {
        return (
            <div className={clsx(avatarOuterSm, className)} aria-hidden>
                <div className="flex size-full items-center justify-center rounded-full bg-card ring-1 ring-border">
                    <span
                        className={clsx(
                            "text-[16px] font-bold leading-none tracking-tight text-foreground",
                            "ah-profile-initial-font antialiased md:text-[13px]",
                        )}
                    >
                        M
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={clsx(avatarOuterLg, className)} aria-hidden>
            <div
                className={clsx(
                    avatarInnerLg,
                    "flex items-center justify-center",
                )}
            >
                <span
                    className={clsx(
                        "text-4xl font-bold leading-none tracking-tight text-foreground",
                        "ah-profile-initial-font antialiased md:text-2xl",
                    )}
                >
                    M
                </span>
            </div>
        </div>
    );
}
