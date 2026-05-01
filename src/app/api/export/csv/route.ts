import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escapeCsvField(value: string | number | null | undefined): string {
    if (value == null) return "";
    const str = String(value);
    // 쉼표, 줄바꿈, 따옴표 포함 시 따옴표로 감싸기
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export async function GET() {
    try {
        const reports = await prisma.report.findMany({
            orderBy: { createdAt: "asc" },
        });

        const headers = [
            "작성일",
            "기간",
            "유형",
            "총투자금(원)",
            "현재평가금(원)",
            "수익률(%)",
            "프로필",
            "상태",
        ];

        const rows = reports.map((r) => {
            const inv = r.totalInvestedKrw;
            const cur = r.totalCurrentKrw;
            const 수익률 =
                inv != null && cur != null && inv > 0
                    ? String(Math.round(((cur - inv) / inv) * 100))
                    : "-";

            return [
                r.createdAt.toISOString().slice(0, 10),
                escapeCsvField(r.periodLabel),
                r.type,
                inv != null ? inv.toFixed(2) : "",
                cur != null ? cur.toFixed(2) : "",
                수익률,
                escapeCsvField(r.profile),
                r.status,
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\r\n");
        const bom = "\uFEFF";
        const blob = bom + csvContent;

        return new NextResponse(blob, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8-sig",
                "Content-Disposition": 'attachment; filename="alphaholdings_reports.csv"',
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[export/csv]", error);
        return NextResponse.json(
            { error: "CSV 내보내기에 실패했습니다." },
            { status: 500 }
        );
    }
}
