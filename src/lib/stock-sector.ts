import { getTickerMetadata } from "@/lib/ticker-metadata";

/** Holding 모델에는 sector 없음 — ticker-metadata(GICS) + ETF 휴리스틱 */
const TICKER_SECTOR_OVERRIDES: Record<string, string> = {
  "0015B0": "ETF",
  "0015b0": "ETF",
  "360750": "ETF",
};

const DEFAULT_SECTOR = "Other";

function normalizeSectorLabel(sector: string): string {
  const s = sector.trim();
  if (!s) return DEFAULT_SECTOR;
  if (s === "ETF / Index") return "ETF";
  return s;
}

function sectorFromDisplayName(name: string): string | null {
  const n = name.toUpperCase();
  if (
    n.includes("TIGER") ||
    n.includes("KODEX") ||
    n.includes("ETF") ||
    n.includes("S&P") ||
    n.includes("NASDAQ") ||
    n.includes("나스닥") ||
    n.includes("SP500") ||
    n.includes("S&P500")
  ) {
    return "ETF";
  }
  return null;
}

/** 티커(및 선택적 표시명) → 대시보드 섹터 라벨 */
export function resolveStockSector(ticker: string, displayName?: string): string {
  const t = ticker.trim();
  if (!t && displayName) {
    return sectorFromDisplayName(displayName) ?? DEFAULT_SECTOR;
  }

  for (const k of [t, t.toUpperCase()]) {
    const override = TICKER_SECTOR_OVERRIDES[k];
    if (override) return override;
  }

  const meta = getTickerMetadata(t);
  if (meta?.sector) return normalizeSectorLabel(meta.sector);

  if (displayName) {
    const fromName = sectorFromDisplayName(displayName);
    if (fromName) return fromName;
  }

  return DEFAULT_SECTOR;
}

export interface SectorWeightSegment {
  name: string;
  weight: number;
}

/** 종목별 비중 세그먼트를 섹터 단위로 합산 (비중 데이터 변경 없음 — UI 그룹핑만) */
export function aggregateSegmentsBySector(
  segments: readonly { name: string; weight: number; ticker?: string }[],
): SectorWeightSegment[] {
  const bySector = new Map<string, number>();
  for (const s of segments) {
    if (s.weight <= 0) continue;
    const sector = resolveStockSector(s.ticker ?? s.name, s.name);
    bySector.set(sector, (bySector.get(sector) ?? 0) + s.weight);
  }
  return [...bySector.entries()]
    .map(([name, weight]) => ({ name, weight }))
    .sort((a, b) => b.weight - a.weight);
}
