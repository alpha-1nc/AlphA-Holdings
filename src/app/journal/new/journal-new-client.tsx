"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import {
  createOrUpdateJournal,
  getJournalNewPageDefaults,
  getSnapshotSummaryForPeriod,
  type JournalFormData,
} from "@/app/actions/journal";
import { JournalSnapshotCard } from "@/components/journal/journal-snapshot-card";
import { PageMainTitle } from "@/components/layout/page-main-title";
import { getCurrentProfile, getProfileLabel } from "@/lib/profile";
import { generatePeriodOptions } from "@/lib/journal-snapshot";
import type { JournalSnapshotSummary } from "@/lib/journal-snapshot";

const inputCls = [
  "min-h-12 w-full rounded-xl bg-white px-5 py-3 text-base md:min-h-0",
  "text-neutral-900 placeholder:text-neutral-300",
  "ring-1 ring-neutral-200/80 outline-none",
  "transition focus:ring-2 focus:ring-neutral-400",
  "dark:bg-neutral-900 dark:text-neutral-100",
  "dark:placeholder:text-neutral-600 dark:ring-neutral-700",
  "dark:focus:ring-neutral-500",
].join(" ");

const textareaCls = [
  "min-h-[120px] w-full resize-y rounded-xl bg-white px-5 py-3 text-base",
  "text-neutral-900 placeholder:text-neutral-300",
  "ring-1 ring-neutral-200/80 outline-none",
  "transition focus:ring-2 focus:ring-neutral-400",
  "dark:bg-neutral-900 dark:text-neutral-100",
  "dark:placeholder:text-neutral-600 dark:ring-neutral-700",
  "dark:focus:ring-neutral-500",
].join(" ");

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</label>
      {children}
    </div>
  );
}

type JournalNewClientProps = {
  initialPeriod?: string;
};

export function JournalNewClient({ initialPeriod }: JournalNewClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [periodLabel, setPeriodLabel] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [snapshotSummary, setSnapshotSummary] = useState<JournalSnapshotSummary | null>(null);
  const [form, setForm] = useState<JournalFormData>({
    journalKeyword: "",
    journalMarket: "",
    journalReview: "",
    journalPlan: "",
    journalNote: "",
  });

  const periodOptions = generatePeriodOptions(24);

  const loadPeriodData = useCallback(async (period: string, profileLabel: string) => {
    setLoading(true);
    try {
      const data = await getJournalNewPageDefaults(profileLabel, period);
      setPeriodLabel(data.periodLabel);
      setIsEditMode(data.isEditMode);
      setForm(data.form);
      setSnapshotSummary(data.snapshotSummary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const profileLabel = getProfileLabel(getCurrentProfile());
    loadPeriodData(initialPeriod ?? "", profileLabel);
  }, [mounted, initialPeriod, loadPeriodData]);

  const handlePeriodChange = async (nextPeriod: string) => {
    setPeriodLabel(nextPeriod);
    const profileLabel = getProfileLabel(getCurrentProfile());
    setLoading(true);
    try {
      const [defaults, summary] = await Promise.all([
        getJournalNewPageDefaults(profileLabel, nextPeriod),
        getSnapshotSummaryForPeriod(nextPeriod),
      ]);
      setIsEditMode(defaults.isEditMode);
      setForm(defaults.form);
      setSnapshotSummary(summary);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key: keyof JournalFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profileLabel = getProfileLabel(getCurrentProfile());

    startTransition(async () => {
      const result = await createOrUpdateJournal(profileLabel, periodLabel, form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEditMode ? "일지가 수정되었습니다." : "일지가 저장되었습니다.");
      router.push(`/journal/${result.id}`);
    });
  };

  if (!mounted || (loading && !periodLabel)) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-48 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageMainTitle icon={PenLine}>
        {isEditMode ? "일지 수정" : "새 일지 작성"}
      </PageMainTitle>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-4">
          <FormField label="기간">
            <select
              value={periodLabel}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className={inputCls}
              disabled={loading || isPending}
            >
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </FormField>

          {loading ? (
            <div className="h-48 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
          ) : (
            <JournalSnapshotCard summary={snapshotSummary} />
          )}
        </section>

        <section className="space-y-6">
          <FormField label="이 달의 키워드">
            <input
              type="text"
              value={form.journalKeyword}
              onChange={(e) => updateField("journalKeyword", e.target.value)}
              placeholder="이번 달을 한마디로"
              className={inputCls}
              disabled={isPending}
            />
          </FormField>

          <FormField label="시장 요약">
            <textarea
              value={form.journalMarket}
              onChange={(e) => updateField("journalMarket", e.target.value)}
              placeholder="이번 달 시장 흐름, 주요 이슈를 기록하세요."
              className={textareaCls}
              disabled={isPending}
            />
          </FormField>

          <FormField label="포트폴리오 리뷰">
            <textarea
              value={form.journalReview}
              onChange={(e) => updateField("journalReview", e.target.value)}
              placeholder="보유 종목, 비중 변화, 성과를 돌아보세요."
              className={textareaCls}
              disabled={isPending}
            />
          </FormField>

          <FormField label="다음 계획">
            <textarea
              value={form.journalPlan}
              onChange={(e) => updateField("journalPlan", e.target.value)}
              placeholder="다음 달 매수·매도·리밸런싱 계획을 적어보세요."
              className={textareaCls}
              disabled={isPending}
            />
          </FormField>

          <FormField label="느낀점 / 메모">
            <textarea
              value={form.journalNote}
              onChange={(e) => updateField("journalNote", e.target.value)}
              placeholder="투자 심리, 배운 점, 기타 메모."
              className={textareaCls}
              disabled={isPending}
            />
          </FormField>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--ah-accent)", color: "var(--ah-accent-fg)" }}
          >
            {isPending ? "저장 중…" : "저장"}
          </button>
          <Link
            href="/journal"
            className="inline-flex items-center rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-zinc-700 dark:text-neutral-200 dark:hover:bg-zinc-800"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
