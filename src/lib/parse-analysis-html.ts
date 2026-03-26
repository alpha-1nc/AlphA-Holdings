import type { AnalysisReportMeta } from "@/constants/analysis-reports";

/**
 * AI가 생성한 투자 분석 HTML에서 메타데이터를 추출합니다.
 * 푸터의 "YYYY년 M월" 날짜, title/h1의 티커·회사명, 판정(BUY/HOLD/SELL)을 사용합니다.
 */
export function parseAnalysisReportHtml(html: string): AnalysisReportMeta {
    const trimmed = html.trim();
    if (!trimmed) {
        throw new Error("HTML이 비어 있습니다.");
    }

    const dateMatches = [...trimmed.matchAll(/(\d{4})년\s*(\d{1,2})월/g)];
    if (!dateMatches.length) {
        throw new Error(
            'HTML에서 "YYYY년 M월" 형식의 날짜를 찾을 수 없습니다. 푸터 등에 보고서 기준일이 포함되어 있는지 확인해 주세요.'
        );
    }
    const lastDate = dateMatches[dateMatches.length - 1];
    const year = parseInt(lastDate[1], 10);
    const month = parseInt(lastDate[2], 10);
    if (month < 1 || month > 12) {
        throw new Error("유효하지 않은 월입니다.");
    }

    const titleMatch = trimmed.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim();
    if (!title) {
        throw new Error("<title> 태그를 찾을 수 없습니다.");
    }

    let ticker: string | null = null;
    const nyse = trimmed.match(/\(NYSE:\s*([A-Z]{1,5})\)/i);
    const nasdaq = trimmed.match(/\(NASDAQ:\s*([A-Z]{1,5})\)/i);
    if (nyse) ticker = nyse[1].toUpperCase();
    else if (nasdaq) ticker = nasdaq[1].toUpperCase();
    else {
        const titleTicker = title.match(/\(([A-Z]{1,5})\)\s*장기/);
        if (titleTicker) ticker = titleTicker[1].toUpperCase();
    }
    if (!ticker) {
        throw new Error('티커를 찾을 수 없습니다. 예: (NYSE: UNH), (NASDAQ: NET), 제목의 "(UNH)" 형식을 사용해 주세요.');
    }

    const h1Match = trimmed.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    let companyName = "";
    if (h1Match) {
        const h1 = h1Match[1].trim();
        companyName = h1.replace(/\s*\([^)]+\)\s*[—–-].*$/, "").trim();
    }
    if (!companyName) {
        companyName = title
            .replace(/\s*\([^)]+\)\s*장기.*$/i, "")
            .replace(/장기 투자 분석 보고서.*$/i, "")
            .trim();
    }
    if (!companyName) {
        companyName = ticker;
    }

    let verdict: AnalysisReportMeta["verdict"] | undefined;
    const v1 = trimmed.match(/최종\s*판정[:\s：]*\s*(BUY|HOLD|SELL)/i);
    const v2 = trimmed.match(/class="vtext"[^>]*>\s*(BUY|HOLD|SELL)\s*</i);
    const v3 = trimmed.match(/hbadge[^>]*>[\s\S]{0,80}?(BUY|HOLD|SELL)/i);
    const vPick = v1?.[1] ?? v2?.[1] ?? v3?.[1];
    if (vPick) {
        verdict = vPick.toUpperCase() as NonNullable<AnalysisReportMeta["verdict"]>;
    }

    const yy = String(year).slice(-2);
    const mm = String(month).padStart(2, "0");
    const fileName = `${ticker}_Report_${yy}${mm}.html`;

    return {
        year,
        month,
        companyCode: ticker,
        companyName,
        title,
        fileName,
        verdict,
    };
}
