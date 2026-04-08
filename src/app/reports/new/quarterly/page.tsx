"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    validateQuarterlyReportClient,
    getFirstQuarterlyErrorFieldId,
    QF,
} from "@/lib/quarterly-report-client-validation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import {
    createReport,
    getQuarterlyInitialCapitalSectionState,
    type CreateReportPayload,
} from "@/app/actions/reports";
import {
    INITIAL_CAPITAL_ACCOUNT_TYPES,
    type InitialCapitalAccountType,
} from "@/lib/initial-capital";
import { sortPortfolioFormRowsByDisplay } from "@/lib/portfolio-display-order";
import {
    getCurrentProfile,
    getProfileLabel,
    type WorkspaceProfile,
} from "@/lib/profile";
import { TickerSearchInput, type TickerSearchChangeMeta } from "@/components/dashboard/ticker-search-input";
import { getPortfolioItemDisplayLabel } from "@/lib/ticker-metadata";
import { TickerAvatar } from "@/components/dashboard/ticker-avatar";
import { ASSET_ROLE_LABELS } from "@/types/portfolio-strategy";
import type { AccountType, AssetRole } from "@/generated/prisma";

/* ── Constants ──────────────────────────────────────────────────────────── */
type StockAccountType = Exclude<AccountType, "CASH">;
type ValuationCurrency = "USD" | "JPY" | "KRW";

const QUARTERLY_STOCK_ACCOUNT_OPTIONS: { value: StockAccountType; label: string }[] = [
    { value: "US_DIRECT", label: "🇺🇸 미국 직투" },
    { value: "KR_DIRECT", label: "🇰🇷 한국 직투" },
    { value: "JP_DIRECT", label: "🇯🇵 일본 직투" },
    { value: "ISA", label: "ISA" },
    { value: "PENSION", label: "연금저축" },
];

/* ── Sector definitions ──────────────────────────────────────────────────*/
export const SECTORS = [
    "Technology",
    "Financials",
    "Consumer Discretionary",
    "Consumer Staples",
    "Healthcare",
    "Industrials",
    "Energy",
    "Materials",
    "Real Estate",
    "Utilities",
    "Communication Services",
    "ETF / Index",
    "기타",
] as const;

export type Sector = (typeof SECTORS)[number];

/** 티커 → 섹터 자동 매핑 (잘 알려진 종목) */
const TICKER_SECTOR_MAP: Record<string, Sector> = {
    AAPL: "Technology", MSFT: "Technology", GOOGL: "Technology", GOOG: "Technology",
    NVDA: "Technology", AMD: "Technology", INTC: "Technology", QCOM: "Technology",
    TSM: "Technology", ADBE: "Technology", CRM: "Technology", ORCL: "Technology",
    IBM: "Technology", CSCO: "Technology", SNOW: "Technology",
    AMZN: "Consumer Discretionary", TSLA: "Consumer Discretionary",
    NKE: "Consumer Discretionary", MCD: "Consumer Discretionary", SBUX: "Consumer Discretionary",
    ABNB: "Consumer Discretionary", SHOP: "Consumer Discretionary",
    META: "Communication Services", NFLX: "Communication Services",
    SPOT: "Communication Services", SNAP: "Communication Services",
    DIS: "Communication Services", TWTR: "Communication Services",
    JPM: "Financials", GS: "Financials", V: "Financials", MA: "Financials",
    PYPL: "Financials", SQ: "Financials", COIN: "Financials", HOOD: "Financials",
    IREN: "Technology",
    PLTR: "Technology", RBLX: "Communication Services",
    UBER: "Industrials",
    BABA: "Consumer Discretionary", JD: "Consumer Discretionary",
    "7203": "Consumer Discretionary",
    "6758": "Technology",
    "9984": "Technology",
    SPY: "ETF / Index", QQQ: "ETF / Index", VOO: "ETF / Index",
    VTI: "ETF / Index", IWM: "ETF / Index", ARKK: "ETF / Index",
};

function autoDetectSector(ticker: string): Sector | "" {
    const upper = ticker.toUpperCase().trim();
    return TICKER_SECTOR_MAP[upper] ?? "";
}

/* ── Types ──────────────────────────────────────────────────────────────── */
interface PortfolioRow {
    id: string;
    /** 종목·현금 공통 계좌 (DB 현금은 accountType CASH, 통화는 계좌에서 유도) */
    kind: "stock" | "cash";
    ticker: string;
    displayName?: string | null;
    sector: string;
    role: AssetRole;
    stockAccountType?: StockAccountType;
    amount: string;
    logoUrl?: string | null;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatKRW(value: number): string {
    return new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
        maximumFractionDigits: 0,
    }).format(value);
}

