import { NextRequest, NextResponse } from "next/server";

export const revalidate = 60;

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: "stock" | "etf";
  region: "US" | "KR" | "JP";
  currency: "USD" | "KRW" | "JPY";
  domain?: string;
}

function getExchangeFilter(accountType: string | null): string[] | null {
  switch (accountType) {
    case "US_DIRECT":
      return ["NYSE", "NASDAQ", "AMEX", "NMS", "NGM", "NCM"];
    case "ISA":
    case "KR_DIRECT":
    case "PENSION":
      return ["KSC", "KOE", "KOSDAQ", "KOS"];
    case "JP_DIRECT":
      return ["JPX", "OSA", "TYO"];
    default:
      return null;
  }
}

function getRegionFromSymbol(symbol: string): "US" | "KR" | "JP" {
  if (symbol.endsWith(".KS") || symbol.endsWith(".KQ")) return "KR";
  if (symbol.endsWith(".T")) return "JP";
  return "US";
}

function getRegionFromExchange(exchange: string): "US" | "KR" | "JP" {
  const ex = exchange?.toUpperCase() || "";
  if (["KSC", "KOE", "KOSDAQ", "KOS"].some((k) => ex.includes(k))) return "KR";
  if (["JPX", "OSA", "TYO"].some((k) => ex.includes(k))) return "JP";
  return "US";
}

function getCurrencyFromRegion(
  region: "US" | "KR" | "JP",
): "USD" | "KRW" | "JPY" {
  switch (region) {
    case "KR":
      return "KRW";
    case "JP":
      return "JPY";
    default:
      return "USD";
  }
}

function normalizeCurrency(
  raw: string | undefined,
  region: "US" | "KR" | "JP",
): "USD" | "KRW" | "JPY" {
  const u = raw?.toUpperCase();
  if (u === "KRW" || u === "JPY" || u === "USD") return u;
  return getCurrencyFromRegion(region);
}

async function searchYahooFinance(
  query: string,
  exchangeFilter: string[] | null,
): Promise<TickerSearchResult[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=10&newsCount=0&enableFuzzyQuery=false`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

  const data = (await res.json()) as {
    quotes?: Array<{
      symbol?: string;
      shortname?: string;
      longname?: string;
      exchange?: string;
      exchDisp?: string;
      quoteType?: string;
      currency?: string;
    }>;
  };
  const quotes = data?.quotes ?? [];

  return quotes
    .filter((q) => {
      if (!q.symbol || (!q.shortname && !q.longname)) return false;
      if (exchangeFilter) {
        return exchangeFilter.some(
          (ex) =>
            (q.exchange?.toUpperCase() ?? "").includes(ex) ||
            (q.exchDisp?.toUpperCase() ?? "").includes(ex),
        );
      }
      return true;
    })
    .map((q) => {
      const region = getRegionFromSymbol(q.symbol!);
      return {
        symbol: q.symbol!.replace(/\.(KS|KQ|T)$/i, ""),
        name: q.shortname || q.longname || q.symbol!,
        exchange: q.exchDisp || q.exchange || "",
        type:
          q.quoteType?.toLowerCase() === "etf" ? ("etf" as const) : ("stock" as const),
        region,
        currency: normalizeCurrency(q.currency, region),
      };
    })
    .slice(0, 10);
}

async function searchFMP(
  query: string,
  exchangeFilter: string[] | null,
): Promise<TickerSearchResult[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=10&apikey=${apiKey}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);

  const data = (await res.json()) as unknown;

  return (Array.isArray(data) ? data : [])
    .filter((item: { exchangeShortName?: string }) => {
      if (!exchangeFilter) return true;
      const ex = item.exchangeShortName?.toUpperCase() ?? "";
      return exchangeFilter.some((token) => ex.includes(token));
    })
    .map(
      (item: {
        symbol: string;
        name: string;
        exchangeShortName?: string;
        type?: string;
        currency?: string;
      }) => {
        const region = getRegionFromExchange(item.exchangeShortName || "");
        return {
          symbol: item.symbol.replace(/\.(KS|KQ)$/i, ""),
          name: item.name,
          exchange: item.exchangeShortName || "",
          type:
            item.type?.toLowerCase() === "etf"
              ? ("etf" as const)
              : ("stock" as const),
          region,
          currency: normalizeCurrency(item.currency, region),
        };
      },
    )
    .slice(0, 10);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const accountType = request.nextUrl.searchParams.get("account") || null;

  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const exchangeFilter = getExchangeFilter(accountType);

  let results: TickerSearchResult[] = [];

  try {
    results = await searchYahooFinance(query, exchangeFilter);
  } catch (e) {
    console.warn("Yahoo Finance 검색 실패, FMP로 폴백:", e);
  }

  if (results.length === 0) {
    try {
      results = await searchFMP(query, exchangeFilter);
    } catch (e) {
      console.warn("FMP 검색도 실패:", e);
    }
  }

  return NextResponse.json({ results });
}
