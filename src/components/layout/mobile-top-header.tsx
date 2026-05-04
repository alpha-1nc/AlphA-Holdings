"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import logo from "@assets/logo.png";
import logoDark from "@assets/logo-dark.png";
import { getMainNavForPath } from "@/lib/nav-items";
import {
    getCurrentProfile,
    getProfileLabel,
    setCurrentProfile,
    type WorkspaceProfile,
} from "@/lib/profile";
import { WorkspaceProfileAvatar } from "@/components/settings/workspace-profile-avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type MobileTopHeaderProps = {
    onLogoClick: (e: MouseEvent<HTMLButtonElement>) => void;
};

const PROFILE_ORDER: WorkspaceProfile[] = ["alpha-ceo", "partner"];

/**
 * md 미만에서만 사용 — 좌 로고 · 가운데 현재 메뉴 아이콘+제목 · 우측 프로필(탭 시 전환 모달)
 */
export function MobileTopHeader({ onLogoClick }: MobileTopHeaderProps) {
    const pathname = usePathname();
    const { icon: NavIcon, label: navLabel } = getMainNavForPath(pathname);
    const [profile, setProfile] = useState<WorkspaceProfile>("alpha-ceo");
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    useEffect(() => {
        const sync = () => setProfile(getCurrentProfile());
        sync();
        window.addEventListener("alpha-holdings-profile-change", sync);
        return () => window.removeEventListener("alpha-holdings-profile-change", sync);
    }, []);

    function handleSelectWorkspace(next: WorkspaceProfile) {
        if (next === profile) {
            setProfileModalOpen(false);
            return;
        }
        setCurrentProfile(next);
        setProfileModalOpen(false);
        window.location.reload();
    }

    const profileFullLabel = getProfileLabel(profile);

    return (
        <>
            <div className="relative flex h-[68px] w-full items-center px-1">
                {/* 좌측 로고 */}
                <button
                    type="button"
                    aria-label="홈으로 이동"
                    onClick={onLogoClick}
                    className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none ring-offset-2 transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring dark:ring-offset-background"
                >
                    <Image
                        src={logo}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 object-contain dark:hidden"
                        priority
                        aria-hidden
                    />
                    <Image
                        src={logoDark}
                        alt=""
                        width={36}
                        height={36}
                        className="hidden h-9 w-9 object-contain dark:block"
                        priority
                        aria-hidden
                    />
                </button>

                {/* 가운데: 아이콘 + 제목 (뷰포트 기준 중앙) */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex max-w-[min(100%,calc(100vw-8.5rem))] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 px-2">
                    <NavIcon
                        className="h-5 w-5 shrink-0 text-primary"
                        strokeWidth={2.1}
                        aria-hidden
                    />
                    <span className="truncate text-center text-[15px] font-semibold leading-tight tracking-tight text-foreground">
                        {navLabel}
                    </span>
                </div>

                {/* 우측: 현재 프로필 아바타 — 탭하면 전환 모달 */}
                <button
                    type="button"
                    aria-label={`현재 워크스페이스: ${profileFullLabel}. 눌러서 변경`}
                    aria-haspopup="dialog"
                    aria-expanded={profileModalOpen}
                    onClick={() => setProfileModalOpen(true)}
                    className={clsx(
                        "relative z-20 ml-auto shrink-0 rounded-full outline-none transition-transform active:scale-[0.96]",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background",
                    )}
                >
                    <WorkspaceProfileAvatar profile={profile} size="sm" />
                </button>
            </div>

            <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
                <DialogContent className="sm:max-w-sm" showCloseButton>
                    <DialogHeader>
                        <DialogTitle className="text-lg">워크스페이스</DialogTitle>
                        <DialogDescription className="text-left">
                            사용할 프로필을 선택하세요. 데이터는 프로필마다 따로 저장됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 pt-1">
                        {PROFILE_ORDER.map((id) => {
                            const isActive = id === profile;
                            const label = getProfileLabel(id);
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => handleSelectWorkspace(id)}
                                    className={clsx(
                                        "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors active:scale-[0.99]",
                                        isActive
                                            ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                                            : "border-border bg-card hover:bg-muted/60",
                                    )}
                                >
                                    <div
                                        className={clsx(
                                            "shrink-0 rounded-full",
                                            isActive &&
                                                "shadow-[0_0_0_3px_rgba(15,127,95,0.38)] dark:shadow-[0_0_0_3px_rgba(93,252,179,0.48)]",
                                        )}
                                    >
                                        <WorkspaceProfileAvatar profile={id} size="sm" />
                                    </div>
                                    <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                                        {label}
                                    </span>
                                    {isActive ? (
                                        <Check
                                            className="h-5 w-5 shrink-0 text-primary"
                                            strokeWidth={2.4}
                                            aria-hidden
                                        />
                                    ) : (
                                        <span className="h-5 w-5 shrink-0" aria-hidden />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
