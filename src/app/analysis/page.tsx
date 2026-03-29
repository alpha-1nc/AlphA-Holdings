import { Separator } from "@/components/ui/separator";
import AnalysisReportList from "./AnalysisReportList";
import AnalysisTickerForm from "./analysis-ticker-form";

export const dynamic = "force-dynamic";

export default function AnalysisPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          주식 분석 리포트
        </h1>
      </header>

      <AnalysisTickerForm />

      <Separator className="my-2" />

      <AnalysisReportList />
    </div>
  );
}