function parseNumber(raw: string): number {
    return parseFloat(raw.replace(/[^\d.-]/g, "")) || 0;
}

function valuationCurrencyFromStockAccount(at: StockAccountType): ValuationCurrency {
    if (at === "US_DIRECT") return "USD";
    if (at === "JP_DIRECT") return "JPY";
    return "KRW";
}

function rowValuationCurrency(row: PortfolioRow): ValuationCurrency {
    return valuationCurrencyFromStockAccount(row.stockAccountType ?? "US_DIRECT");
}

function newRow(): PortfolioRow {
    return {
        id: crypto.randomUUID(),
        kind: "stock",
        ticker: "",
        displayName: null,
        sector: "",
        role: "CORE",
        stockAccountType: "US_DIRECT",
        amount: "",
        logoUrl: null,
    };
}

function newCashRow(): PortfolioRow {
    return {
        id: crypto.randomUUID(),
        kind: "cash",
        ticker: "USD",
        displayName: "현금",
        sector: "",
        role: "UNASSIGNED",
        stockAccountType: "US_DIRECT",
        amount: "",
        logoUrl: null,
    };
}

/** 현지 통화 평가액 → 원화 (JPY는 100엔당 KRW 환율 jpyRate 사용) */
function localAmountToKrw(
    localAmount: number,
    currency: ValuationCurrency,
    usdRate: number,
    jpyRate: number,
): number {
    if (localAmount <= 0) return 0;
    switch (currency) {
        case "USD":
            return localAmount * usdRate;
        case "JPY":
            return localAmount * (jpyRate / 100);
        default:
            return localAmount;
    }
}

function rowToKrw(row: PortfolioRow, usdRate: number, jpyRate: number): number {
    return localAmountToKrw(parseNumber(row.amount), rowValuationCurrency(row), usdRate, jpyRate);
}


/* ── Shared style tokens ─────────────────────────────────────────────────*/
const inputCls = [
    "w-full rounded-xl bg-white px-4 py-2.5 text-sm",
    "text-neutral-900 placeholder:text-neutral-300",
    "ring-1 ring-neutral-200/80 outline-none",
    "transition focus:ring-2 focus:ring-neutral-400",
    "dark:bg-neutral-900 dark:text-neutral-100",
    "dark:placeholder:text-neutral-600 dark:ring-neutral-700",
    "dark:focus:ring-neutral-500",
].join(" ");

/* ── Sub-components ──────────────────────────────────────────────────────*/
function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <section className="mb-8">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                {label}
            </p>
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800">
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {children}
                </div>
            </div>
        </section>
    );
}

function FormRow({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="min-w-[160px] shrink-0">
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
                {sublabel && <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{sublabel}</p>}
            </div>
            <div className="flex-1">{children}</div>
        </div>
    );
}

