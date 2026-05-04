/** 영문·야후 등 출처별 섹터명을 대시보드 표시용 한글 라벨로 통일 */
const SECTOR_LABEL_KO_BY_NORMALIZED: Record<string, string> = {
    "basic materials": "소재",
    "communication services": "통신서비스",
    "consumer cyclical": "임의소비재",
    "consumer defensive": "필수소비재",
    "consumer discretionary": "임의소비재",
    "consumer staples": "필수소비재",
    energy: "에너지",
    "financial services": "금융",
    financials: "금융",
    "health care": "헬스케어",
    healthcare: "헬스케어",
    industrials: "산업재",
    "information technology": "기술(IT)",
    materials: "소재",
    "real estate": "부동산",
    technology: "기술(IT)",
    utilities: "유틸리티",
    etf: "ETF",
    "etf / index": "ETF·지수",
};

export function sectorDisplayLabelKo(sector: string | null | undefined): string {
    if (sector == null || !String(sector).trim()) return "기타";
    const raw = String(sector).trim();
    const key = raw.toLowerCase();
    return SECTOR_LABEL_KO_BY_NORMALIZED[key] ?? raw;
}
