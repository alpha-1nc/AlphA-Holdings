"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, PenLine, Plus } from "lucide-react";
import { getReportsByProfileAndType } from "@/app/actions/reports";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import type { Report, PortfolioItem, NewInvestment } from "@/generated/prisma";
import { PageMainTitle } from "@/components/layout/page-main-title";
import { cn } from "@/lib/utils";

type ReportWithItems = Report & {
  portfolioItems: PortfolioItem[];
  newInvestments?: NewInvestment[];
};

function parsePeriodSortKey(periodLabel: string): number {
  const monthly = /^(\d{4})-(\d{2})$/.exec(periodLabel.trim());
  if (monthly) {
    return Number(monthly[1]) * 100 + Number(monthly[2]);
  }
  const quarterly = /^(\d{4})-Q([1-4])$/.exec(periodLabel.trim());
  if (quarterly) {
    return Number(quarterly[1]) * 100 + Number(quarterly[2]) * 3;
  }
  return 0;
}

function formatCreatedDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getPreview(report: ReportWithItems): string {
  if (report.type === "JOURNAL") {
    const keyword = (report.journalKeyword || "").trim();
    if (keyword) return keyword;
  }
  const text = (report.summary || report.journal || "").trim();
  if (!text) return "내용 없음";
  const firstLine = text.split("\n")[0]?.replace(/^[-•*]\s*/, "").trim() ?? "";
  if (firstLine.length <= 80) return firstLine;
  return `${firstLine.slice(0, 80)}…`;
}

function typeBadgeLabel(type: Report["type"]): string {
  if (type === "QUARTERLY") return "분기";
  if (type === "MONTHLY") return "월별";
  return "일지";
}

function JournalEntryRow({ report }: { report: ReportWithItems }) {
  const href = report.type === "JOURNAL" ? `/journal/${report.id}` : `/reports/${report.id}`;
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-neutral-200/90 bg-white/80 px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:shadow-black/20"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">
            {report.periodLabel}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {formatCreatedDate(report.createdAt)}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
          {getPreview(report)}
        </p>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-neutral-400 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}

function ArchiveEntryRow({ report }: { report: ReportWithItems }) {
  return (
    <Link
      href={`/reports/${report.id}`}
      className="group flex items-center gap-3 rounded-xl border border-neutral-200/90 bg-white/60 px-4 py-3 transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {report.periodLabel}
          </span>
          <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {typeBadgeLabel(report.type)}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {formatCreatedDate(report.createdAt)}
          </span>
        </div>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-neutral-400 opacity-40 transition group-hover:opacity-80"
        aria-hidden
      />
    </Link>
  );
}

export default function JournalPage() {
  const [profileId, setProfileId] = useState<string>("alpha-ceo");
  const [journalReports, setJournalReports] = useState<ReportWithItems[]>([]);
  const [archiveReports, setArchiveReports] = useState<ReportWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setProfileId(getCurrentProfile());
  }, []);

  useEffect(() => {
    if (!mounted || !profileId) return;
    setLoading(true);
    const profileLabel = getProfileLabel(profileId as "alpha-ceo" | "partner");
    Promise.all([
      getReportsByProfileAndType(profileLabel, "JOURNAL"),
      getReportsByProfileAndType(profileLabel, "MONTHLY"),
      getReportsByProfileAndType(profileLabel, "QUARTERLY"),
    ])
      .then(([journal, monthly, quarterly]) => {
        setJournalReports(journal as ReportWithItems[]);
        const combined = [...(monthly as ReportWithItems[]), ...(quarterly as ReportWithItems[])];
        combined.sort((a, b) => {
          const periodDiff = parsePeriodSortKey(b.periodLabel) - parsePeriodSortKey(a.periodLabel);
          if (periodDiff !== 0) return periodDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setArchiveReports(combined);
      })
      .finally(() => setLoading(false));
  }, [mounted, profileId]);

  const sortedJournalReports = useMemo(
    () =>
      [...journalReports].sort((a, b) => {
        const periodDiff = parsePeriodSortKey(b.periodLabel) - parsePeriodSortKey(a.periodLabel);
        if (periodDiff !== 0) return periodDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [journalReports],
  );

  if (!mounted || loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-4">
        <PageMainTitle icon={PenLine}>일지</PageMainTitle>
        <Link
          href="/journal/new"
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold md:px-[1.125rem] md:text-[0.9375rem] transition-all hover:opacity-80"
          style={{ background: "var(--ah-accent)", color: "var(--ah-accent-fg)" }}
        >
          <Plus className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" />
          새 일지 작성
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-tight text-neutral-500 dark:text-neutral-400">
          일지
        </h2>
        {sortedJournalReports.length > 0 ? (
          <div className="space-y-3">
            {sortedJournalReports.map((report) => (
              <JournalEntryRow key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/80 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              아직 작성한 일지가 없습니다.
            </p>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              매달 마지막 거래일에 한 편씩 기록해보세요.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setArchiveOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-neutral-200/90 bg-neutral-50/80 px-4 py-3 text-left transition hover:bg-neutral-100/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/70"
        >
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            지난 기록 ({archiveReports.length})
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-neutral-400 transition-transform",
              archiveOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {archiveOpen && (
          <div className="space-y-2">
            {archiveReports.length > 0 ? (
              archiveReports.map((report) => (
                <ArchiveEntryRow key={report.id} report={report} />
              ))
            ) : (
              <p className="px-2 py-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
                저장된 과거 리포트가 없습니다.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
