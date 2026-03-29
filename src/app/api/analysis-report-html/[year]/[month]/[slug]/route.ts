import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DB에 저장된 투자 분석 HTML을 제공합니다(iframe src).
 * public/ 정적 파일 대신 사용 — 서버리스에서 런타임 파일 쓰기 불가 문제 회피.
 */
export async function GET(
    _request: Request,
    context: { params: Promise<{ year: string; month: string; slug: string }> }
) {
    const { year: yStr, month: mStr, slug } = await context.params;
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    if (Number.isNaN(year) || Number.isNaN(month)) {
        return new NextResponse("Bad request", { status: 400 });
    }

    const row = await prisma.analysisReportUpload.findUnique({
        where: {
            year_month_companyCode: {
                year,
                month,
                companyCode: slug.toUpperCase(),
            },
        },
    });

    if (!row) {
        return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(row.html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, max-age=120",
        },
    });
}
