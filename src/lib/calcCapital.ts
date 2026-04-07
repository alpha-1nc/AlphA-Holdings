import { prisma } from "@/lib/prisma";
import { AccountType } from "@/generated/prisma";
import type { NewInvestment, PortfolioItem } from "@/generated/prisma";

function sumNewInvestmentsForAccounts(
  investments: NewInvestment[] | undefined | null,
  accountTypes: AccountType[]
): number {
  if (!investments?.length) return 0;
  return investments
    .filter((i) => accountTypes.includes(i.accountType))
    .reduce((s, i) => s + i.krwAmount, 0);
}

/**
 * 계좌별 누적 원금: 초기 원금(AccountInitialCapital) + 해당 계좌의 NewInvestment 전체 합산
 * (프로필에 Profile 행이 없으면 초기 원금 0)
 */
export async function calcAccountCapital(
  profileId: string | null,
  accountTypes: AccountType[],
  profileLabel: string
): Promise<number> {
  if (accountTypes.length === 0) return 0;

  let initialSum = 0;
  if (profileId) {
    const initialCapitals = await prisma.accountInitialCapital.findMany({
      where: { profileId, accountType: { in: accountTypes } },
    });
    initialSum = initialCapitals.reduce((sum, c) => sum + c.krwAmount, 0);
  }

  const investments = await prisma.newInvestment.findMany({
    where: {
      report: { profile: profileLabel, status: "PUBLISHED" },
      accountType: { in: accountTypes },
    },
  });
  const investSum = investments.reduce((sum, i) => sum + i.krwAmount, 0);

  return initialSum + investSum;
}

/**
 * 계좌별 현재 평가금: PortfolioItem 중 accountTypes에 포함되며 CASH 계좌 유형은 제외
 * (현금은 도넛 등에서 별도 처리)
 */
export function sumPortfolioValueKrwForAccounts(
  items: PortfolioItem[],
  accountTypes: AccountType[]
): number {
  return items
    .filter(
      (i) =>
        accountTypes.includes(i.accountType) &&
        i.accountType !== "CASH" &&
        i.krwAmount > 0
    )
    .reduce((sum, i) => sum + i.krwAmount, 0);
}

export { sumNewInvestmentsForAccounts };
