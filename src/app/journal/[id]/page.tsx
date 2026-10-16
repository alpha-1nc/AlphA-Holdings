import { notFound } from "next/navigation";
import Link from "next/link";
import { getJournalById } from "@/app/actions/journal";
import { JournalDetailActions } from "@/components/journal/journal-detail-actions";
import { JournalSnapshotCard } from "@/components/journal/journal-snapshot-card";
import { JournalPortfolioSnapshot } from "@/components/journal/journal-portfolio-snapshot";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function JournalTextSection({
  title,
  content,
  withDivider,
}: {
  title: string;
  content: string | null;
  withDivider?: boolean;
}) {
  if (!content?.trim()) return null;
  return (
    <>
      {withDivider ? <hr className="border-border/60" /> : null}
      <section className={cn(withDivider && "pt-6")}>
        <h2 className="shell-label">{title}</h2>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">
          {content}
        </div>
      </section>
    </>
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

  const recordSections = [
    { title: "시장 요약", content: journal.journalMarket },
    { title: "포트폴리오 리뷰", content: journal.journalReview },
    { title: "다음 계획", content: journal.journalPlan },
    { title: "느낀점 / 메모", content: journal.journalNote },
  ].filter((s) => s.content?.trim());

  return (
    <PageContainer>
      <PageHeader
        title="Journal"
        subtitle={`${journal.periodLabel} · 작성일 ${formatDate(journal.createdAt)}`}
        actions={
          <JournalDetailActions
            journalId={journal.id}
            periodLabel={journal.periodLabel}
          />
        }
      />

      <div className="space-y-10">
        <JournalSnapshotCard summary={journal.snapshotSummary} />

        <JournalPortfolioSnapshot snapshot={journal.frozenSnapshot} />

        {journal.journalKeyword?.trim() && (
          <div className="shell-metric-card">
            <p className="shell-label">이 달의 키워드</p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">
              {journal.journalKeyword}
            </p>
          </div>
        )}

        {recordSections.length > 0 && (
          <div className="surface-card space-y-6 p-6">
            {recordSections.map((section, index) => (
              <JournalTextSection
                key={section.title}
                title={section.title}
                content={section.content}
                withDivider={index > 0}
              />
            ))}
          </div>
        )}

        <Link
          href="/journal"
          className="inline-flex text-sm text-muted-foreground transition hover:text-foreground"
        >
          ← 일지 목록으로
        </Link>
      </div>
    </PageContainer>
  );
}
