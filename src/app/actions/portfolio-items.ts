"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { AccountType, Currency, AssetRole } from "@/generated/prisma";

// ── PortfolioItem 목록 조회 (reportId 기준) ────────────────
export async function getPortfolioItems(reportId: number) {
    return prisma.portfolioItem.findMany({
        where: { reportId },
        orderBy: { createdAt: "asc" },
    });
}

// ── PortfolioItem 추가 ────────────────────────────────────
export async function createPortfolioItem(data: {
    reportId: number;
    ticker: string;
    accountType: AccountType;
    originalCurrency: Currency;
    originalAmount: number;
    krwAmount: number;
    role?: AssetRole;
}) {
    const { role, ...rest } = data;
    await prisma.portfolioItem.create({
        data: { ...rest, ...(role != null ? { role } : {}) },
    });
    revalidatePath("/");
    revalidatePath(`/reports/${data.reportId}`);
}

// ── PortfolioItem 수정 ────────────────────────────────────
export async function updatePortfolioItem(
    id: number,
    data: Partial<{
        ticker: string;
        accountType: AccountType;
        originalCurrency: Currency;
        originalAmount: number;
        krwAmount: number;
        role: AssetRole;
    }>
) {
    const item = await prisma.portfolioItem.update({ where: { id }, data });
    revalidatePath("/");
    revalidatePath(`/reports/${item.reportId}`);
}

// ── PortfolioItem 삭제 ────────────────────────────────────
export async function deletePortfolioItem(id: number) {
    const item = await prisma.portfolioItem.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath(`/reports/${item.reportId}`);
}
