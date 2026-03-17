"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getReportBySlug } from "@/constants/analysis-reports";

export default function AnalysisReportViewerPage() {
  const params = useParams();
  const year = String(params.year);
  const month = String(params.month);
  const slug = String(params.slug);

  const report = getReportBySlug(year, month, slug);

  if (!report) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          해당 보고서를 찾을 수 없습니다.
        </p>
        <Link
          href="/analysis"
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Link>
      </div>
    );
  }

  const reportPath = `/analysis-reports/${year}/${month}/${report.fileName}`;

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/analysis"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Link>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {year}년 {parseInt(month, 10)}월 · {report.companyName}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <iframe
          src={reportPath}
          title={report.title}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
