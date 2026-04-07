import { prisma } from "@/lib/prisma";
import { AnalysisReportCard } from "./analysis-report-card";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  const byMonth = new Map<string, typeof reports>();
  for (const report of reports) {
    const key = monthKey(report.reportDate);
    const list = byMonth.get(key);
    if (list) list.push(report);
    else byMonth.set(key, [report]);
  }

  const monthKeys = [...byMonth.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-0">
      {monthKeys.map((key, idx) => {
        const monthReports = byMonth.get(key)!;
        const headingDate = monthReports[0].reportDate;
        const monthLabel = headingDate.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
        });

        return (
          <section
            key={key}
            className={
              idx > 0
                ? "mt-10 border-t border-border/60 pt-10"
                : undefined
            }
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {monthLabel}
              </h2>
              <span className="text-xs text-muted-foreground">
                {monthReports.length}건
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {monthReports.map((report) => {
                const d = report.reportDate;
                const year = d.getFullYear().toString();
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const href = `/analysis/${year}/${month}/${report.slug}`;

                return (
                  <AnalysisReportCard
                    key={report.id}
                    reportId={report.id}
                    href={href}
                    companyName={report.companyName}
                    ticker={report.ticker}
                    rating={report.rating}
                    totalScore={report.totalScore}
                    initialCardImageDataUrl={report.cardImageDataUrl}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
