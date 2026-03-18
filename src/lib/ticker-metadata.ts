/**
 * 통합 티커 메타데이터 (Single Source of Truth)
 * - 브랜드 컬러, Clearbit 도메인, 섹터 등 종목별 UI/차트용 정보
 * - 80~100개: 미국(빅테크/배당/금융/에너지/필수소비재), 일본 5대상사, 한국 주요 상장사·ETF
 */

export interface TickerMetadata {
    name: string;
    domain: string;
    color: string;
    sector: string;
}

export const TICKER_METADATA: Record<string, TickerMetadata> = {
    // ── US 빅테크 ─────────────────────────────────────────────────────
    AAPL: { name: "Apple Inc.", domain: "apple.com", color: "#A3AAAE", sector: "Technology" },
    MSFT: { name: "Microsoft Corporation", domain: "microsoft.com", color: "#00A4EF", sector: "Technology" },
    GOOGL: { name: "Alphabet Inc. (Class A)", domain: "google.com", color: "#EA4335", sector: "Technology" },
    GOOG: { name: "Alphabet Inc. (Class C)", domain: "google.com", color: "#EA4335", sector: "Technology" },
    AMZN: { name: "Amazon.com Inc.", domain: "amazon.com", color: "#FF9900", sector: "Consumer Discretionary" },
    META: { name: "Meta Platforms Inc.", domain: "meta.com", color: "#0866FF", sector: "Technology" },
    NVDA: { name: "NVIDIA Corporation", domain: "nvidia.com", color: "#76B900", sector: "Technology" },
    TSLA: { name: "Tesla Inc.", domain: "tesla.com", color: "#E82127", sector: "Consumer Discretionary" },
    NFLX: { name: "Netflix Inc.", domain: "netflix.com", color: "#E50914", sector: "Communication Services" },
    AMD: { name: "Advanced Micro Devices Inc.", domain: "amd.com", color: "#ED1C24", sector: "Technology" },
    INTC: { name: "Intel Corporation", domain: "intel.com", color: "#0071C5", sector: "Technology" },
    QCOM: { name: "QUALCOMM Incorporated", domain: "qualcomm.com", color: "#3253DC", sector: "Technology" },
    TSM: { name: "Taiwan Semiconductor Mfg.", domain: "tsmc.com", color: "#1A73E8", sector: "Technology" },
    AVGO: { name: "Broadcom Inc.", domain: "broadcom.com", color: "#E31937", sector: "Technology" },
    CRM: { name: "Salesforce Inc.", domain: "salesforce.com", color: "#00A1E0", sector: "Technology" },
    ADBE: { name: "Adobe Inc.", domain: "adobe.com", color: "#FF0000", sector: "Technology" },
    ORCL: { name: "Oracle Corporation", domain: "oracle.com", color: "#F80000", sector: "Technology" },
    IBM: { name: "International Business Machines", domain: "ibm.com", color: "#0530AD", sector: "Technology" },
    NOW: { name: "ServiceNow Inc.", domain: "servicenow.com", color: "#81B5A1", sector: "Technology" },
    SNOW: { name: "Snowflake Inc.", domain: "snowflake.com", color: "#29B5E8", sector: "Technology" },
    PLTR: { name: "Palantir Technologies Inc.", domain: "palantir.com", color: "#6E3FF3", sector: "Technology" },
    COIN: { name: "Coinbase Global Inc.", domain: "coinbase.com", color: "#0052FF", sector: "Financials" },
    UBER: { name: "Uber Technologies Inc.", domain: "uber.com", color: "#000000", sector: "Consumer Discretionary" },
    ABNB: { name: "Airbnb Inc.", domain: "airbnb.com", color: "#FF5A5F", sector: "Consumer Discretionary" },
    SHOP: { name: "Shopify Inc.", domain: "shopify.com", color: "#96BF48", sector: "Technology" },
    PYPL: { name: "PayPal Holdings Inc.", domain: "paypal.com", color: "#003087", sector: "Financials" },
    SPOT: { name: "Spotify Technology S.A.", domain: "spotify.com", color: "#1DB954", sector: "Communication Services" },
    DIS: { name: "The Walt Disney Company", domain: "disney.com", color: "#113CCF", sector: "Communication Services" },
    HOOD: { name: "Robinhood Markets Inc.", domain: "robinhood.com", color: "#00C805", sector: "Financials" },
    BABA: { name: "Alibaba Group Holding Ltd.", domain: "alibaba.com", color: "#FF6A00", sector: "Consumer Discretionary" },
    CSCO: { name: "Cisco Systems Inc.", domain: "cisco.com", color: "#049FD9", sector: "Technology" },
    ASML: { name: "ASML Holding N.V.", domain: "asml.com", color: "#D32F2F", sector: "Technology" },

    // ── US 배당/가치주/필수소비재 ──────────────────────────────────────
    JNJ: { name: "Johnson & Johnson", domain: "jnj.com", color: "#D51920", sector: "Health Care" },
    PG: { name: "Procter & Gamble Co.", domain: "pg.com", color: "#003DA5", sector: "Consumer Staples" },
    KO: { name: "The Coca-Cola Company", domain: "coca-cola.com", color: "#F40009", sector: "Consumer Staples" },
    PEP: { name: "PepsiCo Inc.", domain: "pepsico.com", color: "#E32934", sector: "Consumer Staples" },
    WMT: { name: "Walmart Inc.", domain: "walmart.com", color: "#0071CE", sector: "Consumer Staples" },
    HD: { name: "The Home Depot Inc.", domain: "homedepot.com", color: "#FF6600", sector: "Consumer Discretionary" },
    MCD: { name: "McDonald's Corporation", domain: "mcdonalds.com", color: "#FBC817", sector: "Consumer Discretionary" },
    COST: { name: "Costco Wholesale Corporation", domain: "costco.com", color: "#009CDF", sector: "Consumer Staples" },
    NKE: { name: "NIKE Inc.", domain: "nike.com", color: "#111111", sector: "Consumer Discretionary" },
    SBUX: { name: "Starbucks Corporation", domain: "starbucks.com", color: "#00704A", sector: "Consumer Discretionary" },
    XOM: { name: "Exxon Mobil Corporation", domain: "exxonmobil.com", color: "#ED1B2F", sector: "Energy" },
    CVX: { name: "Chevron Corporation", domain: "chevron.com", color: "#0033A0", sector: "Energy" },
    BRK: { name: "Berkshire Hathaway Inc.", domain: "berkshirehathaway.com", color: "#000000", sector: "Financials" },
    UNH: { name: "UnitedHealth Group Inc.", domain: "unitedhealthgroup.com", color: "#004B87", sector: "Health Care" },
    VZ: { name: "Verizon Communications Inc.", domain: "verizon.com", color: "#CD040B", sector: "Communication Services" },
    T: { name: "AT&T Inc.", domain: "att.com", color: "#00A4E0", sector: "Communication Services" },
    O: { name: "Realty Income Corporation", domain: "realtyincome.com", color: "#7832A8", sector: "Real Estate" },
    ABBV: { name: "AbbVie Inc.", domain: "abbvie.com", color: "#C532B2", sector: "Health Care" },
    MRK: { name: "Merck & Co. Inc.", domain: "merck.com", color: "#0033A0", sector: "Health Care" },
    LLY: { name: "Eli Lilly and Company", domain: "lilly.com", color: "#4B286D", sector: "Health Care" },

    // ── US 금융/에너지 ─────────────────────────────────────────────────
    JPM: { name: "JPMorgan Chase & Co.", domain: "jpmorganchase.com", color: "#003087", sector: "Financials" },
    BAC: { name: "Bank of America Corporation", domain: "bankofamerica.com", color: "#EE3524", sector: "Financials" },
    GS: { name: "The Goldman Sachs Group Inc.", domain: "goldmansachs.com", color: "#001E4D", sector: "Financials" },
    MS: { name: "Morgan Stanley", domain: "morganstanley.com", color: "#000000", sector: "Financials" },
    WFC: { name: "Wells Fargo & Company", domain: "wellsfargo.com", color: "#D71E28", sector: "Financials" },
    C: { name: "Citigroup Inc.", domain: "citigroup.com", color: "#000050", sector: "Financials" },
    V: { name: "Visa Inc.", domain: "visa.com", color: "#1A1F71", sector: "Financials" },
    MA: { name: "Mastercard Incorporated", domain: "mastercard.com", color: "#EB001B", sector: "Financials" },
    AXP: { name: "American Express Company", domain: "americanexpress.com", color: "#2E77BC", sector: "Financials" },
    BLK: { name: "BlackRock Inc.", domain: "blackrock.com", color: "#2D2D2D", sector: "Financials" },
    SCHW: { name: "Charles Schwab Corporation", domain: "schwab.com", color: "#004778", sector: "Financials" },
    SPGI: { name: "S&P Global Inc.", domain: "spglobal.com", color: "#4CAF50", sector: "Financials" },
    COP: { name: "ConocoPhillips", domain: "conocophillips.com", color: "#EB0A1E", sector: "Energy" },
    SLB: { name: "Schlumberger Limited", domain: "slb.com", color: "#00857C", sector: "Energy" },
    EOG: { name: "EOG Resources Inc.", domain: "eogresources.com", color: "#0072BC", sector: "Energy" },
    OXY: { name: "Occidental Petroleum Corporation", domain: "oxy.com", color: "#0072BC", sector: "Energy" },

    // ── 일본 5대상사 (五大商社) 및 주요 기업 ─────────────────────────────
    "8058": { name: "三菱商事 (Mitsubishi Corporation)", domain: "mitsubishicorp.com", color: "#E4002B", sector: "Industrials" },
    "8031": { name: "三井物産 (Mitsui & Co.)", domain: "mitsui.com", color: "#1C3A87", sector: "Industrials" },
    "8053": { name: "住友商事 (Sumitomo Corporation)", domain: "sumitomocorp.com", color: "#9B2743", sector: "Industrials" },
    "8001": { name: "伊藤忠商事 (Itochu Corporation)", domain: "itochu.co.jp", color: "#E60012", sector: "Industrials" },
    "8002": { name: "丸紅 (Marubeni Corporation)", domain: "marubeni.com", color: "#E30613", sector: "Industrials" },
    "7203": { name: "トヨタ自動車 (Toyota Motor)", domain: "toyota.com", color: "#EB0A1E", sector: "Consumer Discretionary" },
    "6758": { name: "ソニーグループ (Sony Group)", domain: "sony.com", color: "#003087", sector: "Technology" },
    "9984": { name: "ソフトバンクグループ (SoftBank Group)", domain: "softbank.jp", color: "#CC0000", sector: "Communication Services" },
    "6861": { name: "キーエンス (Keyence)", domain: "keyence.com", color: "#E30613", sector: "Technology" },
    "6501": { name: "日立製作所 (Hitachi)", domain: "hitachi.com", color: "#E60012", sector: "Industrials" },
    "8306": { name: "三菱UFJフィナンシャル (MUFG)", domain: "mufg.jp", color: "#E60012", sector: "Financials" },
    "8316": { name: "三井住友フィナンシャル (SMFG)", domain: "smfg.co.jp", color: "#E60012", sector: "Financials" },
    "7974": { name: "任天堂 (Nintendo)", domain: "nintendo.com", color: "#E60012", sector: "Communication Services" },
    "9983": { name: "ファーストリテイリング (Fast Retailing)", domain: "fastretailing.com", color: "#E60012", sector: "Consumer Discretionary" },
    "6098": { name: "リクルートホールディングス (Recruit Holdings)", domain: "recruit.co.jp", color: "#00A0E9", sector: "Industrials" },

    // ── 한국 주요 상장사 ───────────────────────────────────────────────
    "005930": { name: "삼성전자", domain: "samsung.com", color: "#1428A0", sector: "Technology" },
    "000660": { name: "SK하이닉스", domain: "skhynix.com", color: "#E31B23", sector: "Technology" },
    "035420": { name: "NAVER", domain: "naver.com", color: "#03C75A", sector: "Technology" },
    "035720": { name: "카카오", domain: "kakao.com", color: "#FFE812", sector: "Technology" },
    "051910": { name: "LG화학", domain: "lgchem.com", color: "#A50034", sector: "Materials" },
    "006400": { name: "삼성SDI", domain: "samsungsdi.com", color: "#1428A0", sector: "Technology" },
    "207940": { name: "삼성바이오로직스", domain: "samsungbiologics.com", color: "#1428A0", sector: "Health Care" },
    "005380": { name: "현대차", domain: "hyundai.com", color: "#002C5F", sector: "Consumer Discretionary" },
    "068270": { name: "셀트리온", domain: "celltrion.com", color: "#00A651", sector: "Health Care" },
    "055550": { name: "신한지주", domain: "shinhan.com", color: "#0046FF", sector: "Financials" },
    "003490": { name: "대한항공", domain: "koreanair.com", color: "#00256C", sector: "Industrials" },
    "036570": { name: "엔씨소프트", domain: "ncsoft.com", color: "#4B9FD5", sector: "Communication Services" },
    "066570": { name: "LG전자", domain: "lg.com", color: "#A50034", sector: "Consumer Discretionary" },
    "017670": { name: "SK텔레콤", domain: "sktelecom.com", color: "#EA0029", sector: "Communication Services" },

    // ── 한국 ETF ───────────────────────────────────────────────────────
    "360200": { name: "KODEX 미국S&P500TR", domain: "samsungfund.com", color: "#FF6B00", sector: "ETF" },
    "379800": { name: "TIGER 미국S&P500", domain: "tigeretf.com", color: "#00A651", sector: "ETF" },
    "133690": { name: "KODEX 미국나스닥100", domain: "samsungfund.com", color: "#0052B5", sector: "ETF" },
    "133730": { name: "TIGER 미국나스닥100", domain: "tigeretf.com", color: "#003366", sector: "ETF" },
    "069500": { name: "KODEX 200", domain: "samsungfund.com", color: "#003DA5", sector: "ETF" },
    "379810": { name: "TIGER 미국S&P500(합성)", domain: "tigeretf.com", color: "#00A651", sector: "ETF" },
    "379790": { name: "KODEX 미국S&P500레버리지", domain: "samsungfund.com", color: "#FF6B00", sector: "ETF" },
    "102110": { name: "TIGER 미국나스닥100레버리지", domain: "tigeretf.com", color: "#003366", sector: "ETF" },
    "371460": { name: "TIGER 미국S&P500", domain: "tigeretf.com", color: "#00A651", sector: "ETF / Index" },

    // ── 계좌/특수 타입 (차트용) ─────────────────────────────────────────
    "미국 직투": { name: "미국 직투", domain: "", color: "#3B82F6", sector: "Account" },
    ISA: { name: "ISA", domain: "", color: "#10B981", sector: "Account" },
    "일본 직투": { name: "일본 직투", domain: "", color: "#F59E0B", sector: "Account" },
    "현금": { name: "현금", domain: "", color: "#6B7280", sector: "Account" },
};

