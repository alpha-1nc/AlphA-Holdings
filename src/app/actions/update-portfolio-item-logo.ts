"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const MAX_DATA_URL_LENGTH = 2_800_000;
const MAX_EMBED_URL_LENGTH = 4_096;

function isAllowedLogoValue(s: string): boolean {
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

export async function updatePortfolioItemLogo(
  portfolioItemId: number,
  reportId: number,
  dataUrlOrUrl: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (dataUrlOrUrl !== null) {
    if (!isAllowedLogoValue(dataUrlOrUrl)) {
      return {
        ok: false,
        error: "이미지 데이터 또는 http(s) 이미지 주소만 저장할 수 있습니다.",
      };
    }
    if (
      dataUrlOrUrl.startsWith("data:") &&
      dataUrlOrUrl.length > MAX_DATA_URL_LENGTH
    ) {
      return { ok: false, error: "이미지가 너무 큽니다. 더 작은 이미지를 사용해 주세요." };
    }
    if (
      (dataUrlOrUrl.startsWith("http://") || dataUrlOrUrl.startsWith("https://")) &&
      dataUrlOrUrl.length > MAX_EMBED_URL_LENGTH
    ) {
      return { ok: false, error: "이미지 주소가 너무 깁니다." };
    }
  }

  try {
    const updated = await prisma.portfolioItem.updateMany({
      where: {
        id: portfolioItemId,
        reportId,
      },
      data: { logoUrl: dataUrlOrUrl },
    });
    if (updated.count === 0) {
      return { ok: false, error: "해당 종목을 찾을 수 없습니다." };
    }
    revalidatePath(`/reports/${reportId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "저장에 실패했습니다." };
  }
}
