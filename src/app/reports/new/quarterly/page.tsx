"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import {
    createReport,
    type CreateReportPayload,
} from "@/app/actions/reports";
import { computeGainKrw, computeReturnRatePercent } from "@/lib/report-performance";
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
import type { AssetRole } from "@/generated/prisma";

/* ── Constants ──────────────────────────────────────────────────────────── */
type AccountType = "US_DIRECT" | "ISA" | "JP_DIRECT" | "CASH";
/** 포트폴리오 행별 평가 통화 (사용자 선택) */
type ValuationCurrency = "USD" | "JPY" | "KRW";

const VALUATION_CURRENCY_LABELS: Record<ValuationCurrency, string> = {
    USD: "USD",
    JPY: "JPY",
    KRW: "KRW",
};

function accountTypeFromValuationCurrency(c: ValuationCurrency): Exclude<AccountType, "CASH"> {
    switch (c) {
        case "USD":
            return "US_DIRECT";
        case "JPY":
            return "JP_DIRECT";
        default:
            return "ISA";
    }
}

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
    /** 종목 행 vs 통화별 현금 행 (DB: accountType CASH) */
    kind: "stock" | "cash";
    ticker: string;
    displayName?: string | null;
    sector: string;
    role: AssetRole;
    /** 현지 통화 평가액에 적용할 통화 */
    valuationCurrency: ValuationCurrency;
    /** 현지 통화 기준 평가액 */
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

function newRow(): PortfolioRow {
    return {
        id: crypto.randomUUID(),
        kind: "stock",
        ticker: "",
        displayName: null,
        sector: "",
        role: "CORE",
        valuationCurrency: "USD",
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
        valuationCurrency: "USD",
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
    return localAmountToKrw(parseNumber(row.amount), row.valuationCurrency, usdRate, jpyRate);
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
}: {
    id: string; label: string; sublabel: string; placeholder: string;
    value: string; onChange: (v: string) => void; rows?: number;
}) {
    return (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800">
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
        </div>
    );
}

