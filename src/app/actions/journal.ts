"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { syncHoldingsSafe } from "@/lib/broker/sync-holdings-safe";
import { getTossExchangeRate } from "@/lib/broker/toss-client";
import {
  buildJournalFrozenSnapshotFromHoldings,
  buildJournalFrozenSnapshotFromRawPositions,
  parseJournalFrozenSnapshot,
  type JournalFrozenSnapshot,
} from "@/lib/journal-frozen-snapshot";
import {
  buildJournalSnapshotSummary,
  currentPeriodLabel,
  generatePeriodOptions,
  periodLabelToMonthBounds,
  previousPeriodLabel,
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

const EMPTY_JOURNAL_FORM: JournalFormData = {
  journalKeyword: "",
  journalMarket: "",
  journalReview: "",
  journalPlan: "",
  journalNote: "",
};

const SYNC_FALLBACK_WARNING = "최신 동기화 실패 · 최근 데이터로 저장됨";

function journalFormFromEntry(entry: JournalEntry): JournalFormData {
  return {
    journalKeyword: entry.journalKeyword ?? "",
    journalMarket: entry.journalMarket ?? "",
    journalReview: entry.journalReview ?? "",
    journalPlan: entry.journalPlan ?? "",
    journalNote: entry.journalNote ?? "",
  };
}

async function findFirstPeriodWithoutJournal(profileLabel: string): Promise<string> {
  for (const period of generatePeriodOptions(24)) {
    const existing = await getJournalByPeriod(profileLabel, period);
    if (!existing) return period;
  }
  return currentPeriodLabel();
}

async function findSnapshotForPeriod(periodLabel: string) {
  const bounds = periodLabelToMonthBounds(periodLabel);
  if (!bounds) return null;

  return prisma.portfolioSnapshot.findFirst({
    where: {
      profileId: getSyncProfileId(),
      snapshotKind: "DAILY",
      date: { gte: bounds.start, lt: bounds.end },
    },
    orderBy: { date: "desc" },
  });
}

async function findLatestDailySnapshot() {
  return prisma.portfolioSnapshot.findFirst({
    where: {
      profileId: getSyncProfileId(),
      snapshotKind: "DAILY",
    },
    orderBy: { date: "desc" },
  });
}

async function fetchJpyRatePer100(): Promise<number | null> {
  try {
    return await getTossExchangeRate("JPY");
  } catch {
    return null;
  }
}

async function enrichRawPositionsWithNames(
  rawPositions: Array<{
    ticker: string;
    name?: string | null;
    accountType: string;
    currency: string;
    marketValue?: number;
    marketValueKrw?: number;
  }>,
) {
  const holdings = await prisma.holding.findMany({
    where: { profileId: getSyncProfileId() },
    select: { ticker: true, accountType: true, name: true },
  });
  const nameByKey = new Map<string, string | null>(
    holdings.map((h) => [`${h.accountType}:${h.ticker}`, h.name] as const),
  );

  return rawPositions.map((p) => ({
    ...p,
    name: p.name ?? nameByKey.get(`${p.accountType}:${p.ticker}`) ?? null,
  }));
}

async function buildFrozenSnapshotAfterSync(usdRate: number): Promise<{
  frozen: JournalFrozenSnapshot;
  snapshotId: string | null;
}> {
  const profileId = getSyncProfileId();
  const [holdings, jpyRate, todaySnapshot] = await Promise.all([
    prisma.holding.findMany({ where: { profileId } }),
    fetchJpyRatePer100(),
    prisma.portfolioSnapshot.findFirst({
      where: {
        profileId,
        snapshotKind: "DAILY",
        date: (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
      },
    }),
  ]);

  const frozen = buildJournalFrozenSnapshotFromHoldings(holdings, {
    usdRate,
    jpyRate,
    syncedAt: new Date(),
    usedFallback: false,
  });

  return { frozen, snapshotId: todaySnapshot?.id ?? null };
}

async function buildFrozenSnapshotFromFallback(): Promise<JournalFrozenSnapshot | null> {
  const latest = await findLatestDailySnapshot();
  if (!latest) return null;

  const rawPositions = Array.isArray(latest.positions)
    ? (latest.positions as Array<{
        ticker: string;
        name?: string | null;
        accountType: string;
        currency: string;
        marketValue?: number;
        marketValueKrw?: number;
      }>)
    : [];

  const enriched = await enrichRawPositionsWithNames(rawPositions);

  return buildJournalFrozenSnapshotFromRawPositions(enriched, {
    usdRate: latest.usdRate,
    jpyRate: null,
    totalValueKrw: latest.totalValueKrw,
    syncedAt: latest.syncedAt,
    usedFallback: true,
  });
}

async function resolveFrozenSnapshotForSave(): Promise<{
  frozen: JournalFrozenSnapshot | null;
  snapshotId: string | null;
  syncWarning: string | null;
}> {
  const syncResult = await syncHoldingsSafe();

  if (syncResult.ok) {
    const { frozen, snapshotId } = await buildFrozenSnapshotAfterSync(syncResult.usdRate);
    return { frozen, snapshotId, syncWarning: null };
  }

  const fallback = await buildFrozenSnapshotFromFallback();
  return {
    frozen: fallback,
    snapshotId: fallback ? (await findLatestDailySnapshot())?.id ?? null : null,
    syncWarning: fallback ? SYNC_FALLBACK_WARNING : null,
  };
}

async function fetchMonthNewDepositsKrw(periodLabel: string): Promise<number> {
  const bounds = periodLabelToMonthBounds(periodLabel);
  if (!bounds) return 0;

  const rows = await prisma.profileInvestment.findMany({
    where: {
      profileId: getSyncProfileId(),
      date: { gte: bounds.start, lt: bounds.end },
    },
  });
  return rows.reduce((s, r) => s + r.amountKrw, 0);
}

function snapshotLikeFromFrozen(frozen: JournalFrozenSnapshot) {
  return {
    id: "frozen",
    date: new Date(frozen.syncedAt),
    totalValueKrw: frozen.totalValueKrw,
    netCashFlowKrw: null as number | null,
    positions: frozen.positions.map((p) => ({
      ticker: p.ticker,
      accountType: p.accountType,
      marketValueKrw: p.marketValueKrw,
    })),
  };
}

async function buildSummaryForPeriod(periodLabel: string): Promise<JournalSnapshotSummary | null> {
  const snapshot = await findSnapshotForPeriod(periodLabel);
  if (!snapshot) return null;

  const prevLabel = previousPeriodLabel(periodLabel);
  const [prevSnapshot, monthNewDepositsKrw] = await Promise.all([
    prevLabel ? findSnapshotForPeriod(prevLabel) : Promise.resolve(null),
    fetchMonthNewDepositsKrw(periodLabel),
  ]);

  return buildJournalSnapshotSummary(snapshot, {
    prevSnapshot: prevSnapshot ? { totalValueKrw: prevSnapshot.totalValueKrw } : null,
    monthNewDepositsKrw,
  });
}

async function buildSummaryFromFrozen(
  frozen: JournalFrozenSnapshot,
  periodLabel: string,
): Promise<JournalSnapshotSummary> {
  const prevLabel = previousPeriodLabel(periodLabel);
  const [prevSnapshot, monthNewDepositsKrw] = await Promise.all([
    prevLabel ? findSnapshotForPeriod(prevLabel) : Promise.resolve(null),
    fetchMonthNewDepositsKrw(periodLabel),
  ]);

  return buildJournalSnapshotSummary(snapshotLikeFromFrozen(frozen), {
    prevSnapshot: prevSnapshot ? { totalValueKrw: prevSnapshot.totalValueKrw } : null,
    monthNewDepositsKrw,
  });
}

export async function getSnapshotSummaryForPeriod(
  periodLabel: string,
): Promise<JournalSnapshotSummary | null> {
  return buildSummaryForPeriod(periodLabel);
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

  const frozenSnapshot = parseJournalFrozenSnapshot(report.journalFrozenSnapshot);

  let snapshotSummary: JournalSnapshotSummary | null = null;
  if (frozenSnapshot) {
    snapshotSummary = await buildSummaryFromFrozen(frozenSnapshot, report.periodLabel);
  } else if (report.snapshot) {
    snapshotSummary = buildJournalSnapshotSummary(report.snapshot, {
      prevSnapshot: null,
      monthNewDepositsKrw: 0,
    });
  } else {
    snapshotSummary = await buildSummaryForPeriod(report.periodLabel);
  }

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
    frozenSnapshot,
    snapshotSummary,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export async function createOrUpdateJournal(
  profileLabel: string,
  periodLabel: string,
  data: JournalFormData,
): Promise<
  { ok: true; id: number; syncWarning?: string } | { ok: false; error: string }
> {
  const trimmedPeriod = periodLabel.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmedPeriod)) {
    return { ok: false, error: "기간 형식이 올바르지 않습니다. (예: 2026-06)" };
  }

  const { frozen, snapshotId, syncWarning } = await resolveFrozenSnapshotForSave();

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
    journalFrozenSnapshot: frozen ?? undefined,
    usdRate: frozen?.usdRate ?? null,
    jpyRate: frozen?.jpyRate ?? null,
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

  return syncWarning ? { ok: true, id, syncWarning } : { ok: true, id };
}

export async function deleteJournal(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return { ok: false, error: "일지를 찾을 수 없습니다." };
  }
  if (report.type !== "JOURNAL") {
    return { ok: false, error: "일지만 삭제할 수 있습니다." };
  }

  await prisma.report.delete({ where: { id } });

  revalidatePath("/journal");
  revalidatePath("/journal/new");

  return { ok: true };
}

export async function getJournalNewPageDefaults(
  profileLabel: string,
  options?: { periodLabel?: string; mode?: "new" | "edit" },
) {
  const mode = options?.mode ?? "new";
  const requestedPeriod = options?.periodLabel?.trim();

  const period =
    requestedPeriod ||
    (mode === "new"
      ? await findFirstPeriodWithoutJournal(profileLabel)
      : currentPeriodLabel());

  const [existing, snapshotSummary] = await Promise.all([
    getJournalByPeriod(profileLabel, period),
    getSnapshotSummaryForPeriod(period),
  ]);

  const isEditMode = mode === "edit";
  const form =
    isEditMode && existing ? journalFormFromEntry(existing) : { ...EMPTY_JOURNAL_FORM };

  return {
    periodLabel: period,
    isEditMode,
    existingId: existing?.id ?? null,
    hasExistingJournal: !!existing,
    form,
    snapshotSummary,
  };
}
