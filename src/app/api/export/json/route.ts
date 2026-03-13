import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const reports = await prisma.report.findMany({
            include: {
                portfolioItems: true,
                newInvestments: true,
            },
            orderBy: { createdAt: "asc" },
        });

        const backup = {
            exportedAt: new Date().toISOString(),
            reports,
        };

        const jsonString = JSON.stringify(backup, null, 2);

        return new NextResponse(jsonString, {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Disposition": 'attachment; filename="alphaholdings_backup.json"',
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[export/json]", error);
        return NextResponse.json(
            { error: "데이터 내보내기에 실패했습니다." },
            { status: 500 }
        );
    }
}
