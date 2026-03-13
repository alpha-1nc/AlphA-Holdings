"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { createReport } from "@/app/actions/reports";
import {
    getCurrentProfile,
    getProfileLabel,
    type WorkspaceProfile,
} from "@/lib/profile";
import { TickerSearchInput } from "@/components/dashboard/ticker-search-input";
import { TickerAvatar } from "@/components/dashboard/ticker-avatar";

/* ── Constants ──────────────────────────────────────────────────────────── */
type AccountType = "US_DIRECT" | "ISA" | "JP_DIRECT" | "CASH";
type CashCurrency = "KRW" | "USD" | "JPY";

const ACCOUNT_LABELS: Record<AccountType, string> = {
    US_DIRECT: "🇺🇸 미국 직투",
    ISA: "🇰🇷 ISA",
    JP_DIRECT: "🇯🇵 일본 직투",
    CASH: "💵 현금",
};

const ACCOUNT_DEFAULT_CURRENCY: Record<AccountType, string> = {
    US_DIRECT: "USD",
    ISA: "KRW",
    JP_DIRECT: "JPY",
    CASH: "KRW",
};

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
    accountType: AccountType;
    ticker: string;
    sector: string;
    amount: string;
    cashCurrency?: CashCurrency;
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
        accountType: "US_DIRECT",
        ticker: "",
        sector: "",
        amount: "",
        cashCurrency: "KRW",
        logoUrl: null,
    };
}

function getEffectiveCurrency(row: PortfolioRow): string {
    if (row.accountType === "CASH") return row.cashCurrency ?? "KRW";
    return ACCOUNT_DEFAULT_CURRENCY[row.accountType];
}