function JournalField({
    id, label, sublabel, placeholder, value, onChange, rows = 6,
    errorMessage, scrollId,
}: {
    id: string; label: string; sublabel: string; placeholder: string;
    value: string; onChange: (v: string) => void; rows?: number;
    errorMessage?: string;
    scrollId?: string;
}) {
    return (
        <div
            id={scrollId}
            className={[
                "overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800",
                errorMessage ? "ring-2 ring-red-500 dark:ring-red-500" : "",
            ].join(" ")}
        >
            <div className="flex items-baseline gap-2 border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
                <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {label}
                </label>
                <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">{sublabel}</span>
            </div>
            <textarea
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className={[
                    "w-full resize-none px-5 py-4 text-sm leading-relaxed",
                    "text-neutral-900 placeholder:text-neutral-300",
                    "bg-transparent outline-none",
                    "dark:text-neutral-100 dark:placeholder:text-neutral-600",
                ].join(" ")}
            />
            {errorMessage ? (
                <p className="border-t border-red-100 px-5 py-2 text-sm text-red-600 dark:border-red-900/40 dark:text-red-400">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}

/* ── Portfolio Row Item ───────────────────────────────────────────────────*/
function PortfolioRowItem({
    row, krwValue, onChange, onDelete,
    tickerError, amountError,
}: {
    row: PortfolioRow;
    krwValue: number;
    onChange: (patch: Partial<Omit<PortfolioRow, "id">>) => void;
    onDelete?: () => void;
    tickerError?: string;
    amountError?: string;
}) {
    if (row.kind === "cash") {
        const cashAt = row.stockAccountType ?? "US_DIRECT";
        const cashVc = rowValuationCurrency(row);
        return (
            <div className="group relative rounded-2xl bg-white ring-1 ring-neutral-200/80 transition hover:ring-neutral-300 dark:bg-neutral-900 dark:ring-neutral-800 dark:hover:ring-neutral-700">
                <div className="space-y-2 px-3 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                        <div className="w-full shrink-0 sm:w-[100px]">
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">계좌</label>
                            <select
                                value={cashAt}
                                onChange={(e) => {
                                    const next = e.target.value as StockAccountType;
                                    const cur = valuationCurrencyFromStockAccount(next);
                                    onChange({ stockAccountType: next, ticker: cur });
                                }}
                                className="w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200/80 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700"
                            >
                                {QUARTERLY_STOCK_ACCOUNT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                {cashVc === "USD" ? "달러(USD)" : cashVc === "JPY" ? "엔(JPY)" : "원화(KRW)"}
                            </p>
                        </div>
                        <div className="min-w-0 flex-1">
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">유형</label>
                            <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800 ring-1 ring-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700">
                                현금 보유
                                <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                                    (해당 계좌 통화 기준)
                                </span>
                            </div>
                            {parseNumber(row.amount) > 0 && krwValue > 0 && (
                                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                    약 {formatKRW(krwValue)}
                                </p>
                            )}
                        </div>
                        <div className="w-full shrink-0 sm:w-[160px]" id={QF.rowAmount(row.id)}>
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">현재 평가액</label>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={row.amount}
                                        onChange={(e) => onChange({ amount: e.target.value })}
                                        placeholder="0"
                                        className={[
                                            "no-spinner w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-right text-sm text-neutral-900 placeholder:text-neutral-300 ring-1 outline-none transition focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600",
                                            amountError
                                                ? "ring-2 ring-red-500 dark:ring-red-500"
                                                : "ring-neutral-200/80 focus:ring-neutral-400 dark:ring-neutral-700",
                                        ].join(" ")}
                                    />
                                    <span className="shrink-0 text-[10px] font-medium text-neutral-400">{cashVc}</span>
                                </div>
                                {amountError ? (
                                    <p className="text-[11px] leading-snug text-red-600 dark:text-red-400">{amountError}</p>
                                ) : null}
                            </div>
                        </div>
                        <div className="flex justify-end sm:justify-start sm:pt-5">
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={!onDelete}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-300 transition hover:bg-red-50 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30 dark:text-neutral-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <p className="border-t border-neutral-100 px-3 py-2 text-[10px] text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
                    현금 행은 섹터·역할 분류 없이 합산만 반영됩니다.
                </p>
            </div>
        );
    }

    const stockAt = row.stockAccountType ?? "US_DIRECT";
    const searchAccountType = stockAt;
    const vc = rowValuationCurrency(row);
    const isaPension = stockAt === "ISA" || stockAt === "PENSION";

    const handleStockAccountChange = (next: StockAccountType) => {
        const patch: Partial<Omit<PortfolioRow, "id">> = { stockAccountType: next };
        if (next === "ISA" || next === "PENSION") {
            patch.sector = "ETF / Index";
            patch.role = "INDEX";
        }
        onChange(patch);
    };

    const handleTickerChange = (ticker: string, meta?: TickerSearchChangeMeta) => {
        const detectedSector = autoDetectSector(ticker);
        if (meta?.source === "select") {
            onChange({
                ticker,
                sector: isaPension ? "ETF / Index" : (detectedSector || row.sector),
                displayName: meta.displayName?.trim() || null,
                ...(isaPension ? { role: "INDEX" as AssetRole } : {}),
            });
        } else {
            const same = ticker.trim().toUpperCase() === row.ticker.trim().toUpperCase();
            onChange({
                ticker,
                sector: isaPension ? "ETF / Index" : (detectedSector || row.sector),
                displayName: same ? row.displayName : null,
                ...(isaPension ? { role: "INDEX" as AssetRole } : {}),
            });
        }
    };

    const tickerPlaceholder =
        vc === "USD"
            ? "AAPL, NVDA, SPY..."
            : vc === "JPY"
              ? "7203, 6758..."
              : "삼성전자, KODEX 200...";

    const displayLabel = row.ticker
        ? getPortfolioItemDisplayLabel({ ticker: row.ticker, displayName: row.displayName })
        : "";

    return (
        <div className="group relative rounded-2xl bg-white ring-1 ring-neutral-200/80 transition hover:ring-neutral-300 dark:bg-neutral-900 dark:ring-neutral-800 dark:hover:ring-neutral-700">
            <div className="space-y-2 px-3 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="w-full shrink-0 sm:w-[100px]">
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">계좌</label>
                        <select
                            value={stockAt}
                            onChange={(e) => handleStockAccountChange(e.target.value as StockAccountType)}
                            className="w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200/80 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700"
                        >
                            {QUARTERLY_STOCK_ACCOUNT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                            {vc === "USD" ? "달러(USD)" : vc === "JPY" ? "엔(JPY)" : "원화(KRW)"}
                        </p>
                    </div>
                    <div className="min-w-0 flex-1" id={QF.rowTicker(row.id)}>
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">종목</label>
                        <div
                            className={
                                tickerError
                                    ? "rounded-xl p-0.5 ring-2 ring-red-500 dark:ring-red-500"
                                    : ""
                            }
                        >
                            <TickerSearchInput
                                value={row.ticker}
                                onChange={handleTickerChange}
                                accountType={searchAccountType}
                                placeholder={tickerPlaceholder}
                            />
                        </div>
                        {tickerError ? (
                            <p className="mt-1 text-[11px] leading-snug text-red-600 dark:text-red-400">{tickerError}</p>
                        ) : null}
                        {row.ticker.trim().length > 0 && (
                            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                <span>{displayLabel}</span>
                                {krwValue > 0 && (
                                    <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                                        (약 {formatKRW(krwValue)})
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                    <div className="w-full shrink-0 sm:w-[160px]" id={QF.rowAmount(row.id)}>
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">현재 평가액</label>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={row.amount}
                                    onChange={(e) => onChange({ amount: e.target.value })}
                                    placeholder="0"
                                    className={[
                                        "no-spinner w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-right text-sm text-neutral-900 placeholder:text-neutral-300 ring-1 outline-none transition focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600",
                                        amountError
                                            ? "ring-2 ring-red-500 dark:ring-red-500"
                                            : "ring-neutral-200/80 focus:ring-neutral-400 dark:ring-neutral-700",
                                    ].join(" ")}
                                />
                                <span className="shrink-0 text-[10px] font-medium text-neutral-400">{vc}</span>
                            </div>
                            {amountError ? (
                                <p className="text-[11px] leading-snug text-red-600 dark:text-red-400">{amountError}</p>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex justify-end sm:justify-start sm:pt-5">
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={!onDelete}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-300 transition hover:bg-red-50 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30 dark:text-neutral-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
                {row.ticker && (
                    <TickerAvatar
                        ticker={row.ticker}
                        displayName={row.displayName}
                        logoUrl={row.logoUrl}
                        size={24}
                        editable
                        onLogoChange={(url) => onChange({ logoUrl: url ?? undefined })}
                    />
                )}
                {isaPension ? (
                    <>
                        <span className="rounded-lg bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200/60 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700">
                            ETF / Index
                        </span>
                        <span className="rounded-lg bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200/60 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700">
                            {ASSET_ROLE_LABELS.INDEX}
                        </span>
                    </>
                ) : (
                    <>
                        <select
                            value={row.sector}
                            onChange={(e) => onChange({ sector: e.target.value })}
                            className="rounded-lg bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200/60 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700"
                        >
                            <option value="">섹터 선택...</option>
                            {SECTORS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <select
                            value={row.role}
                            onChange={(e) => onChange({ role: e.target.value as AssetRole })}
                            className="rounded-lg bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200/60 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700"
                        >
                            {(Object.keys(ASSET_ROLE_LABELS) as AssetRole[]).map((role) => (
                                <option key={role} value={role}>{ASSET_ROLE_LABELS[role]}</option>
                            ))}
                        </select>
                    </>
                )}
                {row.sector && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {row.sector}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   Quarterly Report Page
══════════════════════════════════════════════════════════════════════════ */
export default function NewQuarterlyReportPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<WorkspaceProfile>("alpha-ceo");
    const [mounted, setMounted] = useState(false);
    const [year, setYear] = useState("");
    const [quarter, setQuarter] = useState("");
    const [usdKrw, setUsdKrw] = useState("");
    const [jpyKrw, setJpyKrw] = useState("");
    const [rows, setRows] = useState<PortfolioRow[]>([newRow()]);
    const [earningsReview, setEarningsReview] = useState("");
    const [strategy, setStrategy] = useState("");
    const [summary, setSummary] = useState("");
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialCapitalByAccount, setInitialCapitalByAccount] = useState<
        Partial<Record<InitialCapitalAccountType, number>>
    >({});
    const [showInitialCapitalSection, setShowInitialCapitalSection] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const clearFieldError = useCallback((key: string) => {
        setFieldErrors((prev) => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    useEffect(() => {
        setMounted(true);
        setProfile(getCurrentProfile());
        // Set default year and quarter to current date
        const now = new Date();
        setYear(String(now.getFullYear()));
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        setQuarter(String(currentQuarter));
    }, []);

    useEffect(() => {
        if (!mounted) return;
        let cancelled = false;
        getQuarterlyInitialCapitalSectionState(getProfileLabel(profile)).then((s) => {
            if (!cancelled) setShowInitialCapitalSection(s.showInitialCapitalSection);
        });
        return () => {
            cancelled = true;
        };
    }, [mounted, profile]);

    const addRow = useCallback(() => setRows((prev) => [...prev, newRow()]), []);
    const addCashRow = useCallback(() => setRows((prev) => [...prev, newCashRow()]), []);
    const removeRow = useCallback((id: string) => setRows((prev) => prev.filter((r) => r.id !== id)), []);
    const updateRow = useCallback((id: string, patch: Partial<Omit<PortfolioRow, "id">>) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }, []);

    const usdRate = parseNumber(usdKrw);
    const jpyRate = parseNumber(jpyKrw);

    const rowKRWs = useMemo(() => rows.map((r) => rowToKrw(r, usdRate, jpyRate)), [rows, usdRate, jpyRate]);
    const displayRows = useMemo(
        () => sortPortfolioFormRowsByDisplay(rows, (r) => rowToKrw(r, usdRate, jpyRate)),
        [rows, usdRate, jpyRate],
    );
    const totalValuation = useMemo(() => rowKRWs.reduce((acc, v) => acc + v, 0), [rowKRWs]);

    const buildQuarterlyPayload = (asDraft: boolean, yearNum: number, quarterNum: number, validRows: PortfolioRow[]): CreateReportPayload => ({
        type: "QUARTERLY",
        profile: getProfileLabel(profile),
        status: asDraft ? "DRAFT" : "PUBLISHED",
        periodLabel: `${yearNum}-Q${quarterNum}`,
        usdRate,
        jpyRate,
        totalInvestedKrw: null,
        totalCurrentKrw: totalValuation,
        summary,
        journal: feedback,
        strategy,
        earningsReview,
        initialCapitalByAccount: showInitialCapitalSection ? initialCapitalByAccount : undefined,
        portfolioItems: validRows.map((r) => {
            const krw = rowToKrw(r, usdRate, jpyRate);
            if (r.kind === "cash") {
                const cashCur = valuationCurrencyFromStockAccount(r.stockAccountType ?? "US_DIRECT");
                return {
                    ticker: cashCur,
                    displayName: r.displayName?.trim() || "현금",
                    sector: undefined,
                    role: "UNASSIGNED",
                    accountType: "CASH" as const,
                    originalCurrency: cashCur,
                    originalAmount: parseNumber(r.amount),
                    krwAmount: krw,
                    logoUrl: null,
                };
            }
            const at = r.stockAccountType ?? "US_DIRECT";
            const oc = rowValuationCurrency(r);
            return {
                ticker: r.ticker.trim(),
                displayName: r.displayName?.trim() || null,
                sector: r.sector || undefined,
                role: r.role ?? "CORE",
                accountType: at,
                originalCurrency: oc,
                originalAmount: parseNumber(r.amount),
                krwAmount: krw,
                logoUrl: r.logoUrl?.trim() || null,
            };
        }),
        newInvestments: [],
    });

    const handleSubmit = async (asDraft: boolean) => {
        const orderedRows = sortPortfolioFormRowsByDisplay(rows, (r) => rowToKrw(r, usdRate, jpyRate));
        const rowIdsOrder = orderedRows.map((r) => r.id);

        const clientErrors = validateQuarterlyReportClient({
            status: asDraft ? "DRAFT" : "PUBLISHED",
            period: { yearRaw: year, quarterRaw: quarter },
            usdKrwRaw: usdKrw,
            jpyKrwRaw: jpyKrw,
            usdRate,
            jpyRate,
            rows: rows.map((r) => ({
                id: r.id,
                kind: r.kind,
                ticker: r.ticker,
                amount: r.amount,
            })),
            parseAmount: parseNumber,
            newInvestments: [],
            summary,
            journal: feedback,
            strategy,
            earningsReview,
        });

        if (Object.keys(clientErrors).length > 0) {
            setFieldErrors(clientErrors);
            const firstId = getFirstQuarterlyErrorFieldId(clientErrors, rowIdsOrder, []);
            queueMicrotask(() => {
                document.getElementById(firstId ?? "")?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            });
            return;
        }
        setFieldErrors({});

        const yearNum = parseInt(year.trim(), 10);
        const quarterNum = parseInt(quarter.trim(), 10);
        const validRows = rows.filter((r) => {
            const amt = parseNumber(r.amount);
            if (r.kind === "cash") return amt > 0;
            return r.ticker.trim().length > 0 && amt > 0;
        });

        const payload = buildQuarterlyPayload(asDraft, yearNum, quarterNum, validRows);

        if (asDraft) {
            setIsSubmitting(true);
            try {
                await createReport(payload);
                toast.success("임시 저장되었습니다.");
                router.push("/quarterly");
            } catch (err) {
                console.error("[분기별 리포트 저장 오류]", err);
                toast.error(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        setIsSubmitting(true);
        try {
            await createReport(payload);
            toast.success("분기별 리포트가 저장되었습니다.");
            router.push("/");
        } catch (err) {
            console.error("[분기별 리포트 저장 오류]", err);
            toast.error(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
            {/* Header */}
            <div className="mb-10 space-y-6">
                {/* Top bar: Type selector */}
                <div className="flex items-center justify-end">
                    <div className="inline-flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                        <Link
                            href="/reports/new"
                            className="rounded-md px-4 py-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                            월별
                        </Link>
                        <Link
                            href="/reports/new/quarterly"
                            className="rounded-md px-4 py-1.5 text-sm font-medium text-neutral-900 transition dark:text-neutral-100 bg-white shadow-sm dark:bg-neutral-900"
                        >
                            분기별
                        </Link>
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                        분기별 리포트 작성
                    </h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        분기 실적과 펀더멘털을 깊게 점검하고 다음 전략을 수립하세요.
                    </p>
                </div>
                <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        {getProfileLabel(profile)}
                    </span>
                </div>
            </div>

            {/* 적용 환율 (최상단) */}
            <FormSection label="적용 환율">
                <FormRow label="1 USD =" sublabel="달러/원 환율">
                    <div id={QF.usd} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={usdKrw}
                                onChange={(e) => {
                                    setUsdKrw(e.target.value);
                                    clearFieldError(QF.usd);
                                }}
                                placeholder="예: 1380"
                                className={[
                                    inputCls,
                                    fieldErrors[QF.usd] ? "ring-2 ring-red-500 dark:ring-red-500" : "",
                                ].join(" ")}
                            />
                            <span className="shrink-0 text-sm text-neutral-400">KRW</span>
                        </div>
                        {fieldErrors[QF.usd] ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors[QF.usd]}</p>
                        ) : null}
                    </div>
                </FormRow>
                <FormRow label="100 JPY =" sublabel="엔/원 환율 (100엔 기준)">
                    <div id={QF.jpy} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={jpyKrw}
                                onChange={(e) => {
                                    setJpyKrw(e.target.value);
                                    clearFieldError(QF.jpy);
                                }}
                                placeholder="예: 920"
                                className={[
                                    inputCls,
                                    fieldErrors[QF.jpy] ? "ring-2 ring-red-500 dark:ring-red-500" : "",
                                ].join(" ")}
                            />
                            <span className="shrink-0 text-sm text-neutral-400">KRW</span>
                        </div>
                        {fieldErrors[QF.jpy] ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors[QF.jpy]}</p>
                        ) : null}
                    </div>
                </FormRow>
            </FormSection>

            {/* 기본 정보 */}
            <FormSection label="기본 정보">
                <FormRow label="연도 · 분기" sublabel="연도와 분기를 선택하세요">
                    <div className="flex flex-wrap items-start gap-3">
                        <div id={QF.year} className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={year}
                                    onChange={(e) => {
                                        setYear(e.target.value);
                                        clearFieldError(QF.year);
                                    }}
                                    placeholder="2026"
                                    min="2000"
                                    max="2100"
                                    className={[
                                        inputCls,
                                        fieldErrors[QF.year] ? "ring-2 ring-red-500 dark:ring-red-500" : "",
                                    ].join(" ")}
                                    style={{ width: "120px" }}
                                />
                                <span className="text-sm text-neutral-400">년</span>
                            </div>
                            {fieldErrors[QF.year] ? (
                                <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors[QF.year]}</p>
                            ) : null}
                        </div>
                        <div id={QF.quarter} className="flex flex-col gap-1">
                            <select
                                value={quarter}
                                onChange={(e) => {
                                    setQuarter(e.target.value);
                                    clearFieldError(QF.quarter);
                                }}
                                className={[
                                    inputCls,
                                    fieldErrors[QF.quarter] ? "ring-2 ring-red-500 dark:ring-red-500" : "",
                                ].join(" ")}
                                style={{ width: "140px" }}
                            >
                                <option value="">분기 선택</option>
                                {[1, 2, 3, 4].map((q) => (
                                    <option key={q} value={String(q)}>
                                        Q{q}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors[QF.quarter] ? (
                                <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors[QF.quarter]}</p>
                            ) : null}
                        </div>
                    </div>
                </FormRow>
            </FormSection>

            {showInitialCapitalSection && (
                <FormSection label="계좌별 초기 원금">
                    <p className="px-6 pb-2 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                        첫 분기 리포트이거나 아직 초기 원금이 기록되지 않은 경우에만 표시됩니다. 계좌 유형별 원화 기준 초기 투입 원금을 입력하세요. (미입력 시 0으로 저장)
                    </p>
                    {INITIAL_CAPITAL_ACCOUNT_TYPES.map((at) => {
                        const label =
                            QUARTERLY_STOCK_ACCOUNT_OPTIONS.find((o) => o.value === at)?.label ?? at;
                        return (
                            <FormRow key={at} label={label} sublabel="원화 (KRW)">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={
                                            initialCapitalByAccount[at] !== undefined
                                                ? String(initialCapitalByAccount[at])
                                                : ""
                                        }
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^\d]/g, "");
                                            setInitialCapitalByAccount((prev) => {
                                                const next = { ...prev };
                                                if (raw === "") delete next[at];
                                                else next[at] = parseInt(raw, 10) || 0;
                                                return next;
                                            });
                                        }}
                                        placeholder="0"
                                        className={inputCls}
                                    />
                                    <span className="shrink-0 text-sm text-neutral-400">KRW</span>
                                </div>
                            </FormRow>
                        );
                    })}
                </FormSection>
            )}

            {/* 포트폴리오 스냅샷 */}
            <section id={QF.portfolio} className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                            포트폴리오 스냅샷
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                            종목 행은 티커·평가액을, 현금 행은 계좌·금액만 입력하세요. 통화는 계좌에 맞게 적용되며 원화 환산은 상단 환율로 자동 계산됩니다.
                        </p>
                        {fieldErrors[QF.portfolio] ? (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{fieldErrors[QF.portfolio]}</p>
                        ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                            type="button"
                            onClick={addRow}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                        >
                            <span className="text-base leading-none">+</span>
                            종목 추가
                        </button>
                        <button
                            type="button"
                            onClick={addCashRow}
                            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                        >
                            <span className="text-base leading-none">+</span>
                            현금 추가
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {displayRows.map((row) => (
                        <PortfolioRowItem
                            key={row.id}
                            row={row}
                            krwValue={rowToKrw(row, usdRate, jpyRate)}
                            onChange={(patch) => {
                                updateRow(row.id, patch);
                                clearFieldError(QF.rowTicker(row.id));
                                clearFieldError(QF.rowAmount(row.id));
                                clearFieldError(QF.portfolio);
                            }}
                            onDelete={rows.length > 1 ? () => removeRow(row.id) : undefined}
                            tickerError={fieldErrors[QF.rowTicker(row.id)]}
                            amountError={fieldErrors[QF.rowAmount(row.id)]}
                        />
                    ))}
                </div>

                {/* Total bar */}
                <div className="mt-4 overflow-hidden rounded-2xl bg-neutral-900 px-6 py-5 dark:bg-neutral-100">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                            총 평가금액
                        </span>
                        <span className="text-right text-xl font-bold tracking-tight text-white dark:text-neutral-900">
                            {totalValuation > 0
                                ? formatKRW(totalValuation)
                                : <span className="text-neutral-500 dark:text-neutral-400 text-sm font-normal">종목을 입력하면 자동 계산됩니다</span>
                            }
                        </span>
                    </div>
                    {totalValuation > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {displayRows.map((r) => {
                                const v = rowToKrw(r, usdRate, jpyRate);
                                if (v <= 0) return null;
                                return (
                                    <span
                                        key={r.id}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-neutral-300 dark:bg-black/10 dark:text-neutral-600"
                                    >
                                        {r.kind === "cash"
                                            ? `현금 · ${QUARTERLY_STOCK_ACCOUNT_OPTIONS.find((o) => o.value === (r.stockAccountType ?? "US_DIRECT"))?.label ?? "현금"}`
                                            : getPortfolioItemDisplayLabel({
                                                ticker: r.ticker,
                                                displayName: r.displayName,
                                            })}
                                        {r.sector && <span className="opacity-60">· {r.sector}</span>}
                                        <span className="opacity-50">·</span>
                                        {formatKRW(v)}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Section 4: 회고록 */}
            <section className="mb-10">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    분기 리뷰
                </p>
                <div className="space-y-4">
                    <JournalField
                        id="journal-earnings"
                        scrollId={QF.earningsReview}
                        label="어닝 / 실적 리뷰"
                        sublabel="Earnings Review"
                        placeholder="이번 분기 보유 종목들의 실적 발표 내용을 요약하고 코멘트를 남기세요. (예: NVDA — 매출 YoY +122%, 데이터센터 부문 강세. 가이던스 상향...)"
                        value={earningsReview}
                        onChange={(v) => {
                            setEarningsReview(v);
                            clearFieldError(QF.earningsReview);
                        }}
                        rows={8}
                        errorMessage={fieldErrors[QF.earningsReview]}
                    />
                    <JournalField
                        id="journal-summary"
                        scrollId={QF.summary}
                        label="분기 시장 요약"
                        sublabel="Market Summary"
                        placeholder="이번 분기 거시 경제 흐름, 금리/환율 변화, 주요 이벤트 등을 기록하세요."
                        value={summary}
                        onChange={(v) => {
                            setSummary(v);
                            clearFieldError(QF.summary);
                        }}
                        rows={6}
                        errorMessage={fieldErrors[QF.summary]}
                    />
                    <JournalField
                        id="journal-feedback"
                        scrollId={QF.journal}
                        label="느낀 점"
                        sublabel="Feedback"
                        placeholder="이번 분기 투자를 통해 배운 점, 아쉬웠던 점, 감정적으로 느낀 것들을 솔직하게 적어보세요."
                        value={feedback}
                        onChange={(v) => {
                            setFeedback(v);
                            clearFieldError(QF.journal);
                        }}
                        rows={6}
                        errorMessage={fieldErrors[QF.journal]}
                    />
                    <JournalField
                        id="journal-strategy"
                        scrollId={QF.strategy}
                        label="다음 분기 전략"
                        sublabel="Next Quarter Strategy"
                        placeholder="다음 분기 신규 투자금 투입 계획, 리밸런싱 방향, 주목할 종목 및 섹터 등을 작성하세요."
                        value={strategy}
                        onChange={(v) => {
                            setStrategy(v);
                            clearFieldError(QF.strategy);
                        }}
                        rows={6}
                        errorMessage={fieldErrors[QF.strategy]}
                    />
                </div>
            </section>

            {/* 저장 버튼 */}
            <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:justify-end md:pb-16">
                <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                    className={[
                        "relative inline-flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 sm:w-auto",
                        "text-sm font-semibold tracking-tight ring-1 ring-neutral-200 shadow-sm",
                        "transition-all duration-200",
                        isSubmitting
                            ? "cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                            : "bg-white text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:bg-neutral-800",
                    ].join(" ")}
                >
                    임시저장
                </button>
                <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting}
                    className={[
                        "relative inline-flex w-full items-center justify-center gap-2.5 rounded-2xl px-8 py-3.5 sm:w-auto",
                        "text-sm font-semibold tracking-tight text-white shadow-lg",
                        "transition-all duration-200",
                        isSubmitting
                            ? "bg-neutral-400 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-400",
                    ].join(" ")}
                >
                    {isSubmitting ? (
                        <>
                            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            저장 중...
                        </>
                    ) : (
                        <>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            작성 완료
                        </>
                    )}
                </button>
            </div>

        </div>
    );
}
