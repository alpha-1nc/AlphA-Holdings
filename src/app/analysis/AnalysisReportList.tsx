import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalysisReportDeleteButton } from "./analysis-report-delete-button";

function ratingBadgeClass(rating: string): string {
  switch (rating) {
    case "Strong Buy":
      return "border-emerald-500/50 bg-emerald-600/15 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-300";
    case "Buy":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-400/15 dark:text-emerald-200";
    case "Hold":
      return "border-amber-400/50 bg-amber-400/15 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200";
    case "Sell":
      return "border-orange-400/50 bg-orange-500/15 text-orange-800 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-orange-200";
    case "Strong Sell":
      return "border-red-400/50 bg-red-600/15 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default async function AnalysisReportList() {
  const reports = await prisma.analysisReport.findMany({
    orderBy: { reportDate: "desc" },
  });

  if (reports.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        아직 생성된 리포트가 없습니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reports.map((report) => {
        const d = report.reportDate;
        const year = d.getFullYear().toString();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const href = `/analysis/${year}/${month}/${report.slug}`;

        return (
          <Card
            key={report.id}
            className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:ring-1 hover:ring-foreground/10"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <Link href={href} className="min-w-0 flex-1 outline-none">
                <CardTitle className="line-clamp-2 text-base leading-snug transition-colors hover:text-primary">
                  {report.companyName}
                </CardTitle>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {report.ticker}
                </p>
              </Link>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] font-semibold ${ratingBadgeClass(report.rating)}`}
              >
                {report.rating}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Link href={href} className="block outline-none">
                <p className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                  {Number.isInteger(report.totalScore)
                    ? report.totalScore
                    : report.totalScore.toFixed(1)}
                </p>
              </Link>
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={href}
                  className="min-w-0 flex-1 truncate text-xs text-muted-foreground outline-none transition-colors hover:text-foreground"
                >
                  {report.periodLabel}
                </Link>
                <AnalysisReportDeleteButton
                  reportId={report.id}
                  companyName={report.companyName}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
