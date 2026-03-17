"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLatestAiComment } from "@/app/actions/reports";
import { getProfileLabel } from "@/lib/profile";
import type { WorkspaceProfile } from "@/lib/profile";

interface AiBriefingBannerProps {
  profileId: WorkspaceProfile;
}

type AiCommentData = Awaited<ReturnType<typeof getLatestAiComment>>;

export function AiBriefingBanner({ profileId }: AiBriefingBannerProps) {
  const [data, setData] = useState<AiCommentData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const profileLabel = getProfileLabel(profileId);
    getLatestAiComment(profileLabel)
      .then(setData)
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) {
    return (
      <div className="h-[72px] animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
    );
  }

  if (!data) return null;

  const typeLabel = data.type === "MONTHLY" ? "월별" : "분기별";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-violet-50/40 px-5 py-4 shadow-sm dark:border-blue-900/30 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-violet-950/10">
      {/* 왼쪽 강조 선 */}
      <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl bg-gradient-to-b from-blue-400 to-violet-500" />

      <div className="flex items-start gap-3 pl-1">
        {/* 아이콘 */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>

        {/* 텍스트 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500 dark:text-blue-400">
              최신 리포트 <span className="normal-case">AlphA</span> AI 브리핑
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              {data.periodLabel} · {typeLabel}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-700 dark:text-neutral-200">
            {data.comment.nextAction}
          </p>
        </div>

        {/* 링크 */}
        <Link
          href={`/reports/${data.reportId}`}
          className="ml-auto shrink-0 self-center rounded-lg border border-blue-200/80 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-blue-600 transition hover:bg-white hover:text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/60"
        >
          전체 보기 →
        </Link>
      </div>
    </div>
  );
}
