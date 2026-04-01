"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const MAX_DATA_URL_LENGTH = 2_800_000;
const MAX_EMBED_URL_LENGTH = 4_096;

function isAllowedCardImageValue(s: string): boolean {
  if (s.startsWith("data:image/")) return true;
  if (s.startsWith("https://") || s.startsWith("http://")) {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }
  return false;
}

export async function updateAnalysisCardImage(
  reportId: string,
  dataUrl: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (dataUrl !== null) {
    if (!isAllowedCardImageValue(dataUrl)) {
      return { ok: false, error: "이미지 데이터 또는 http(s) 이미지 주소만 저장할 수 있습니다." };
    }
    if (dataUrl.startsWith("data:") && dataUrl.length > MAX_DATA_URL_LENGTH) {
      return { ok: false, error: "이미지가 너무 큽니다. 더 작은 이미지를 사용해 주세요." };
    }
    if ((dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) && dataUrl.length > MAX_EMBED_URL_LENGTH) {
      return { ok: false, error: "이미지 주소가 너무 깁니다." };
    }
  }

  try {
    const report = await prisma.analysisReport.update({
      where: { id: reportId },
      data: { cardImageDataUrl: dataUrl },
      select: { reportDate: true, slug: true },
    });
    const y = report.reportDate.getFullYear();
    const m = String(report.reportDate.getMonth() + 1).padStart(2, "0");
    revalidatePath("/analysis");
    revalidatePath(`/analysis/${y}/${m}/${report.slug}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "저장에 실패했습니다." };
  }
}
