"use server";

import { prisma } from "@/lib/prisma";
import { getProfileLabel } from "@/lib/profile";
import type { WorkspaceProfile } from "@/lib/profile";
import { resolveLogoUrl } from "@/lib/ticker-logo";
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

  const logoUrl = await resolveLogoUrl(ticker).catch(() => null);

  await prisma.watchlistItem.upsert({
    where: { profileId_ticker: { profileId: label, ticker } },
    create: { profileId: label, ticker, ...payload, logoUrl },
    update: { ...payload, logoUrl, updatedAt: new Date() },
  });
  revalidatePath("/watchlist");
}

export async function updateWatchlistItem(
  id: string,
  data: {
    interestReason?: string | null;
    riskNotes?: string | null;
    tag?: string;
  }
) {
  await prisma.watchlistItem.update({ where: { id }, data });
  revalidatePath("/watchlist");
}

export async function deleteWatchlistItem(id: string) {
  await prisma.watchlistItem.delete({ where: { id } });
  revalidatePath("/watchlist");
}