/** 폴백용 기본 테마 컬러 (등록되지 않은 티커용) */
export const FALLBACK_COLORS: readonly string[] = [
    "#8B5CF6", "#10B981", "#4B5563", "#6366F1", "#EC4899",
    "#06B6D4", "#F59E0B", "#EF4444", "#84CC16", "#F97316",
];

/**
 * 티커 브랜드 컬러 반환. 없으면 폴백 배열에서 자동 할당
 */
export function getTickerColor(ticker: string, index: number): string {
    if (!ticker?.trim()) return FALLBACK_COLORS[0];
    const meta = getTickerMetadata(ticker);
    if (meta?.color) return meta.color;
    return FALLBACK_COLORS[Math.abs(index) % FALLBACK_COLORS.length];
}

/**
 * 로고 이미지 요청용 도메인 반환.
 * - 등록된 티커 중 domain이 명시적으로 존재하는 경우에만 반환
 * - domain이 없거나 빈 문자열이면 null → 이니셜 아바타만 표시
 * - 미등록 티커는 추측 도메인을 만들지 않음 (Google 기본 이미지 노출 방지)
 * - 한국/일본 숫자 코드 정규화 지원
 */
export function getTickerDomain(ticker: string): string | null {
    if (!ticker?.trim()) return null;
    const meta = getTickerMetadata(ticker);
    if (meta?.domain && meta.domain.trim() !== "") return meta.domain.trim();
    return null;
}

