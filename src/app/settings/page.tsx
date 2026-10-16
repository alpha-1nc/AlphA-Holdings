"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { WorkspaceProfile } from "@/lib/profile";
import { Moon, Sun } from "lucide-react";
import { getAppVersion } from "@/lib/version";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { PortfolioStrategyManager } from "@/components/settings/PortfolioStrategyManager";
import { PensionManualHoldingsManager } from "@/components/settings/PensionManualHoldingsManager";
import { WorkspaceProfileIntroCard } from "@/components/settings/workspace-profile-intro-card";
import { useTheme } from "@/components/layout/theme-provider";
import "@/components/dashboard/account-glass-switcher.css";

const WORKSPACE_PROFILE: WorkspaceProfile = "alpha-ceo";

const SECTION_LABEL_CLASS =
    "mb-4 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-foreground/40";

const PRIMARY_ACTION_CLASS =
    "inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 py-3 text-base font-semibold text-background transition hover:opacity-90 active:scale-[0.98] md:min-h-0 md:px-4 md:py-2.5 md:text-sm";

const OUTLINE_ACTION_CLASS =
    "inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-base font-medium text-foreground transition hover:bg-muted/50 active:scale-[0.98] md:min-h-0 md:px-4 md:py-2.5 md:text-sm";

function ThemeSwitcher({
    theme,
    onToggle,
}: {
    theme: "light" | "dark";
    onToggle: () => void;
}) {
    const activeIndex = theme === "light" ? 0 : 1;

    return (
        <div
            className="ag-switcher ag-switcher--hero w-full max-w-none"
            data-idx={activeIndex}
            role="tablist"
            aria-label="테마"
            style={
                {
                    "--ag-idx": activeIndex,
                    "--ag-count": 2,
                } as CSSProperties
            }
        >
            <span className="ag-switcher__indicator" aria-hidden />
            <button
                type="button"
                role="tab"
                aria-selected={theme === "light"}
                data-active={theme === "light"}
                className="ag-switcher__option gap-2"
                onClick={() => theme === "dark" && onToggle()}
            >
                <Sun className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
                라이트
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={theme === "dark"}
                data-active={theme === "dark"}
                className="ag-switcher__option gap-2"
                onClick={() => theme === "light" && onToggle()}
            >
                <Moon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
                다크
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const [mounted, setMounted] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <PageContainer>
            <PageHeader
                title="Settings"
                subtitle="프로필·목표 비중·데이터 관리"
            />

            {/* ── Section: 화면 (모바일만) ───────── */}
            <section className="mb-10 md:hidden">
                <p className={SECTION_LABEL_CLASS}>화면</p>
                <ThemeSwitcher theme={theme} onToggle={toggleTheme} />
            </section>

            {/* ── Section: Workspace Profile ─────────────────────────────── */}
            <section className="mb-10">
                <p className={SECTION_LABEL_CLASS}>운용 프로필</p>
                <WorkspaceProfileIntroCard />
            </section>

            {/* ── Section: 목표 포트폴리오 관리 ──────────────────────────────── */}
            <PortfolioStrategyManager workspaceProfile={WORKSPACE_PROFILE} />

            {/* ── Section: 연금 보유 (수동 입력) ─────────────────────────────── */}
            <PensionManualHoldingsManager />

            {/* ── Section: 데이터 백업 및 내보내기 ───────────────────────────── */}
            <section>
                <p className={SECTION_LABEL_CLASS}>데이터 관리</p>

                <div className="rounded-2xl border border-border bg-card">
                    <div className="px-5 py-6 md:px-6 md:py-5">
                        <p className="text-base font-medium text-foreground md:text-sm">
                            데이터 백업 및 내보내기
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:mt-0.5 md:text-xs md:leading-normal">
                            로컬 DB에 저장된 데이터를 파일로 백업하거나 리포트 요약을 내보낼 수 있습니다.
                        </p>
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-4">
                            <a href="/api/export/json" className={PRIMARY_ACTION_CLASS}>
                                전체 데이터 백업 (JSON)
                            </a>
                            <a href="/api/export/csv" className={OUTLINE_ACTION_CLASS}>
                                리포트 내역 내보내기 (CSV)
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section: 앱 정보 ───────────────────────────────────────────── */}
            <section className="mt-14 border-t border-border pt-8 md:mt-16">
                <div className="flex items-center justify-between gap-6">
                    <div className="min-w-0">
                        <p className="text-base font-medium text-foreground md:text-sm">
                            AlphA Holdings
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:mt-0.5 md:text-xs md:leading-normal">
                            포트폴리오 관리 및 투자 리포트 작성 플랫폼
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-base font-medium tabular-nums text-foreground md:text-sm">
                            v{getAppVersion()}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground md:mt-0.5 md:text-xs">
                            버전
                        </p>
                    </div>
                </div>
            </section>
        </PageContainer>
    );
}
