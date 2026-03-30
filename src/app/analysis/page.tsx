import AnalysisReportList from "./AnalysisReportList";
import { AnalysisPageShell } from "./analysis-page-shell";
import AnalysisTickerForm from "./analysis-ticker-form";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  return (
    <AnalysisPageShell>
      <div role="banner">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          주식 분석 리포트
        </h1>
      </div>

      <AnalysisTickerForm />

      <hr className="my-2 h-px w-full shrink-0 border-0 bg-border" />

      <AnalysisReportList />
    </AnalysisPageShell>
  );
}