/**
 * 숫자 종목코드 정규화 (한국 6자리, 일본 4자리)
 * - "5930" → "005930" (한국)
 * - "8058" → "8058" (일본, 4자리 유지)
 */
function normalizeTickerKey(ticker: string): string[] {
    const t = ticker.trim();
    if (!t) return [];
    const keys: string[] = [t, t.toUpperCase()];
    const num = /^\d+$/.test(t) ? parseInt(t, 10) : NaN;
    if (!Number.isNaN(num)) {
        if (t.length <= 5) keys.push(String(num).padStart(6, "0")); // 한국 6자리
        if (t.length >= 5 && t.length <= 6) keys.push(String(num)); // 선행 0 제거
    }
    return [...new Set(keys)];
}

/**
 * 티커 메타데이터 조회 (name, sector 등)
 * 한국/일본 숫자 코드 지원 (포맷 변환 포함)
 */
export function getTickerMetadata(ticker: string): TickerMetadata | null {
    if (!ticker?.trim()) return null;
    const keysToTry = normalizeTickerKey(ticker);
    for (const k of keysToTry) {
        const meta = TICKER_METADATA[k];
        if (meta) return meta;
    }
    return null;
}

/**
 * 표시용 종목명 반환. 메타데이터에 등록된 경우 종목명, 없으면 티커 코드 반환
 * (한국/일본 주식 숫자 코드 → 종목명 변환에 활용)
 */
export function getTickerDisplayName(ticker: string): string {
    const meta = getTickerMetadata(ticker);
    return meta?.name ?? ticker ?? "";
}
