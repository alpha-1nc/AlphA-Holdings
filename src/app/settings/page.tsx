"use client";

import { useEffect, useState } from "react";
import { getCurrentProfile, setCurrentProfile, type WorkspaceProfile } from "@/lib/profile";
import { Settings } from "lucide-react";
import { getAppVersion } from "@/lib/version";
import { PageMainTitle } from "@/components/layout/page-main-title";
import { PortfolioStrategyManager } from "@/components/settings/PortfolioStrategyManager";
import { ProfileSegmentedControl } from "@/components/settings/profile-segmented-control";

export default function SettingsPage() {
    const [profile, setProfile] = useState<WorkspaceProfile>("alpha-ceo");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setProfile(getCurrentProfile());
    }, []);

    function handleProfileChange(value: WorkspaceProfile) {
        setProfile(value);
        setCurrentProfile(value);
        // 프로필 변경 시 페이지 새로고침하여 모든 데이터 재로드
        window.location.reload();
    }

    if (!mounted) return null;

    return (
        <div className="mx-auto max-w-2xl pb-16">
            {/* Page Header */}
            <div className="mb-12">
                <PageMainTitle icon={Settings}>Settings</PageMainTitle>
            </div>

            {/* ── Section: Workspace Profile ─────────────────────────────── */}
            <section className="mb-10">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    운용 프로필
                </p>

                <ProfileSegmentedControl value={profile} onChange={handleProfileChange} />

                <p className="mt-3 px-1 text-xs text-neutral-400 dark:text-neutral-500">
                    대시보드 조회 및 리포트 작성 시 사용되는 기본 운용 주체입니다.
                </p>
            </section>

            {/* ── Section: 목표 포트폴리오 관리 ──────────────────────────────── */}
            <PortfolioStrategyManager workspaceProfile={profile} />

            {/* ── Section: 데이터 백업 및 내보내기 ───────────────────────────── */}
            <section>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    데이터 관리
                </p>

                <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800">
                    <div className="px-6 py-5">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            데이터 백업 및 내보내기
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                            로컬 DB에 저장된 데이터를 파일로 백업하거나 리포트 요약을 내보낼 수 있습니다.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <a
                                href="/api/export/json"
                                className="inline-flex items-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                            >
                                전체 데이터 백업 (JSON)
                            </a>
                            <a
                                href="/api/export/csv"
                                className="inline-flex items-center rounded-lg ring-1 ring-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:ring-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800/60"
                            >
                                리포트 내역 내보내기 (CSV)
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section: 앱 정보 ───────────────────────────────────────────── */}
            <section className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            AlphA Holdings
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                            포트폴리오 관리 및 투자 리포트 작성 플랫폼
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            v{getAppVersion()}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                            버전
                        </p>
                    </div>
                </div>
            </section>

        </div>
    );
}
