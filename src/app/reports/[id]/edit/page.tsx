"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";
import {
    getReportById,
    getQuarterEndMonthMonthlyValuationForSync,
    updateReportFull,
    updateQuarterlyPublishedWithMonthValuationSync,
    getPreviousMonthMonthlyReportPrincipalState,
    getQuarterEndPrincipalFromMonthlyReports,
    sumMonthlyNewInvestmentsInQuarterKrw,
    type CreateReportPayload,
} from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import type { Report, PortfolioItem, NewInvestment } from "@/generated/prisma";
import type { AssetRole } from "@/generated/prisma";

/* ── Constants ──────────────────────────────────────────────────────────── */
type AccountType = "US_DIRECT" | "ISA" | "JP_DIRECT" | "CASH";

const MONTHLY_ACCOUNT_LABELS: Record<Exclude<AccountType, "CASH">, string> = {
    US_DIRECT: "🇺🇸 미국 직투",
    ISA: "🇰🇷 ISA",
    JP_DIRECT: "🇯🇵 일본 직투",
};

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

const SECTORS = [
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

type Sector = (typeof SECTORS)[number];

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
    DIS: "Communication Services",
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

interface PortfolioRow {
    id: string;
    kind: "stock" | "cash";
    ticker: string;
    displayName?: string | null;
    sector: string;
    role: AssetRole;
    valuationCurrency: ValuationCurrency;
    amount: string;
    logoUrl?: string | null;
}

interface NewInvestmentRow {
    id: string;
    accountType: AccountType;
    flow: "in" | "out";
    amount: string;
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

function newInvestmentRow(): NewInvestmentRow {
    return {
        id: crypto.randomUUID(),
        accountType: "US_DIRECT",
        flow: "in",
        amount: "",
    };
}

function signedKrwFromInvestmentRow(row: NewInvestmentRow): number {
    const abs = Math.abs(parseNumber(row.amount));
    if (abs === 0) return 0;
    return row.flow === "out" ? -abs : abs;
}

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

function monthlyAccountFromDb(at: string): Exclude<AccountType, "CASH"> {
    if (at === "ISA" || at === "JP_DIRECT" || at === "US_DIRECT") return at;
    return "US_DIRECT";
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

function profitColorCls(isProfit: boolean) {
    return isProfit
        ? "font-semibold text-emerald-600 dark:text-emerald-400"
        : "font-semibold text-red-500 dark:text-red-400";
}

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

function ValuationItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{label}</span>
            <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{value}</span>
        </div>
    );
}

function Placeholder() {
    return <span className="text-sm font-normal text-neutral-300 dark:text-neutral-600">—</span>;
}

/* ── Portfolio Row Item (분기별) ───────────────────────────────────────────*/
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

/* ── New Investment Row Item (월별) ────────────────────────────────────────*/
function NewInvestmentRowItem({
    row, signedKrw, onChange, onDelete,
}: {
    row: NewInvestmentRow;
    signedKrw: number;
    onChange: (patch: Partial<Omit<NewInvestmentRow, "id">>) => void;
    onDelete: () => void;
}) {
    const flowBtn =
        "rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
    const flowInactive =
        "text-neutral-500 hover:bg-blue-100/80 dark:text-neutral-400 dark:hover:bg-blue-900/40";
    const flowActiveIn = "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200/80 dark:bg-neutral-800 dark:text-blue-300 dark:ring-blue-600";
    const flowActiveOut = "bg-white text-rose-700 shadow-sm ring-1 ring-rose-200/80 dark:bg-neutral-800 dark:text-rose-300 dark:ring-rose-700";

    return (
        <div className="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-blue-200/80 transition hover:ring-blue-300 dark:bg-neutral-900 dark:ring-blue-800 dark:hover:ring-blue-700">
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-stretch">
                <select
                    value={row.accountType}
                    onChange={(e) => {
                        const newType = e.target.value as Exclude<AccountType, "CASH">;
                        onChange({ accountType: newType });
                    }}
                    className="w-full shrink-0 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-medium text-neutral-700 ring-1 ring-blue-200/80 outline-none transition focus:ring-2 focus:ring-blue-400 sm:w-[150px] dark:bg-blue-900/30 dark:text-neutral-200 dark:ring-blue-700"
                >
                    {(Object.keys(MONTHLY_ACCOUNT_LABELS) as Exclude<AccountType, "CASH">[]).map((k) => (
                        <option key={k} value={k}>{MONTHLY_ACCOUNT_LABELS[k]}</option>
                    ))}
                </select>

                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <div
                        className="inline-flex shrink-0 self-start rounded-xl bg-blue-50/80 p-0.5 ring-1 ring-blue-200/80 dark:bg-blue-900/25 dark:ring-blue-700"
                        role="group"
                        aria-label="입금 또는 출금"
                    >
                        <button
                            type="button"
                            className={`${flowBtn} ${row.flow === "in" ? flowActiveIn : flowInactive}`}
                            onClick={() => onChange({ flow: "in" })}
                        >
                            입금 (+)
                        </button>
                        <button
                            type="button"
                            className={`${flowBtn} ${row.flow === "out" ? flowActiveOut : flowInactive}`}
                            onClick={() => onChange({ flow: "out" })}
                        >
                            출금 (−)
                        </button>
                    </div>
                    <div className="relative flex min-w-0 flex-1 items-center gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={row.amount}
                            onChange={(e) => onChange({ amount: e.target.value })}
                            placeholder="금액 (원화)"
                            className="no-spinner w-full min-w-0 rounded-xl bg-blue-50 px-3 py-2.5 text-right text-sm text-neutral-900 placeholder:text-neutral-300 ring-1 ring-blue-200/80 outline-none transition focus:ring-2 focus:ring-blue-400 dark:bg-blue-900/30 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:ring-blue-700"
                        />
                        <span className="shrink-0 text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                            KRW
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onDelete}
                    className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl text-neutral-300 transition hover:bg-red-50 hover:text-red-400 sm:self-center dark:text-neutral-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                </button>
            </div>
            <p className="border-t border-blue-100/80 px-4 py-2 text-[11px] text-neutral-500 dark:border-blue-900/50 dark:text-neutral-400">
                반영 금액:{" "}
                <span className="font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
                    {signedKrw === 0 ? "—" : formatKRW(signedKrw)}
                </span>
            </p>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   Edit Report Page
══════════════════════════════════════════════════════════════════════════ */
export default function EditReportPage() {
    const router = useRouter();
    const params = useParams();
    const reportId = Number(params.id);
    const [profile, setProfile] = useState<WorkspaceProfile>("alpha-ceo");
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<(Report & { portfolioItems: PortfolioItem[]; newInvestments?: NewInvestment[] }) | null>(null);

    useEffect(() => {
        setMounted(true);
        setProfile(getCurrentProfile());
    }, []);

    useEffect(() => {
        if (!mounted || !reportId || Number.isNaN(reportId)) return;
        getReportById(reportId)
            .then((data) => {
                if (!data) {
                    toast.error("리포트를 찾을 수 없습니다.");
                    router.push("/");
                    return;
                }
                setReport(data as Report & { portfolioItems: PortfolioItem[]; newInvestments?: NewInvestment[] });
            })
            .catch((err) => {
                console.error("[리포트 로드 오류]", err);
                toast.error("리포트를 불러오는 중 오류가 발생했습니다.");
            })
            .finally(() => setLoading(false));
    }, [mounted, reportId, router]);

    const isMonthly = useMemo(() => report?.type === "MONTHLY", [report?.type]);

    const [period, setPeriod] = useState("");
    const [usdKrw, setUsdKrw] = useState("");
    const [jpyKrw, setJpyKrw] = useState("");

    const [prevLoading, setPrevLoading] = useState(false);
    const [hasPreviousReport, setHasPreviousReport] = useState(false);
    const [dbPrincipalPrev, setDbPrincipalPrev] = useState<number | null>(null);
    const [manualPrincipalRaw, setManualPrincipalRaw] = useState("");
    const [overridePrincipal, setOverridePrincipal] = useState(false);

    const [principalKrw, setPrincipalKrw] = useState<number | null>(null);
    const [principalLoading, setPrincipalLoading] = useState(false);

    const [currentValuationRaw, setCurrentValuationRaw] = useState("");
    const [summary, setSummary] = useState("");
    const [feedback, setFeedback] = useState("");
    const [strategy, setStrategy] = useState("");
    const [earningsReview, setEarningsReview] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [syncModal, setSyncModal] = useState<null | {
        payload: CreateReportPayload;
        monthEndReportId: number;
        monthlyTotal: number;
        quarterlyTotal: number;
        monthNumber: number;
    }>(null);
    const [rows, setRows] = useState<PortfolioRow[]>([newRow()]);
    const [newInvestmentRows, setNewInvestmentRows] = useState<NewInvestmentRow[]>([]);
    const [quarterNewInvFromMonthly, setQuarterNewInvFromMonthly] = useState(0);

    useEffect(() => {
        if (!report) return;
        setPeriod(report.periodLabel);
        setUsdKrw(String(report.usdRate || 0));
        setJpyKrw(String(report.jpyRate || 0));
        setCurrentValuationRaw(String(report.totalCurrentKrw));
        setSummary(report.summary || "");
        setFeedback(report.journal || "");
        setStrategy(report.strategy || "");
        setEarningsReview((report as { earningsReview?: string | null }).earningsReview || "");

        if (report.type === "MONTHLY") {
            const initialNew: NewInvestmentRow[] = (report.newInvestments || []).map((inv) => {
                const amt = inv.originalAmount;
                return {
                    id: crypto.randomUUID(),
                    accountType: monthlyAccountFromDb(inv.accountType),
                    flow: amt < 0 ? "out" : "in",
                    amount: String(Math.abs(amt)),
                };
            });
            setNewInvestmentRows(initialNew);
            const newSum = (report.newInvestments || []).reduce((s, i) => s + i.krwAmount, 0);
            const derivedBase = report.totalInvestedKrw - newSum;
            setManualPrincipalRaw(String(Math.round(derivedBase)));
            setOverridePrincipal(false);
            setRows([newRow()]);
        } else {
            const initialRows: PortfolioRow[] = (report.portfolioItems || []).map((item) => {
                const oc = (item.originalCurrency || "KRW") as string;
                const valuationCurrency: ValuationCurrency =
                    oc === "USD" || oc === "JPY" || oc === "KRW" ? oc : "KRW";
                if (item.accountType === "CASH") {
                    return {
                        id: crypto.randomUUID(),
                        kind: "cash" as const,
                        ticker: (item.ticker || "").trim() || valuationCurrency,
                        displayName: item.displayName ?? "현금",
                        sector: "",
                        role: (item.role as AssetRole) || "UNASSIGNED",
                        valuationCurrency,
                        amount: String(item.originalAmount),
                        logoUrl: null,
                    };
                }
                return {
                    id: crypto.randomUUID(),
                    kind: "stock" as const,
                    ticker: item.ticker,
                    displayName: item.displayName ?? null,
                    sector: item.sector || "",
                    role: (item.role as AssetRole) || "CORE",
                    valuationCurrency,
                    amount: String(item.originalAmount),
                    logoUrl: item.logoUrl ?? null,
                };
            });
            setRows(initialRows.length > 0 ? initialRows : [newRow()]);
            setNewInvestmentRows([]);
        }
    }, [report]);

    useEffect(() => {
        if (!isMonthly || !period.trim()) {
            setPrevLoading(false);
            setHasPreviousReport(false);
            setDbPrincipalPrev(null);
            return;
        }
        if (!/^\d{4}-\d{2}$/.test(period.trim())) {
            setPrevLoading(false);
            return;
        }
        let cancelled = false;
        setPrevLoading(true);
        getPreviousMonthMonthlyReportPrincipalState(getProfileLabel(profile), period.trim()).then((s) => {
            if (cancelled) return;
            setHasPreviousReport(s.hasPreviousReport);
            setDbPrincipalPrev(s.totalInvestedKrw);
            setPrevLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [period, profile, isMonthly]);

    useEffect(() => {
        if (!report || isMonthly) return;
        const m = /^(\d{4})-Q([1-4])$/.exec(report.periodLabel);
        if (!m) {
            setPrincipalKrw(null);
            setPrincipalLoading(false);
            return;
        }
        let cancelled = false;
        setPrincipalLoading(true);
        getQuarterEndPrincipalFromMonthlyReports(getProfileLabel(profile), Number(m[1]), Number(m[2])).then((p) => {
            if (cancelled) return;
            setPrincipalKrw(p != null ? Math.round(p) : null);
            setPrincipalLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [report, isMonthly, profile]);

    useEffect(() => {
        if (!report || isMonthly) return;
        const m = /^(\d{4})-Q([1-4])$/.exec(report.periodLabel);
        if (!m) return;
        sumMonthlyNewInvestmentsInQuarterKrw(getProfileLabel(profile), Number(m[1]), Number(m[2])).then(
            setQuarterNewInvFromMonthly,
        );
    }, [report, isMonthly, profile]);

    const addRow = useCallback(() => setRows((prev) => [...prev, newRow()]), []);
    const addCashRow = useCallback(() => setRows((prev) => [...prev, newCashRow()]), []);
    const removeRow = useCallback((id: string) => setRows((prev) => prev.filter((r) => r.id !== id)), []);
    const updateRow = useCallback((id: string, patch: Partial<Omit<PortfolioRow, "id">>) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }, []);
    const addNewInvestmentRow = useCallback(() => setNewInvestmentRows((prev) => [...prev, newInvestmentRow()]), []);
    const removeNewInvestmentRow = useCallback((id: string) => setNewInvestmentRows((prev) => prev.filter((r) => r.id !== id)), []);
    const updateNewInvestmentRow = useCallback(
        (id: string, patch: Partial<Omit<NewInvestmentRow, "id">>) =>
            setNewInvestmentRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
        [],
    );

    const usdRate = parseNumber(usdKrw);
    const jpyRate = parseNumber(jpyKrw);
    const currentValuation = parseNumber(currentValuationRaw);

    const rowKRWs = useMemo(() => rows.map((r) => rowToKrw(r, usdRate, jpyRate)), [rows, usdRate, jpyRate]);
    const displayRows = useMemo(
        () => sortPortfolioFormRowsByDisplay(rows, (r) => rowToKrw(r, usdRate, jpyRate)),
        [rows, usdRate, jpyRate],
    );
    const totalValuation = useMemo(() => {
        if (isMonthly) return currentValuation;
        return rowKRWs.reduce((acc, v) => acc + v, 0);
    }, [isMonthly, currentValuation, rowKRWs]);

    const totalNewSigned = useMemo(
        () => newInvestmentRows.reduce((acc, r) => acc + signedKrwFromInvestmentRow(r), 0),
        [newInvestmentRows],
    );

    const effectiveBasePrincipal = useMemo(() => {
        if (!isMonthly) return null;
        if (prevLoading) return null;
        if (hasPreviousReport && !overridePrincipal && dbPrincipalPrev != null) {
            return dbPrincipalPrev;
        }
        return parseNumber(manualPrincipalRaw);
    }, [isMonthly, prevLoading, hasPreviousReport, overridePrincipal, dbPrincipalPrev, manualPrincipalRaw]);

    const monthEndPrincipal =
        isMonthly && effectiveBasePrincipal !== null
            ? effectiveBasePrincipal + totalNewSigned
            : null;

    const principalQuarter = principalKrw ?? 0;

    const profit = useMemo(() => {
        if (isMonthly) {
            if (monthEndPrincipal === null || monthEndPrincipal <= 0) return null;
            return computeGainKrw(totalValuation, monthEndPrincipal);
        }
        if (principalQuarter > 0 && totalValuation >= 0) {
            return computeGainKrw(totalValuation, principalQuarter);
        }
        return null;
    }, [isMonthly, monthEndPrincipal, totalValuation, principalQuarter]);

    const profitRate = useMemo(() => {
        if (isMonthly) {
            if (monthEndPrincipal === null || monthEndPrincipal <= 0) return null;
            return computeReturnRatePercent(totalValuation, monthEndPrincipal);
        }
        if (principalQuarter > 0) {
            return computeReturnRatePercent(totalValuation, principalQuarter);
        }
        return null;
    }, [isMonthly, monthEndPrincipal, totalValuation, principalQuarter]);

    const isProfit = profit != null && profit >= 0;

    const buildQuarterlyEditPayload = (asDraft: boolean, validRows: PortfolioRow[]): CreateReportPayload => ({
        type: "QUARTERLY",
        profile: getProfileLabel(profile),
        status: asDraft ? "DRAFT" : "PUBLISHED",
        periodLabel: period.trim(),
        usdRate,
        jpyRate,
        totalInvestedKrw: principalKrw ?? 0,
        totalCurrentKrw: totalValuation,
        summary,
        journal: "",
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
        if (!period.trim()) {
            toast.error("기간을 입력해주세요.");
            return;
        }
        if (isMonthly) {
            setIsSubmitting(true);
            try {
                if (prevLoading) {
                    toast.error("직전 월 데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
                    setIsSubmitting(false);
                    return;
                }
                if (effectiveBasePrincipal === null) {
                    toast.error("총 투자금(원금) 기준을 확인할 수 없습니다.");
                    setIsSubmitting(false);
                    return;
                }
                const incompleteNewInv = newInvestmentRows.filter((r) => parseNumber(r.amount) === 0);
                if (incompleteNewInv.length > 0) {
                    toast.error("신규 투입금이 비어 있는 행이 있습니다. 금액을 입력하거나 해당 행을 삭제해 주세요.");
                    setIsSubmitting(false);
                    return;
                }
                const endPrincipal = effectiveBasePrincipal + totalNewSigned;
                if (endPrincipal < 0) {
                    toast.error("이번 달 최종 누적 원금이 음수가 될 수 없습니다. 출금액을 확인해 주세요.");
                    setIsSubmitting(false);
                    return;
                }
                await updateReportFull(reportId, {
                    type: "MONTHLY",
                    profile: getProfileLabel(profile),
                    status: asDraft ? "DRAFT" : "PUBLISHED",
                    periodLabel: period.trim(),
                    usdRate: 0,
                    jpyRate: 0,
                    totalInvestedKrw: endPrincipal,
                    totalCurrentKrw: currentValuation,
                    summary,
                    journal: feedback,
                    strategy: "",
                    earningsReview: undefined,
                    portfolioItems: [],
                    newInvestments: newInvestmentRows.map((r) => {
                        const signed = signedKrwFromInvestmentRow(r);
                        return {
                            accountType: r.accountType,
                            originalCurrency: "KRW" as const,
                            originalAmount: signed,
                            krwAmount: signed,
                        };
                    }),
                });
                toast.success(asDraft ? "임시 저장되었습니다." : "리포트가 성공적으로 수정되었습니다.");
                router.push(asDraft ? "/monthly" : `/reports/${reportId}`);
            } catch (err) {
                console.error("[리포트 수정 오류]", err);
                toast.error(err instanceof Error ? err.message : "수정 중 오류가 발생했습니다. 다시 시도해 주세요.");
            } finally {
                setIsSubmitting(false);
            }
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

        const qPayload = buildQuarterlyEditPayload(asDraft, validRows);

        if (asDraft) {
            setIsSubmitting(true);
            try {
                await updateReportFull(reportId, qPayload);
                toast.success("임시 저장되었습니다.");
                router.push("/quarterly");
            } catch (err) {
                console.error("[리포트 수정 오류]", err);
                toast.error(err instanceof Error ? err.message : "수정 중 오류가 발생했습니다. 다시 시도해 주세요.");
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        const qm = /^(\d{4})-Q([1-4])$/.exec(period.trim());
        if (!qm) {
            toast.error("분기 형식이 올바르지 않습니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            const profileLabel = getProfileLabel(profile);
            const monthSnap = await getQuarterEndMonthMonthlyValuationForSync(
                profileLabel,
                Number(qm[1]),
                Number(qm[2]),
            );
            if (monthSnap && Math.round(totalValuation) !== Math.round(monthSnap.totalCurrentKrw)) {
                setSyncModal({
                    payload: qPayload,
                    monthEndReportId: monthSnap.reportId,
                    monthlyTotal: monthSnap.totalCurrentKrw,
                    quarterlyTotal: totalValuation,
                    monthNumber: monthSnap.monthNumber,
                });
                setIsSubmitting(false);
                return;
            }
            await updateReportFull(reportId, qPayload);
            toast.success("리포트가 성공적으로 수정되었습니다.");
            router.push(`/reports/${reportId}`);
        } catch (err) {
            console.error("[리포트 수정 오류]", err);
            toast.error(err instanceof Error ? err.message : "수정 중 오류가 발생했습니다. 다시 시도해 주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSyncModalKeepExisting = async () => {
        if (!syncModal) return;
        setIsSubmitting(true);
        try {
            await updateReportFull(reportId, syncModal.payload);
            toast.success("리포트가 성공적으로 수정되었습니다.");
            setSyncModal(null);
            router.push(`/reports/${reportId}`);
        } catch (err) {
            console.error("[리포트 수정 오류]", err);
            toast.error(err instanceof Error ? err.message : "수정 중 오류가 발생했습니다. 다시 시도해 주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSyncModalSaveWithSync = async () => {
        if (!syncModal) return;
        setIsSubmitting(true);
        try {
            await updateQuarterlyPublishedWithMonthValuationSync(reportId, syncModal.payload, syncModal.monthEndReportId);
            toast.success("리포트가 수정되었고, 말월 월별 리포트 총평가가 동기화되었습니다.");
            setSyncModal(null);
            router.push(`/reports/${reportId}`);
        } catch (err) {
            console.error("[리포트 동기화 수정 오류]", err);
            toast.error(err instanceof Error ? err.message : "수정 중 오류가 발생했습니다. 다시 시도해 주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted || loading) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-12">
                <div className="h-7 w-48 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            </div>
        );
    }

    if (!report) {
        return null;
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-12">
            <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Link
                            href={`/reports/${reportId}`}
                            className="text-xs text-neutral-400 transition hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                            ← 리포트 보기
                        </Link>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                        {isMonthly ? "월별 리포트 수정" : "분기별 리포트 수정"}
                    </h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {isMonthly ? "이번 달의 자금 흐름과 시장 흐름을 수정하세요." : "분기 실적과 펀더멘털을 수정하세요."}
                    </p>
                </div>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {getProfileLabel(profile)}
                </span>
            </div>

            {!isMonthly && (
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
            )}

            <FormSection label="기본 정보">
                <FormRow label="리포트 유형" sublabel="변경 불가">
                    <div className="rounded-xl bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700">
                        {isMonthly ? "월별 (Monthly)" : "분기별 (Quarterly)"}
                    </div>
                </FormRow>
                <FormRow label={isMonthly ? "연월" : "연도 · 분기"} sublabel="수정 시 기간은 변경할 수 없습니다">
                    <input
                        type="text"
                        readOnly
                        value={period}
                        className={`${inputCls} bg-neutral-50 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400`}
                    />
                </FormRow>
            </FormSection>

            {!isMonthly && (
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

                    <div className="mt-4 overflow-hidden rounded-2xl bg-neutral-900 px-6 py-5 dark:bg-neutral-100">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                총 평가금액
                            </span>
                            <span className="text-right text-xl font-bold tracking-tight text-white dark:text-neutral-900">
                                {totalValuation > 0
                                    ? formatKRW(totalValuation)
                                    : <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">종목을 입력하면 자동 계산됩니다</span>}
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
            )}

            {isMonthly && (
                <FormSection label="자금 현황">
                    <FormRow
                        label="총 투자금 (원금)"
                        sublabel={
                            hasPreviousReport
                                ? "직전 월 리포트의 말일 누적 원금입니다. 자물쇠를 해제하면 수동으로 수정할 수 있습니다."
                                : "최초 작성 구간입니다. 저장된 기준 원금이 아래에 반영됩니다. 필요 시 잠금 해제 후 수정하세요."
                        }
                    >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            {prevLoading ? (
                                <span className="text-sm text-neutral-400">불러오는 중…</span>
                            ) : !hasPreviousReport ? (
                                <div className="flex flex-1 items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={manualPrincipalRaw}
                                        onChange={(e) => setManualPrincipalRaw(e.target.value)}
                                        placeholder="예: 10000000"
                                        className={inputCls}
                                    />
                                    <span className="shrink-0 text-sm text-neutral-400">KRW</span>
                                </div>
                            ) : (
                                <div className="flex flex-1 flex-wrap items-center gap-2">
                                    {overridePrincipal ? (
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={manualPrincipalRaw}
                                            onChange={(e) => setManualPrincipalRaw(e.target.value)}
                                            placeholder="원금 직접 입력"
                                            className={`${inputCls} min-w-[180px] flex-1`}
                                        />
                                    ) : (
                                        <div className="min-w-[180px] flex-1 rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700">
                                            {formatKRW(dbPrincipalPrev ?? 0)}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        title={overridePrincipal ? "자동 값(직전 월)으로 되돌리기" : "수동으로 수정"}
                                        onClick={() => {
                                            if (overridePrincipal) {
                                                setOverridePrincipal(false);
                                                setManualPrincipalRaw(String(Math.round(dbPrincipalPrev ?? 0)));
                                            } else {
                                                setOverridePrincipal(true);
                                            }
                                        }}
                                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                                    >
                                        {overridePrincipal ? (
                                            <Unlock className="h-4 w-4" aria-hidden />
                                        ) : (
                                            <Lock className="h-4 w-4" aria-hidden />
                                        )}
                                    </button>
                                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                        {overridePrincipal ? "수동 수정 중" : "자동 반영"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </FormRow>
                    <FormRow label="신규 투입금" sublabel="이번 달 입금(+) 또는 출금(−). 말일 누적 원금에 합산됩니다.">
                        <div className="space-y-2">
                            {newInvestmentRows.map((row) => (
                                <NewInvestmentRowItem
                                    key={row.id}
                                    row={row}
                                    signedKrw={signedKrwFromInvestmentRow(row)}
                                    onChange={(patch) => updateNewInvestmentRow(row.id, patch)}
                                    onDelete={() => removeNewInvestmentRow(row.id)}
                                />
                            ))}
                            <button
                                type="button"
                                onClick={addNewInvestmentRow}
                                className="w-full rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-2 text-sm text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                            >
                                + 신규 투입금 추가
                            </button>
                        </div>
                    </FormRow>
                    <FormRow label="현재 총 평가금" sublabel="이번 달 말 기준 총 평가금 (직접 입력)">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={currentValuationRaw}
                                onChange={(e) => setCurrentValuationRaw(e.target.value)}
                                placeholder="예: 54500000"
                                className={inputCls}
                            />
                            <span className="shrink-0 text-sm text-neutral-400">KRW</span>
                        </div>
                    </FormRow>
                    <div className="border-t border-neutral-100 px-6 py-5 dark:border-neutral-800">
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                            이번 달 최종 누적 원금
                        </p>
                        <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                            직전 월 누적(또는 초기 입력 원금) + 이번 달 신규 투입금 합계 · 저장 시 DB에 저장됩니다.
                        </p>
                        <p className="mt-3 text-xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50">
                            {monthEndPrincipal === null ? (
                                <span className="text-base font-normal text-neutral-400">계산 중…</span>
                            ) : (
                                formatKRW(monthEndPrincipal)
                            )}
                        </p>
                    </div>
                </FormSection>
            )}

            {!isMonthly && (
                <FormSection label="투자금 및 수익">
                    <FormRow
                        label="이 분기 월별 신규 납입 합계"
                        sublabel="월별 리포트에 기록된 신규 납입액 합계 (참고)"
                    >
                        <div className="rounded-xl bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-800 ring-1 ring-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700">
                            {formatKRW(quarterNewInvFromMonthly)}
                        </div>
                    </FormRow>
                    <FormRow
                        label="총 투자금 (원금)"
                        sublabel="해당 분기 말월 월별 리포트의 말일 누적 원금(totalInvestedKrw)입니다. DB에서만 불러옵니다."
                    >
                        <div className="rounded-xl bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-800 ring-1 ring-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700">
                            {principalLoading ? (
                                <span className="text-neutral-400">불러오는 중…</span>
                            ) : principalKrw != null ? (
                                formatKRW(principalKrw)
                            ) : (
                                <span className="text-neutral-400">해당 말월 월별 리포트가 없습니다.</span>
                            )}
                        </div>
                    </FormRow>
                    {(totalValuation > 0 || principalQuarter > 0) && (
                        <div className="mx-6 mb-5 overflow-hidden rounded-2xl bg-neutral-50 px-6 py-5 ring-1 ring-neutral-100 dark:bg-neutral-900/50 dark:ring-neutral-800">
                            <div className="flex flex-wrap items-center justify-between gap-y-4">
                                <ValuationItem
                                    label="총 평가금"
                                    value={totalValuation > 0 ? formatKRW(totalValuation) : <Placeholder />}
                                />
                                <div className="hidden h-8 w-px bg-neutral-200 sm:block dark:bg-neutral-700" />
                                <ValuationItem
                                    label="수익금"
                                    value={
                                        profit !== null ? (
                                            <span className={profitColorCls(isProfit)}>
                                                {isProfit ? "+" : ""}{formatKRW(profit)}
                                            </span>
                                        ) : <Placeholder />
                                    }
                                />
                                <div className="hidden h-8 w-px bg-neutral-200 sm:block dark:bg-neutral-700" />
                                <ValuationItem
                                    label="수익률"
                                    value={
                                        profitRate !== null ? (
                                            <span className={profitColorCls(isProfit)}>
                                                {isProfit ? "+" : ""}{profitRate.toFixed(2)}%
                                            </span>
                                        ) : <Placeholder />
                                    }
                                />
                            </div>
                        </div>
                    )}
                </FormSection>
            )}

            {isMonthly && (currentValuation > 0 || (monthEndPrincipal ?? 0) > 0) && (
                <div className="mb-8 overflow-hidden rounded-2xl bg-neutral-900 px-6 py-5 dark:bg-neutral-100">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                        수익 요약 (자동 계산)
                    </p>
                    <div className="flex flex-wrap gap-x-8 gap-y-3">
                        <div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">총 평가금</p>
                            <p className="text-base font-bold text-white dark:text-neutral-900">
                                {currentValuation > 0 ? formatKRW(currentValuation) : "—"}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">수익금</p>
                            <p className={`text-base font-bold ${profit !== null
                                ? isProfit
                                    ? "text-emerald-400 dark:text-emerald-600"
                                    : "text-red-400 dark:text-red-500"
                                : "text-neutral-500"
                                }`}>
                                {profit !== null
                                    ? `${isProfit ? "+" : ""}${formatKRW(profit)}`
                                    : "—"}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">수익률</p>
                            <p className={`text-base font-bold ${profitRate !== null
                                ? isProfit
                                    ? "text-emerald-400 dark:text-emerald-600"
                                    : "text-red-400 dark:text-red-500"
                                : "text-neutral-500"
                                }`}>
                                {profitRate !== null
                                    ? `${isProfit ? "+" : ""}${profitRate.toFixed(2)}%`
                                    : "—"}
                            </p>
                        </div>
                        {totalNewSigned !== 0 && (
                            <div>
                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">이번 달 신규 합계</p>
                                <p className="text-base font-bold text-blue-400 dark:text-blue-600">
                                    {totalNewSigned > 0 ? "+" : ""}
                                    {formatKRW(totalNewSigned)}
                                </p>
                            </div>
                        )}
                    </div>
                    <p className="mt-3 text-[10px] text-neutral-500 dark:text-neutral-400">
                        수익금 = 평가금 − 말일 누적 원금(신규는 원금에 포함).
                    </p>
                </div>
            )}

            <section className="mb-10">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    {isMonthly ? "회고록" : "분기 리뷰"}
                </p>
                <div className="space-y-4">
                    {isMonthly ? (
                        <>
                            <JournalField
                                id="journal-summary"
                                label="이번 달 증시 요약"
                                sublabel="Summary"
                                placeholder="이번 달 시장 전반의 흐름, 주요 이벤트, 섹터 동향 등을 자유롭게 기록하세요."
                                value={summary}
                                onChange={setSummary}
                            />
                            <JournalField
                                id="journal-feedback"
                                label="느낀 점"
                                sublabel="Feedback"
                                placeholder="이번 달 투자를 통해 배운 점, 아쉬웠던 점, 감정적으로 느낀 것들을 솔직하게 적어보세요."
                                value={feedback}
                                onChange={setFeedback}
                            />
                        </>
                    ) : (
                        <>
                            <JournalField
                                id="journal-earnings"
                                label="어닝 / 실적 리뷰"
                                sublabel="Earnings Review"
                                placeholder="이번 분기 보유 종목들의 실적 발표 내용을 요약하고 코멘트를 남기세요."
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
                        </>
                    )}
                </div>
            </section>

            <div className="flex justify-end gap-3 pb-16">
                <Link
                    href={`/reports/${reportId}`}
                    className="inline-flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-semibold tracking-tight text-neutral-600 ring-1 ring-neutral-200 transition hover:bg-neutral-50 dark:text-neutral-400 dark:ring-neutral-700 dark:hover:bg-neutral-800"
                >
                    취소
                </Link>
                <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting || syncModal !== null}
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
                    disabled={isSubmitting || syncModal !== null}
                    className={[
                        "relative inline-flex items-center gap-2.5 rounded-2xl px-8 py-3.5",
                        "text-sm font-semibold tracking-tight text-white shadow-lg",
                        "transition-all duration-200",
                        isSubmitting
                            ? "bg-neutral-400 cursor-not-allowed"
                            : isMonthly
                                ? "bg-neutral-900 hover:bg-neutral-700 active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
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
                            수정 완료
                        </>
                    )}
                </button>
            </div>

            <Dialog
                open={syncModal !== null}
                onOpenChange={(open) => {
                    if (!open && !isSubmitting) setSyncModal(null);
                }}
            >
                <DialogContent showCloseButton={false} className="sm:max-w-md">
                    {syncModal && (
                        <>
                            <DialogHeader>
                                <DialogTitle>평가금액 동기화 안내</DialogTitle>
                                <DialogDescription className="text-left text-neutral-600 dark:text-neutral-400">
                                    계산된 분기 총 평가금({formatKRW(syncModal.quarterlyTotal)})과 기존{" "}
                                    {syncModal.monthNumber}월 리포트에 기록된 총 평가금(
                                    {formatKRW(syncModal.monthlyTotal)}) 간에 차이가 있습니다. 더 정밀한 환율과
                                    종목 데이터가 반영된 현재 금액으로 {syncModal.monthNumber}월 리포트의 자산
                                    총액을 업데이트하시겠습니까?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2 sm:justify-end">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={isSubmitting}
                                    onClick={handleSyncModalKeepExisting}
                                >
                                    기존 데이터 유지
                                </Button>
                                <Button
                                    type="button"
                                    variant="default"
                                    disabled={isSubmitting}
                                    onClick={handleSyncModalSaveWithSync}
                                >
                                    {isSubmitting ? "저장 중…" : "동기화 후 저장"}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
