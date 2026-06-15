"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  buildJournalSnapshotSummary,
  currentPeriodLabel,
  periodLabelToMonthBounds,
  type JournalSnapshotSummary,
} from "@/lib/journal-snapshot";

function getSyncProfileId(): string {
  const id = process.env.SYNC_PROFILE_ID;
  if (!id) throw new Error("SYNC_PROFILE_ID가 설정되지 않았습니다.");
  return id;
}

export type JournalFormData = {
  journalKeyword: string;
  journalMarket: string;
  journalReview: string;
  journalPlan: string;
  journalNote: string;
};

export type JournalEntry = {
  id: number;
  periodLabel: string;
  profile: string;
  journalKeyword: string | null;
  journalMarket: string | null;
  journalReview: string | null;
  journalPlan: string | null;
  journalNote: string | null;
  snapshotId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function findSnapshotForPeriod(periodLabel: string) {
  const bounds = periodLabelToMonthBounds(periodLabel);
  if (!bounds) return null;

  return prisma.portfolioSnapshot.findFirst({
    where: {
      profileId: getSyncProfileId(),
      date: { gte: bounds.start, lt: bounds.end },
    },
    orderBy: { date: "desc" },
  });
}

export async function getSnapshotSummaryForPeriod(
  periodLabel: string,
): Promise<JournalSnapshotSummary | null> {
  const snapshot = await findSnapshotForPeriod(periodLabel);
  if (!snapshot) return null;
  return buildJournalSnapshotSummary(snapshot);
}

export async function getJournalByPeriod(
  profileLabel: string,
  periodLabel: string,
): Promise<JournalEntry | null> {
  const report = await prisma.report.findFirst({
    where: {
      profile: profileLabel,
      periodLabel,
      type: "JOURNAL",
    },
  });
  if (!report) return null;

  return {
    id: report.id,
    periodLabel: report.periodLabel,
    profile: report.profile,
    journalKeyword: report.journalKeyword,
    journalMarket: report.summary,
    journalReview: report.journalReview,
    journalPlan: report.strategy,
    journalNote: report.journal,
    snapshotId: report.snapshotId,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export async function getJournalById(id: number) {
  const report = await prisma.report.findUnique({
    where: { id },
    include: { snapshot: true },
  });
  if (!report || report.type !== "JOURNAL") return null;

  const snapshotSummary = report.snapshot
    ? buildJournalSnapshotSummary(report.snapshot)
    : null;

  return {
    id: report.id,
    periodLabel: report.periodLabel,
    profile: report.profile,
    journalKeyword: report.journalKeyword,
    journalMarket: report.summary,
    journalReview: report.journalReview,
    journalPlan: report.strategy,
    journalNote: report.journal,
    snapshotId: report.snapshotId,
    snapshotSummary,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export async function createOrUpdateJournal(
  profileLabel: string,
  periodLabel: string,
  data: JournalFormData,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const trimmedPeriod = periodLabel.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmedPeriod)) {
    return { ok: false, error: "기간 형식이 올바르지 않습니다. (예: 2026-06)" };
  }

  const snapshot = await findSnapshotForPeriod(trimmedPeriod);
  const snapshotId = snapshot?.id ?? null;

  const payload = {
    type: "JOURNAL" as const,
    periodLabel: trimmedPeriod,
    profile: profileLabel,
    status: "PUBLISHED" as const,
    journalKeyword: data.journalKeyword.trim() || null,
    summary: data.journalMarket.trim() || null,
    journalReview: data.journalReview.trim() || null,
    strategy: data.journalPlan.trim() || null,
    journal: data.journalNote.trim() || null,
    snapshotId,
  };

  const existing = await prisma.report.findFirst({
    where: {
      profile: profileLabel,
      periodLabel: trimmedPeriod,
      type: "JOURNAL",
    },
  });

  let id: number;
  if (existing) {
    const updated = await prisma.report.update({
      where: { id: existing.id },
      data: payload,
    });
    id = updated.id;
  } else {
    const created = await prisma.report.create({ data: payload });
    id = created.id;
  }

  revalidatePath("/journal");
  revalidatePath("/journal/new");
  revalidatePath(`/journal/${id}`);

  return { ok: true, id };
}

export async function getJournalNewPageDefaults(
  profileLabel: string,
  periodLabel?: string,
) {
  const period = periodLabel?.trim() || currentPeriodLabel();
  const [existing, snapshotSummary] = await Promise.all([
    getJournalByPeriod(profileLabel, period),
    getSnapshotSummaryForPeriod(period),
  ]);

  return {
    periodLabel: period,
    isEditMode: !!existing,
    existingId: existing?.id ?? null,
    form: {
      journalKeyword: existing?.journalKeyword ?? "",
      journalMarket: existing?.journalMarket ?? "",
      journalReview: existing?.journalReview ?? "",
      journalPlan: existing?.journalPlan ?? "",
      journalNote: existing?.journalNote ?? "",
    },
    snapshotSummary,
  };
}
