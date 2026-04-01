import { prisma } from "@/lib/prisma";
import { AnalysisReportCard } from "./analysis-report-card";

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
          <AnalysisReportCard
            key={report.id}
            reportId={report.id}
            href={href}
            companyName={report.companyName}
            ticker={report.ticker}
            rating={report.rating}
            totalScore={report.totalScore}
            periodLabel={report.periodLabel}
            initialCardImageDataUrl={report.cardImageDataUrl}
          />
        );
      })}
    </div>
  );
}
