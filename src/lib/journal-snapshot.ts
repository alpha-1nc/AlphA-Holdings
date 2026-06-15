import type { AccountType } from "@/generated/prisma";
import { ACCOUNT_GROUPS, type AccountGroupKey } from "@/lib/accountGroups";

export type SnapshotPosition = {
  accountType: string;
  marketValueKrw: number;
};

export type JournalSnapshotSummary = {
  id: string;
  date: Date;
  totalValueKrw: number;
  returnRate: number | null;
  accountWeights: Array<{
    key: AccountGroupKey;
    label: string;
    valueKrw: number;
    pct: number;
  }>;
};

const GROUP_LABELS: Record<AccountGroupKey, string> = {
  직투: "직투",
  ISA: "ISA",
  연금저축: "연금",
};

export function periodLabelToMonthBounds(periodLabel: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(periodLabel.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

export function currentPeriodLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function generatePeriodOptions(count = 24): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return options;
}

export function buildJournalSnapshotSummary(snapshot: {
  id: string;
  date: Date;
  totalValueKrw: number;
  netCashFlowKrw: number | null;
  positions: unknown;
}): JournalSnapshotSummary {
  const positions = Array.isArray(snapshot.positions)
    ? (snapshot.positions as SnapshotPosition[])
    : [];

  const groupValues: Record<AccountGroupKey, number> = {
    직투: 0,
    ISA: 0,
    연금저축: 0,
  };

  for (const pos of positions) {
    const group = (Object.keys(ACCOUNT_GROUPS) as AccountGroupKey[]).find((key) =>
      (ACCOUNT_GROUPS[key] as readonly AccountType[]).includes(pos.accountType as AccountType),
    );
    if (group) {
      groupValues[group] += pos.marketValueKrw ?? 0;
    }
  }

  const totalFromPositions = Object.values(groupValues).reduce((s, v) => s + v, 0);
  const totalValueKrw = snapshot.totalValueKrw > 0 ? snapshot.totalValueKrw : totalFromPositions;

  const netCashFlow = snapshot.netCashFlowKrw ?? 0;
  const returnRate =
    netCashFlow > 0 ? ((totalValueKrw - netCashFlow) / netCashFlow) * 100 : null;

  const accountWeights = (Object.keys(ACCOUNT_GROUPS) as AccountGroupKey[]).map((key) => {
    const valueKrw = groupValues[key];
    const pct = totalValueKrw > 0 ? (valueKrw / totalValueKrw) * 100 : 0;
    return {
      key,
      label: GROUP_LABELS[key],
      valueKrw,
      pct,
    };
  });

  return {
    id: snapshot.id,
    date: snapshot.date,
    totalValueKrw,
    returnRate,
    accountWeights,
  };
}
