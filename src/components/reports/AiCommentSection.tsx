"use client";

import { useState, useTransition, useEffect } from "react";
import { generateReportAiComment } from "@/app/actions/ai-comment";
import type { ReportAiComment } from "@/generated/prisma";

interface AiCommentSectionProps {
  reportId: number;
  profileId: string;
  initialComment: ReportAiComment | null;
}

const SECTION_CONFIG = [
  {
    key: "monthlySummary" as const,
    label: "이번 달 해석",
    sublabel: "CURRENT STATUS",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    accent: "from-[var(--accent-500)] to-[var(--accent-700)]",
    iconBg: "bg-accent text-accent-foreground",
  },
  {
    key: "monthlyChange" as const,
    label: "지난달 대비 변화",
    sublabel: "MONTH-OVER-MONTH",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
    accent: "from-[var(--accent-600)] to-[var(--accent-400)]",
    iconBg: "bg-accent text-accent-foreground",
  },
  {
    key: "nextAction" as const,
    label: "다음 액션 제안",
    sublabel: "NEXT ACTION",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    accent: "from-[var(--accent-700)] to-[var(--accent-500)]",
    iconBg: "bg-accent text-accent-foreground",
  },
] as const;

export function AiCommentSection({ reportId, profileId, initialComment }: AiCommentSectionProps) {
  const [comment, setComment] = useState<ReportAiComment | null>(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formattedDate, setFormattedDate] = useState<string>("");

  useEffect(() => {
    if (!comment?.updatedAt) return;
    const d = new Date(comment.updatedAt);
    setFormattedDate(
      d.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [comment?.updatedAt]);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateReportAiComment(reportId, profileId);
        setComment(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI 분석 생성 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-none">
      {/* 상단 강조 바 */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[var(--accent-600)] via-[var(--accent-500)] to-[var(--accent-400)]" />

      <div className="p-5 pt-6">
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                AI ANALYSIS
              </p>
              <h3 className="text-sm font-semibold text-foreground">
                AlphA AI 포트폴리오 분석
              </h3>
            </div>
          </div>

          {comment && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              분석 업데이트
            </button>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* 데이터 없음 — 생성 버튼 */}
        {!comment && !isPending && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-50 dark:bg-neutral-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                아직 AI 분석이 생성되지 않았습니다.
              </p>
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                규칙 기반 엔진으로 포트폴리오 상태를 분석합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI 분석 생성하기
            </button>
          </div>
        )}

        {/* 로딩 스피너 */}
        {isPending && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-accent/50" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">AI가 포트폴리오를 분석 중입니다…</p>
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">규칙 엔진 플래그를 기반으로 요약을 생성합니다.</p>
            </div>
          </div>
        )}

        {/* 분석 결과 카드 3개 */}
        {comment && !isPending && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {SECTION_CONFIG.map((section) => {
              const text = comment[section.key];
              return (
                <div
                  key={section.key}
                  className="relative overflow-hidden rounded-xl border border-border bg-muted/40 p-4"
                >
                  <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${section.accent}`} />
                  <div className="mb-3 flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${section.iconBg}`}>
                      {section.icon}
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                        {section.sublabel}
                      </p>
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                        {section.label}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {text ?? (
                      <span className="italic text-neutral-400 dark:text-neutral-500">이전 데이터 없음</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* 생성 일시 — 클라이언트 전용 렌더로 hydration 오류 방지 */}
        {comment && (
          <p className="mt-3 text-right text-[10px] text-neutral-400 dark:text-neutral-600" suppressHydrationWarning>
            마지막 분석: {formattedDate}
          </p>
        )}
      </div>
    </div>
  );
}