/* ── Portfolio Row Item ───────────────────────────────────────────────────*/
function PortfolioRowItem({
    row, krwValue, onChange, onDelete,
}: {
    row: PortfolioRow;
    krwValue: number;
    onChange: (patch: Partial<Omit<PortfolioRow, "id">>) => void;
    onDelete?: () => void;
}) {
    if (row.kind === "cash") {
        return (
            <div className="group relative rounded-2xl bg-white ring-1 ring-neutral-200/80 transition hover:ring-neutral-300 dark:bg-neutral-900 dark:ring-neutral-800 dark:hover:ring-neutral-700">
                <div className="space-y-2 px-3 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                        <div className="w-full shrink-0 sm:w-[100px]">
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">통화</label>
                            <select
                                value={row.valuationCurrency}
                                onChange={(e) => {
                                    const v = e.target.value as ValuationCurrency;
                                    onChange({ valuationCurrency: v, ticker: v });
                                }}
                                className="w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200/80 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700"
                            >
                                {(Object.keys(VALUATION_CURRENCY_LABELS) as ValuationCurrency[]).map((k) => (
                                    <option key={k} value={k}>{VALUATION_CURRENCY_LABELS[k]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="min-w-0 flex-1">
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">유형</label>
                            <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800 ring-1 ring-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700">
                                현금 보유
                                <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                                    (해당 통화 기준)
                                </span>
                            </div>
                            {parseNumber(row.amount) > 0 && krwValue > 0 && (
                                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                    약 {formatKRW(krwValue)}
                                </p>
                            )}
                        </div>
                        <div className="w-full shrink-0 sm:w-[160px]">
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">현재 평가액</label>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={row.amount}
                                    onChange={(e) => onChange({ amount: e.target.value })}
                                    placeholder="0"
                                    className="no-spinner w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-right text-sm text-neutral-900 placeholder:text-neutral-300 ring-1 ring-neutral-200/80 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:ring-neutral-700"
                                />
                                <span className="shrink-0 text-[10px] font-medium text-neutral-400">{row.valuationCurrency}</span>
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

    const searchAccountType = accountTypeFromValuationCurrency(row.valuationCurrency);

    const handleTickerChange = (ticker: string, meta?: TickerSearchChangeMeta) => {
        const detectedSector = autoDetectSector(ticker);
        if (meta?.source === "select") {
            onChange({
                ticker,
                sector: detectedSector || row.sector,
                displayName: meta.displayName?.trim() || null,
            });
        } else {
            const same = ticker.trim().toUpperCase() === row.ticker.trim().toUpperCase();
            onChange({
                ticker,
                sector: detectedSector || row.sector,
                displayName: same ? row.displayName : null,
            });
        }
    };

    const tickerPlaceholder =
        row.valuationCurrency === "USD"
            ? "AAPL, NVDA, SPY..."
            : row.valuationCurrency === "JPY"
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
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">통화</label>
                        <select
                            value={row.valuationCurrency}
                            onChange={(e) => onChange({ valuationCurrency: e.target.value as ValuationCurrency })}
                            className="w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200/80 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700"
                        >
                            {(Object.keys(VALUATION_CURRENCY_LABELS) as ValuationCurrency[]).map((k) => (
                                <option key={k} value={k}>{VALUATION_CURRENCY_LABELS[k]}</option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">종목</label>
                        <TickerSearchInput
                            value={row.ticker}
                            onChange={handleTickerChange}
                            accountType={searchAccountType}
                            placeholder={tickerPlaceholder}
                        />
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
                    <div className="w-full shrink-0 sm:w-[160px]">
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-neutral-400">현재 평가액</label>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={row.amount}
                                onChange={(e) => onChange({ amount: e.target.value })}
                                placeholder="0"
                                className="no-spinner w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-right text-sm text-neutral-900 placeholder:text-neutral-300 ring-1 ring-neutral-200/80 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:ring-neutral-700"
                            />
                            <span className="shrink-0 text-[10px] font-medium text-neutral-400">{row.valuationCurrency}</span>
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

    useEffect(() => {
        setMounted(true);
        setProfile(getCurrentProfile());
        // Set default year and quarter to current date
        const now = new Date();
        setYear(String(now.getFullYear()));
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        setQuarter(String(currentQuarter));
    }, []);

    const [year, setYear] = useState("");
    const [quarter, setQuarter] = useState("");
    const [usdKrw, setUsdKrw] = useState("");
    const [jpyKrw, setJpyKrw] = useState("");
    /** 총 투자금(원금) — 수동 입력 */
    const [principalInput, setPrincipalInput] = useState("");
    const [rows, setRows] = useState<PortfolioRow[]>([newRow()]);
    const [earningsReview, setEarningsReview] = useState("");
    const [strategy, setStrategy] = useState("");
    const [summary, setSummary] = useState("");
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    const principal = parseNumber(principalInput);

    const profit =
        principal > 0 && totalValuation >= 0 ? computeGainKrw(totalValuation, principal) : null;
    const profitRate =
        principal > 0 ? computeReturnRatePercent(totalValuation, principal) : null;
    const isPositive = profit !== null ? profit >= 0 : true;

    const buildQuarterlyPayload = (asDraft: boolean, yearNum: number, quarterNum: number, validRows: PortfolioRow[]): CreateReportPayload => ({
        type: "QUARTERLY",
        profile: getProfileLabel(profile),
        status: asDraft ? "DRAFT" : "PUBLISHED",
        periodLabel: `${yearNum}-Q${quarterNum}`,
        usdRate,
        jpyRate,
        totalInvestedKrw: Math.round(Math.max(0, parseNumber(principalInput))),
        totalCurrentKrw: totalValuation,
        summary,
        journal: feedback,
        strategy,
        earningsReview,
        portfolioItems: validRows.map((r) => {
            const krw = rowToKrw(r, usdRate, jpyRate);
            if (r.kind === "cash") {
                return {
                    ticker: r.valuationCurrency,
                    displayName: r.displayName?.trim() || "현금",
                    sector: undefined,
                    role: "UNASSIGNED",
                    accountType: "CASH" as const,
                    originalCurrency: r.valuationCurrency,
                    originalAmount: parseNumber(r.amount),
                    krwAmount: krw,
                    logoUrl: null,
                };
            }
            const at = accountTypeFromValuationCurrency(r.valuationCurrency);
            return {
                ticker: r.ticker.trim(),
                displayName: r.displayName?.trim() || null,
                sector: r.sector || undefined,
                role: r.role ?? "CORE",
                accountType: at,
                originalCurrency: r.valuationCurrency,
                originalAmount: parseNumber(r.amount),
                krwAmount: krw,
                logoUrl: r.logoUrl?.trim() || null,
            };
        }),
        newInvestments: [],
    });

    const handleSubmit = async (asDraft: boolean) => {
        if (!year.trim() || !quarter.trim()) {
            toast.error("연도와 분기를 모두 선택해주세요.");
            return;
        }
        const yearNum = parseInt(year.trim(), 10);
        const quarterNum = parseInt(quarter.trim(), 10);
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            toast.error("올바른 연도를 입력해주세요.");
            return;
        }
        if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
            toast.error("올바른 분기를 선택해주세요.");
            return;
        }
        const incompletePortfolio = rows.filter((r) => {
            if (r.kind === "cash") return false;
            const hasTicker = r.ticker.trim().length > 0;
            const hasAmount = parseNumber(r.amount) > 0;
            return (hasTicker && !hasAmount) || (!hasTicker && hasAmount);
        });
        if (incompletePortfolio.length > 0) {
            toast.error("종목명과 평가액을 모두 입력해 주세요. 비어 있는 행은 삭제해 주세요.");
            return;
        }
        const validRows = rows.filter((r) => {
            const amt = parseNumber(r.amount);
            if (r.kind === "cash") return amt > 0;
            return r.ticker.trim().length > 0 && amt > 0;
        });
        if (validRows.length === 0) {
            toast.error("포트폴리오 스냅샷에 최소 1개 이상의 항목을 입력해주세요.");
            return;
        }

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
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={usdKrw}
                            onChange={(e) => setUsdKrw(e.target.value)}
                            placeholder="예: 1380"
                            className={inputCls}
                        />
                        <span className="shrink-0 text-sm text-neutral-400">KRW</span>
                    </div>
                </FormRow>
                <FormRow label="100 JPY =" sublabel="엔/원 환율 (100엔 기준)">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={jpyKrw}
                            onChange={(e) => setJpyKrw(e.target.value)}
                            placeholder="예: 920"
                            className={inputCls}
                        />
                        <span className="shrink-0 text-sm text-neutral-400">KRW</span>
                    </div>
                </FormRow>
            </FormSection>

            {/* 기본 정보 */}
            <FormSection label="기본 정보">
                <FormRow label="연도 · 분기" sublabel="연도와 분기를 선택하세요">
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            placeholder="2026"
                            min="2000"
                            max="2100"
                            className={inputCls}
                            style={{ width: "120px" }}
                        />
                        <span className="text-sm text-neutral-400">년</span>
                        <select
                            value={quarter}
                            onChange={(e) => setQuarter(e.target.value)}
                            className={inputCls}
                            style={{ width: "140px" }}
                        >
                            <option value="">분기 선택</option>
                            {[1, 2, 3, 4].map((q) => (
                                <option key={q} value={String(q)}>
                                    Q{q}
                                </option>
                            ))}
                        </select>
                    </div>
                </FormRow>
            </FormSection>

            {/* 포트폴리오 스냅샷 */}
            <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                            포트폴리오 스냅샷
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                            종목 행은 티커·평가액을, 현금 행은 통화·금액만 입력하세요. 원화 환산은 상단 환율로 자동 계산됩니다.
                        </p>
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
                            onChange={(patch) => updateRow(row.id, patch)}
                            onDelete={rows.length > 1 ? () => removeRow(row.id) : undefined}
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
                                            ? `현금 (${r.valuationCurrency})`
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

            {/* Section 4: 투자금 및 수익 */}
            <FormSection label="투자금 및 수익">
                <FormRow
                    label="총 투자금 (원금)"
                    sublabel="말일 누적 원금 기준(원화). 수익·수익률 계산에 사용됩니다."
                >
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={principalInput}
                            onChange={(e) => setPrincipalInput(e.target.value)}
                            placeholder="예: 50000000"
                            className={inputCls}
                        />
                        <span className="shrink-0 text-sm text-neutral-400">KRW</span>
                    </div>
                </FormRow>
                {(totalValuation > 0 || principal > 0) && (
                    <div className="mx-6 mb-5 overflow-hidden rounded-2xl bg-neutral-50 px-6 py-5 ring-1 ring-neutral-100 dark:bg-neutral-900/50 dark:ring-neutral-800">
                        <div className="flex flex-wrap items-center justify-between gap-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">총 평가금</span>
                                <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                    {totalValuation > 0 ? formatKRW(totalValuation) : "—"}
                                </span>
                            </div>
                            <div className="hidden h-8 w-px bg-neutral-200 sm:block dark:bg-neutral-700" />
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">수익금</span>
                                <span className={`text-base font-semibold ${profit !== null ? isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400" : "text-neutral-300 dark:text-neutral-600"}`}>
                                    {profit !== null ? `${isPositive ? "+" : ""}${formatKRW(profit)}` : "—"}
                                </span>
                            </div>
                            <div className="hidden h-8 w-px bg-neutral-200 sm:block dark:bg-neutral-700" />
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">수익률</span>
                                <span className={`text-base font-semibold ${profitRate !== null ? isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400" : "text-neutral-300 dark:text-neutral-600"}`}>
                                    {profitRate !== null ? `${isPositive ? "+" : ""}${profitRate.toFixed(2)}%` : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </FormSection>

            {/* Section 5: 회고록 */}
            <section className="mb-10">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    분기 리뷰
                </p>
                <div className="space-y-4">
                    <JournalField
                        id="journal-earnings"
                        label="어닝 / 실적 리뷰"
                        sublabel="Earnings Review"
                        placeholder="이번 분기 보유 종목들의 실적 발표 내용을 요약하고 코멘트를 남기세요. (예: NVDA — 매출 YoY +122%, 데이터센터 부문 강세. 가이던스 상향...)"
                        value={earningsReview}
                        onChange={setEarningsReview}
                        rows={8}
                    />
                    <JournalField
                        id="journal-summary"
                        label="분기 시장 요약"
                        sublabel="Market Summary"
                        placeholder="이번 분기 거시 경제 흐름, 금리/환율 변화, 주요 이벤트 등을 기록하세요."
                        value={summary}
                        onChange={setSummary}
                        rows={6}
                    />
                    <JournalField
                        id="journal-feedback"
                        label="느낀 점"
                        sublabel="Feedback"
                        placeholder="이번 분기 투자를 통해 배운 점, 아쉬웠던 점, 감정적으로 느낀 것들을 솔직하게 적어보세요."
                        value={feedback}
                        onChange={setFeedback}
                        rows={6}
                    />
                    <JournalField
                        id="journal-strategy"
                        label="다음 분기 전략"
                        sublabel="Next Quarter Strategy"
                        placeholder="다음 분기 신규 투자금 투입 계획, 리밸런싱 방향, 주목할 종목 및 섹터 등을 작성하세요."
                        value={strategy}
                        onChange={setStrategy}
                        rows={6}
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
