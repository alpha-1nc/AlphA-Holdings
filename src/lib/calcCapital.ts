import { prisma } from "@/lib/prisma";
import { AccountType } from "@/generated/prisma";
import type { NewInvestment } from "@/generated/prisma";

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
  _profileLabel: string,
): Promise<number> {
  if (accountTypes.length === 0) return 0;

  let initialSum = 0;
  if (profileId) {
    const initialCapitals = await prisma.accountInitialCapital.findMany({
      where: { profileId, accountType: { in: accountTypes } },
    });
    initialSum = initialCapitals.reduce((sum, c) => sum + c.krwAmount, 0);
  }

  const investments =
    profileId != null
      ? await prisma.profileInvestment.findMany({
          where: {
            profileId,
            accountType: { in: accountTypes },
          },
        })
      : [];
  const investSum = investments.reduce((sum, i) => sum + i.amountKrw, 0);

  return initialSum + investSum;
}

export { sumNewInvestmentsForAccounts };
