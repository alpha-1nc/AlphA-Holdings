import AnalysisReportList from "./AnalysisReportList";
import { AnalysisPageShell } from "./analysis-page-shell";
import { AnalysisStockView } from "./analysis-stock-view";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  return (
    <AnalysisPageShell>
      <AnalysisStockView>
        <AnalysisReportList />
      </AnalysisStockView>
    </AnalysisPageShell>
  );
}
