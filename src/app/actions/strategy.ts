"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { AccountType, AssetRole } from "@/generated/prisma";
import type { WorkspaceProfile } from "@/lib/profile";
import { PROFILE_LABELS } from "@/lib/profile";

// WorkspaceProfile 키를 Profile 레코드 ID로 변환 (없으면 생성)
async function resolveProfileId(workspaceProfile: WorkspaceProfile): Promise<string> {
    const label = PROFILE_LABELS[workspaceProfile];
    const profile = await prisma.profile.upsert({
        where: { label },
        create: { label },
        update: {},
    });
    return profile.id;
}

export type GetPortfolioStrategiesOptions = {
    /** 미지정 시 전체 조회 */
    accountTypes?: AccountType[];
};

// ── 특정 프로필의 전략 목록 조회 ─────────────────────────────────────
export async function getPortfolioStrategies(
    workspaceProfile: WorkspaceProfile,
    options?: GetPortfolioStrategiesOptions,
) {
    const profileId = await resolveProfileId(workspaceProfile);
    const types = options?.accountTypes?.filter(Boolean);
    return prisma.portfolioStrategy.findMany({
        where: {
            profileId,
            ...(types && types.length > 0 ? { accountType: { in: types } } : {}),
        },
        orderBy: { createdAt: "asc" },
    });
}

// ── 전략 추가 또는 수정 (profileId + ticker + accountType 기준 upsert) ─────────
export async function upsertPortfolioStrategy(data: {
    workspaceProfile: WorkspaceProfile;
    ticker: string;
    displayName?: string | null;
    role: AssetRole;
    targetWeight: number;
    /** 미전달 시 US_DIRECT */
    accountType?: AccountType;
}) {
    const profileId = await resolveProfileId(data.workspaceProfile);
    const ticker = data.ticker.trim().toUpperCase();
    const accountType = data.accountType ?? "US_DIRECT";
    const displayName =
        data.displayName != null && String(data.displayName).trim() !== ""
            ? String(data.displayName).trim()
            : null;

    await prisma.portfolioStrategy.upsert({
        where: {
            profileId_ticker_accountType: { profileId, ticker, accountType },
        },
        create: {
            profileId,
            ticker,
            displayName,
            role: data.role,
            targetWeight: data.targetWeight,
            accountType,
        },
        update: {
            displayName,
            role: data.role,
            targetWeight: data.targetWeight,
            accountType,
        },
    });

    revalidatePath("/settings");
}

// ── 전략 삭제 (profileId + ticker + accountType) ─────────────────────────
export async function deletePortfolioStrategy(data: {
    workspaceProfile: WorkspaceProfile;
    ticker: string;
    accountType: AccountType;
}) {
    const profileId = await resolveProfileId(data.workspaceProfile);
    const ticker = data.ticker.trim().toUpperCase();
    await prisma.portfolioStrategy.deleteMany({
        where: { profileId, ticker, accountType: data.accountType },
    });
    revalidatePath("/settings");
}
