import { notFound } from "next/navigation";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { getJournalById } from "@/app/actions/journal";
import { JournalSnapshotCard } from "@/components/journal/journal-snapshot-card";
import { PageMainTitle } from "@/components/layout/page-main-title";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function JournalTextSection({ title, content }: { title: string; content: string | null }) {
  if (!content?.trim()) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-neutral-500 dark:text-neutral-400">
        {title}
      </h2>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">
        {content}
      </div>
    </section>
  );
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!idStr || Number.isNaN(id) || !Number.isInteger(id)) {
    notFound();
  }

  const journal = await getJournalById(id);
  if (!journal) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <PageMainTitle icon={PenLine}>투자 일지</PageMainTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-900 dark:text-white">
              {journal.periodLabel}
            </span>
            <span>·</span>
            <span>작성일 {formatDate(journal.createdAt)}</span>
          </div>
        </div>
        <Link
          href={`/journal/new?period=${encodeURIComponent(journal.periodLabel)}`}
          className="shrink-0 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-zinc-700 dark:text-neutral-200 dark:hover:bg-zinc-800"
        >
          수정
        </Link>
      </div>

      <JournalSnapshotCard summary={journal.snapshotSummary} />

      {journal.journalKeyword?.trim() && (
        <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-500">
            이 달의 키워드
          </p>
          <p className="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">
            {journal.journalKeyword}
          </p>
        </div>
      )}

      <div className="space-y-8">
        <JournalTextSection title="시장 요약" content={journal.journalMarket} />
        <JournalTextSection title="포트폴리오 리뷰" content={journal.journalReview} />
        <JournalTextSection title="다음 계획" content={journal.journalPlan} />
        <JournalTextSection title="느낀점 / 메모" content={journal.journalNote} />
      </div>

      <Link
        href="/journal"
        className="inline-flex text-sm text-neutral-500 transition hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        ← 일지 목록으로
      </Link>
    </div>
  );
}
