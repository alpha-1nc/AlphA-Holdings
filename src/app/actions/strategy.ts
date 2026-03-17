"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { AssetRole } from "@/generated/prisma";
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

// ── 특정 프로필의 전략 목록 조회 ─────────────────────────────────────
export async function getPortfolioStrategies(workspaceProfile: WorkspaceProfile) {
    const profileId = await resolveProfileId(workspaceProfile);
    return prisma.portfolioStrategy.findMany({
        where: { profileId },
        orderBy: { createdAt: "asc" },
    });
}

// ── 전략 추가 또는 수정 (ticker 기준 upsert) ─────────────────────────
export async function upsertPortfolioStrategy(data: {
    workspaceProfile: WorkspaceProfile;
    ticker: string;
    role: AssetRole;
    targetWeight: number;
}) {
    const profileId = await resolveProfileId(data.workspaceProfile);
    const ticker = data.ticker.trim().toUpperCase();

    await prisma.portfolioStrategy.upsert({
        where: { profileId_ticker: { profileId, ticker } },
        create: {
            profileId,
            ticker,
            role: data.role,
            targetWeight: data.targetWeight,
        },
        update: {
            role: data.role,
            targetWeight: data.targetWeight,
        },
    });

    revalidatePath("/settings");
}

// ── 전략 삭제 ─────────────────────────────────────────────────────────
export async function deletePortfolioStrategy(id: string) {
    await prisma.portfolioStrategy.delete({ where: { id } });
    revalidatePath("/settings");
}