function toKRW(row: PortfolioRow, usdRate: number, jpyRate: number): number {
    const amount = parseNumber(row.amount);
    if (amount <= 0) return 0;
    const currency = getEffectiveCurrency(row);
    switch (currency) {
        case "USD": return amount * usdRate;
        case "JPY": return amount * (jpyRate / 100);
        default: return amount;
    }
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
    row, krwValue, usdRate, jpyRate, onChange, onDelete,
}: {
    row: PortfolioRow;
    krwValue: number;
    usdRate: number;
    jpyRate: number;
    onChange: (patch: Partial<Omit<PortfolioRow, "id">>) => void;
    onDelete?: () => void;
}) {
    const effectiveCurrency = getEffectiveCurrency(row);
    const isCash = row.accountType === "CASH";

    const handleTickerChange = (ticker: string) => {
        const detectedSector = autoDetectSector(ticker);
        onChange({ ticker, sector: detectedSector || row.sector });
    };

    return (
        <div className="group relative rounded-2xl bg-white ring-1 ring-neutral-200/80 transition hover:ring-neutral-300 dark:bg-neutral-900 dark:ring-neutral-800 dark:hover:ring-neutral-700">
            {/* Row 1: 계좌 타입 + 티커 + 평가액 + 삭제 */}
            <div className="grid grid-cols-[140px_1fr_140px_32px] items-start gap-2 px-3 py-3">
                {/* ① 계좌 타입 */}
                <div className="flex flex-col gap-1 pt-0.5">
                    <select
                        value={row.accountType}
                        onChange={(e) => {
                            const newType = e.target.value as AccountType;
                            onChange({ 
                                accountType: newType, 
                                ticker: newType === "CASH" ? "" : row.ticker, 
                                sector: newType === "CASH" ? "" : row.sector,
                                cashCurrency: "KRW" 
                            });
                        }}
                        className="w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200/80 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700"
                    >
                        {(Object.keys(ACCOUNT_LABELS) as AccountType[]).map((k) => (
                            <option key={k} value={k}>{ACCOUNT_LABELS[k]}</option>
                        ))}
                    </select>
                </div>

                {/* ② 종목 검색 (현금이 아닐 때만 표시) */}
                {!isCash ? (
                    <div className="relative">
                        <TickerSearchInput
                            value={row.ticker}
                            onChange={handleTickerChange}
                            accountType={row.accountType}
                            placeholder={
                                row.accountType === "US_DIRECT" ? "AAPL, NVDA, SPY..." :
                                row.accountType === "ISA" ? "삼성전자, KODEX 200..." :
                                row.accountType === "JP_DIRECT" ? "7203, 6758..." :
                                "종목 검색..."
                            }
                        />
                    </div>
                ) : (
                    <div className="relative">
                        <select
                            value={row.cashCurrency ?? "KRW"}
                            onChange={(e) => onChange({ cashCurrency: e.target.value as CashCurrency })}
                            className="w-full rounded-xl bg-neutral-50 px-2.5 py-2 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200/80 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700"
                        >
                            <option value="KRW">🇰🇷 원화 (KRW)</option>
                            <option value="USD">🇺🇸 달러 (USD)</option>
                            <option value="JPY">🇯🇵 엔화 (JPY)</option>
                        </select>
                    </div>
                )}

                {/* ③ 평가액 */}
                <div className="relative flex items-center pt-0.5">
                    <input
                        type="number"
                        min={0}
                        value={row.amount}
                        onChange={(e) => onChange({ amount: e.target.value })}
                        placeholder="0"
                        className="no-spinner w-full rounded-xl bg-neutral-50 px-2.5 py-2 pr-14 text-right text-sm text-neutral-900 placeholder:text-neutral-300 ring-1 ring-neutral-200/80 outline-none transition focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:ring-neutral-700"
                    />
                    <span className="pointer-events-none absolute right-8 text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                        {effectiveCurrency}
                    </span>
                    <div className="absolute right-0 flex h-full flex-col overflow-hidden rounded-r-xl border-l border-neutral-200 dark:border-neutral-700">
                        <button type="button" tabIndex={-1}
                            onClick={() => onChange({ amount: String((parseFloat(row.amount) || 0) + 1) })}
                            className="flex flex-1 items-center justify-center px-1.5 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        >
                            <svg width="8" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <div className="h-px bg-neutral-200 dark:bg-neutral-700" />
                        <button type="button" tabIndex={-1}
                            onClick={() => { const v = parseFloat(row.amount) || 0; if (v > 0) onChange({ amount: String(v - 1) }); }}
                            className="flex flex-1 items-center justify-center px-1.5 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        >
                            <svg width="8" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                    </div>
                </div>

                {/* ④ 삭제 */}
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={!onDelete}
                    className="mt-1 flex h-8 w-8 items-center justify-center rounded-xl text-neutral-300 transition hover:bg-red-50 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30 dark:text-neutral-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                </button>
            </div>

            {/* Row 2: 섹터 선택 + KRW 환산 (현금이 아닐 때만 표시) */}
            {!isCash && (
                <div className="flex items-center justify-between border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                        {row.ticker && (
                            <TickerAvatar
                                ticker={row.ticker}
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
                        {row.sector && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                {row.sector}
                            </span>
                        )}
                    </div>
                    {krwValue > 0 && effectiveCurrency !== "KRW" && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                            ≈ <span className="font-medium text-neutral-600 dark:text-neutral-400">{formatKRW(krwValue)}</span>
                        </span>
                    )}
                </div>
            )}
            {/* 현금일 때 KRW 환산 표시 */}
            {isCash && krwValue > 0 && effectiveCurrency !== "KRW" && (
                <div className="border-t border-neutral-100 px-3 py-2 text-right dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                        ≈ <span className="font-medium text-neutral-600 dark:text-neutral-400">{formatKRW(krwValue)}</span>
                    </span>
                </div>
            )}
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
    const [principalRaw, setPrincipalRaw] = useState("");
    const [rows, setRows] = useState<PortfolioRow[]>([newRow()]);
    const [earningsReview, setEarningsReview] = useState("");
    const [strategy, setStrategy] = useState("");
    const [summary, setSummary] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addRow = useCallback(() => setRows((prev) => [...prev, newRow()]), []);
    const removeRow = useCallback((id: string) => setRows((prev) => prev.filter((r) => r.id !== id)), []);
    const updateRow = useCallback(
        (id: string, patch: Partial<Omit<PortfolioRow, "id">>) => {
            console.log(`[updateRow] id: ${id}, patch:`, patch);
            setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
        },
        [],
    );

    const usdRate = parseNumber(usdKrw);
    const jpyRate = parseNumber(jpyKrw);
    const principal = parseNumber(principalRaw);

    const rowKRWs = useMemo(() => rows.map((r) => toKRW(r, usdRate, jpyRate)), [rows, usdRate, jpyRate]);
    const totalValuation = useMemo(() => rowKRWs.reduce((acc, v) => acc + v, 0), [rowKRWs]);

    const profit = principal > 0 && totalValuation > 0 ? totalValuation - principal : null;
    const profitRate = profit !== null && principal > 0 ? (profit / principal) * 100 : null;
    const isPositive = profit !== null ? profit >= 0 : true;

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
        const periodLabel = `${yearNum}-Q${quarterNum}`;
        const incompletePortfolio = rows.filter((r) => {
            const hasTicker = r.ticker.trim().length > 0;
            const hasAmount = parseNumber(r.amount) > 0;
            if (r.accountType === "CASH") return !hasAmount;
            return (hasTicker && !hasAmount) || (!hasTicker && hasAmount);
        });
        if (incompletePortfolio.length > 0) {
            toast.error("종목명과 평가액을 모두 입력해 주세요. 비어 있는 행은 삭제해 주세요.");
            return;
        }
        const validRows = rows.filter((r) => {
            const hasAmount = parseNumber(r.amount) > 0;
            if (r.accountType === "CASH") return hasAmount;
            return r.ticker.trim() && hasAmount;
        });
        if (validRows.length === 0) {
            toast.error("포트폴리오 스냅샷에 최소 1개 이상의 항목을 입력해주세요.");
            return;
        }
        setIsSubmitting(true);
        try {
            await createReport({
                type: "QUARTERLY",
                profile: getProfileLabel(profile),
                status: asDraft ? "DRAFT" : "PUBLISHED",
                periodLabel,
                usdRate,
                jpyRate,
                totalInvestedKrw: principal,
                totalCurrentKrw: totalValuation,
                summary,
                journal: "",
                strategy,
                earningsReview,
                portfolioItems: validRows.map((r) => {
                    const item = {
                        ticker: r.accountType === "CASH" ? ACCOUNT_LABELS[r.accountType] : (r.ticker || ACCOUNT_LABELS[r.accountType]),
                        sector: r.accountType === "CASH" ? undefined : (r.sector || undefined),
                        accountType: r.accountType,
                        originalCurrency: getEffectiveCurrency(r) as "USD" | "KRW" | "JPY",
                        originalAmount: parseNumber(r.amount),
                        krwAmount: toKRW(r, usdRate, jpyRate),
                        logoUrl: r.logoUrl?.trim() || null,
                    };
                    console.log(`[portfolioItems] ticker: ${item.ticker}, logoUrl:`, item.logoUrl?.substring(0, 50));
                    return item;
                }),
                newInvestments: [],
            });
            toast.success(asDraft ? "임시 저장되었습니다." : "분기별 리포트가 저장되었습니다.");
            router.push(asDraft ? "/quarterly" : "/");
        } catch (err) {
            console.error("[분기별 리포트 저장 오류]", err);
            toast.error(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
            setIsSubmitting(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="mx-auto max-w-2xl px-4 py-12">
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
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200/80 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        {getProfileLabel(profile)}
                    </span>
                </div>
            </div>

            {/* Section 1: 기본 정보 */}
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

            {/* Section 2: 적용 환율 */}
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

            {/* Section 3: Portfolio Snapshot */}
            <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                            Portfolio Snapshot
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                            이번 분기 말 기준 보유 종목과 평가금액을 입력하세요.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={addRow}
                        className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                    >
                        <span className="text-base leading-none">+</span>
                        종목 추가
                    </button>
                </div>

                {/* Table header */}
                <div className="mb-1.5 grid grid-cols-[140px_1fr_140px_32px] gap-2 px-4">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">계좌 타입</span>
                    <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">종목 / Ticker</span>
                    <span className="text-right text-[10px] font-medium uppercase tracking-widest text-neutral-400">평가액</span>
                    <span />
                </div>

                <div className="space-y-2">
                    {rows.map((row, idx) => (
                        <PortfolioRowItem
                            key={row.id}
                            row={row}
                            krwValue={rowKRWs[idx]}
                            usdRate={usdRate}
                            jpyRate={jpyRate}
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
                            {rows.map((r, i) => {
                                const v = rowKRWs[i];
                                if (v <= 0) return null;
                                return (
                                    <span
                                        key={r.id}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-neutral-300 dark:bg-black/10 dark:text-neutral-600"
                                    >
                                        {r.ticker || ACCOUNT_LABELS[r.accountType]}
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
                <FormRow label="총 투자금 (원금)" sublabel="누적 투입 원금 총액">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={principalRaw}
                            onChange={(e) => setPrincipalRaw(e.target.value)}
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
            <div className="flex justify-end gap-3 pb-16">
                <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                    className={[
                        "relative inline-flex items-center gap-2.5 rounded-2xl px-6 py-3.5",
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
                        "relative inline-flex items-center gap-2.5 rounded-2xl px-8 py-3.5",
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
