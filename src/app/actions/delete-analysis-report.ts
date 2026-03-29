"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function deleteAnalysisReport(id: string) {
  const report = await prisma.analysisReport.findUnique({
    where: { id },
    select: { id: true, slug: true, reportDate: true },
  });
  if (!report) {
    throw new Error("리포트를 찾을 수 없습니다.");
  }

  await prisma.analysisReport.delete({ where: { id: report.id } });

  const y = report.reportDate.getFullYear();
  const m = String(report.reportDate.getMonth() + 1).padStart(2, "0");
  revalidatePath("/analysis");
  revalidatePath(`/analysis/${y}/${m}/${report.slug}`);
}
