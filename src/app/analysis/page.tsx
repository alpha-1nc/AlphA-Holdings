import { getMergedAnalysisReports } from "@/lib/analysis-reports-data";
import AnalysisReportsClient from "./analysis-reports-client";

export const dynamic = "force-dynamic";

export default async function AnalysisReportsPage() {
    const reports = await getMergedAnalysisReports();
    return <AnalysisReportsClient initialReports={reports} />;
}
