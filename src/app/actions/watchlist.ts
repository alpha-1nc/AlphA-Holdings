"use server";

import { prisma } from "@/lib/prisma";
import { getProfileLabel } from "@/lib/profile";
import type { WorkspaceProfile } from "@/lib/profile";
import { revalidatePath } from "next/cache";

export async function getWatchlistItems(profileId: WorkspaceProfile) {
  const label = getProfileLabel(profileId);
  return prisma.watchlistItem.findMany({
    where: { profileId: label },
    orderBy: { addedAt: "desc" },
  });
}

export async function addWatchlistItem(
  profileId: WorkspaceProfile,
  data: {
    ticker: string;
    companyName: string;
    interestReason?: string;
    riskNotes?: string;
    tag?: string;
  }
) {
  const label = getProfileLabel(profileId);
  const ticker = data.ticker.trim().toUpperCase();
  const payload = {
    companyName: data.companyName.trim(),
    tag: data.tag ?? "관심",
    interestReason: data.interestReason?.trim() || null,
    riskNotes: data.riskNotes?.trim() || null,
  };

  await prisma.watchlistItem.upsert({
    where: { profileId_ticker: { profileId: label, ticker } },
    create: { profileId: label, ticker, ...payload, logoUrl: null },
    update: { ...payload, logoUrl: null, updatedAt: new Date() },
  });
  revalidatePath("/watchlist");
}

export async function updateWatchlistItem(
  id: string,
  data: {
    ticker?: string;
    companyName?: string;
    interestReason?: string | null;
    riskNotes?: string | null;
    tag?: string;
  }
) {
  const existing = await prisma.watchlistItem.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("종목을 찾을 수 없습니다.");
  }

  const nextTicker = data.ticker?.trim().toUpperCase() ?? existing.ticker;
  const payload = {
    companyName: data.companyName?.trim() ?? existing.companyName,
    tag: data.tag ?? existing.tag,
    interestReason:
      data.interestReason !== undefined
        ? data.interestReason?.trim() || null
        : existing.interestReason,
    riskNotes:
      data.riskNotes !== undefined ? data.riskNotes?.trim() || null : existing.riskNotes,
  };

  if (nextTicker !== existing.ticker) {
    const conflict = await prisma.watchlistItem.findUnique({
      where: {
        profileId_ticker: { profileId: existing.profileId, ticker: nextTicker },
      },
    });
    if (conflict && conflict.id !== id) {
      throw new Error("이미 같은 티커가 있습니다.");
    }
    await prisma.watchlistItem.update({
      where: { id },
      data: { ...payload, ticker: nextTicker, logoUrl: null },
    });
  } else {
    await prisma.watchlistItem.update({ where: { id }, data: payload });
  }

  revalidatePath("/watchlist");
}

export async function deleteWatchlistItem(id: string) {
  await prisma.watchlistItem.delete({ where: { id } });
  revalidatePath("/watchlist");
}
