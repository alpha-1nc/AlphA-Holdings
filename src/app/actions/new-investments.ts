"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { AccountType, Currency } from "@/generated/prisma";

// ── 신규 투자금 목록 조회 (reportId 기준) ────────────────────────
export async function getNewInvestments(reportId: number) {
    return prisma.newInvestment.findMany({
        where: { reportId },
        orderBy: { createdAt: "asc" },
    });
}

// ── 신규 투자금 추가 ────────────────────────────────────────────
export async function createNewInvestment(data: {
    reportId: number;
    accountType: AccountType;
    originalCurrency: Currency;
    originalAmount: number;
    krwAmount: number;
}) {
    await prisma.newInvestment.create({ data });
    revalidatePath("/");
    revalidatePath(`/reports/${data.reportId}`);
}

// ── 신규 투자금 수정 ────────────────────────────────────────────
export async function updateNewInvestment(
    id: number,
    data: Partial<{
        accountType: AccountType;
        originalCurrency: Currency;
        originalAmount: number;
        krwAmount: number;
    }>
) {
    const item = await prisma.newInvestment.update({ where: { id }, data });
    revalidatePath("/");
    revalidatePath(`/reports/${item.reportId}`);
}

// ── 신규 투자금 삭제 ────────────────────────────────────────────
export async function deleteNewInvestment(id: number) {
    const item = await prisma.newInvestment.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath(`/reports/${item.reportId}`);
}

// ── 리포트별 신규 투자금 총합 조회 ──────────────────────────────
export async function getTotalNewInvestmentByReport(reportId: number): Promise<number> {
    const investments = await prisma.newInvestment.findMany({
        where: { reportId },
    });
    return investments.reduce((sum, inv) => sum + inv.krwAmount, 0);
}

// ── 프로필별 리포트들의 신규 투자금 조회 (월별) ──────────────────
export async function getNewInvestmentsByProfile(profile: string) {
    const reports = await prisma.report.findMany({
        where: { profile },
        orderBy: { createdAt: "asc" },
        include: {
            newInvestments: true,
        },
    });
    
    return reports.map((report) => ({
        periodLabel: report.periodLabel,
        type: report.type,
        totalNewInvestment: report.newInvestments.reduce((sum, inv) => sum + inv.krwAmount, 0),
        byAccount: report.newInvestments.reduce((acc, inv) => {
            const key = inv.accountType;
            acc[key] = (acc[key] || 0) + inv.krwAmount;
            return acc;
        }, {} as Record<AccountType, number>),
    }));
}
