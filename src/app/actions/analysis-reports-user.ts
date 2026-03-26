"use server";

import { revalidatePath } from "next/cache";
import { parseAnalysisReportHtml } from "@/lib/parse-analysis-html";
import { upsertUserReport } from "@/lib/analysis-reports-data";

const MAX_HTML_LENGTH = 5_000_000;

export async function saveAnalysisReportFromHtml(html: string) {
    const trimmed = html.trim().replace(/^\uFEFF/, "");
    if (!trimmed) {
        throw new Error("HTML을 붙여넣어 주세요.");
    }
    if (trimmed.length > MAX_HTML_LENGTH) {
        throw new Error("HTML이 너무 깁니다. (최대 약 5MB)");
    }

    const meta = parseAnalysisReportHtml(trimmed);
    await upsertUserReport(trimmed, meta);

    const m = String(meta.month).padStart(2, "0");
    revalidatePath("/analysis");
    revalidatePath(`/analysis/${meta.year}/${m}/${meta.companyCode}`);
}
