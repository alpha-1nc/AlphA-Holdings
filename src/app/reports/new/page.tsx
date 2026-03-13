"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

/* ── Constants ──────────────────────────────────────────────────────────── */
type AccountType = "US_DIRECT" | "ISA" | "JP_DIRECT" | "CASH";
type CashCurrency = "KRW" | "USD" | "JPY";

const ACCOUNT_LABELS: Record<AccountType, string> = {
    US_DIRECT: "🇺🇸 미국 직투",
    ISA: "🇰🇷 ISA",
    JP_DIRECT: "🇯🇵 일본 직투",
    CASH: "💵 현금",
};

// 월별 리포트용 계좌 목록 (CASH 제외)
const MONTHLY_ACCOUNT_LABELS: Record<Exclude<AccountType, "CASH">, string> = {
    US_DIRECT: "🇺🇸 미국 직투",
    ISA: "🇰🇷 ISA",
    JP_DIRECT: "🇯🇵 일본 직투",
};

const ACCOUNT_DEFAULT_CURRENCY: Record<AccountType, string> = {
    US_DIRECT: "USD",
    ISA: "KRW",
    JP_DIRECT: "JPY",
    CASH: "KRW",
};

interface NewInvestmentRow {
    id: string;
    accountType: AccountType;
    amount: string;
    cashCurrency?: CashCurrency;
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

function newInvestmentRow(): NewInvestmentRow {
    return {
        id: crypto.randomUUID(),
        accountType: "US_DIRECT",
        amount: "",
    };
}

// 월별 리포트에서는 항상 KRW만 사용
function getEffectiveCurrency(row: NewInvestmentRow): string {
    return "KRW";
}

function toKRWForInvestment(row: NewInvestmentRow, usdRate: number, jpyRate: number): number {
    const amount = parseNumber(row.amount);
    if (amount <= 0) return 0;
    // 월별 리포트에서는 항상 원화이므로 변환 불필요
    return amount;
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
    id, label, sublabel, placeholder, value, onChange,
}: {
    id: string; label: string; sublabel: string; placeholder: string; value: string; onChange: (v: string) => void;
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
                rows={6}
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

/* ══════════════════════════════════════════════════════════════════════════
   Monthly Report Page
══════════════════════════════════════════════════════════════════════════ */
export default function NewMonthlyReportPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<WorkspaceProfile>("alpha-ceo");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setProfile(getCurrentProfile());
        // Set default year and month to current date
        const now = new Date();
        setYear(String(now.getFullYear()));
        setMonth(String(now.getMonth() + 1));
    }, []);

    const [year, setYear] = useState("");
    const [month, setMonth] = useState("");
    const [principalRaw, setPrincipalRaw] = useState("");
    const [currentValuationRaw, setCurrentValuationRaw] = useState("");
    const [summary, setSummary] = useState("");
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newInvestmentRows, setNewInvestmentRows] = useState<NewInvestmentRow[]>([]);

    const principal = parseNumber(principalRaw);
    const currentValuation = parseNumber(currentValuationRaw);

    const newInvestmentKRWs = useMemo(
        () => newInvestmentRows.map((r) => toKRWForInvestment(r, 0, 0)),
        [newInvestmentRows],
    );
    const totalNewInvestment = useMemo(
        () => newInvestmentKRWs.reduce((acc, v) => acc + v, 0),
        [newInvestmentKRWs],
    );

    const adjustedPrincipal = principal - totalNewInvestment;
    const profit = currentValuation > 0 && adjustedPrincipal > 0 ? currentValuation - adjustedPrincipal : null;
    const profitRate = profit !== null && adjustedPrincipal > 0 ? (profit / adjustedPrincipal) * 100 : null;
    const isPositive = profit !== null ? profit >= 0 : true;

    const addNewInvestmentRow = useCallback(() => setNewInvestmentRows((prev) => [...prev, newInvestmentRow()]), []);
    const removeNewInvestmentRow = useCallback((id: string) => setNewInvestmentRows((prev) => prev.filter((r) => r.id !== id)), []);
    const updateNewInvestmentRow = useCallback(
        (id: string, patch: Partial<Omit<NewInvestmentRow, "id">>) =>
            setNewInvestmentRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
        [],
    );

    const handleSubmit = async (asDraft: boolean) => {
        if (!year.trim() || !month.trim()) {
            toast.error("연도와 월을 모두 선택해주세요.");
            return;
        }
        const yearNum = parseInt(year.trim(), 10);
        const monthNum = parseInt(month.trim(), 10);
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            toast.error("올바른 연도를 입력해주세요.");
            return;
        }
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            toast.error("올바른 월을 선택해주세요.");
            return;
        }
        const periodLabel = `${yearNum}-${String(monthNum).padStart(2, "0")}`;
        if (!asDraft) {
            const incompleteNewInv = newInvestmentRows.filter((r) => parseNumber(r.amount) <= 0);
            if (incompleteNewInv.length > 0) {
                toast.error("신규 투입금이 비어 있는 행이 있습니다. 금액을 입력하거나 해당 행을 삭제해 주세요.");
                return;
            }
        } else {
            const incompleteNewInv = newInvestmentRows.filter((r) => parseNumber(r.amount) <= 0);
            if (incompleteNewInv.length > 0) {
                toast.error("신규 투입금이 비어 있는 행이 있습니다. 금액을 입력하거나 해당 행을 삭제해 주세요.");
                return;
            }
        }
        setIsSubmitting(true);
        try {
            await createReport({
                type: "MONTHLY",
                profile: getProfileLabel(profile),
                status: asDraft ? "DRAFT" : "PUBLISHED",
                periodLabel,
                usdRate: 0,
                jpyRate: 0,
                totalInvestedKrw: principal,
                totalCurrentKrw: currentValuation,
                summary,
                journal: feedback,
                strategy: "",
                portfolioItems: [],
                newInvestments: newInvestmentRows
                    .filter((r) => parseNumber(r.amount) > 0)
                    .map((r) => ({
                        accountType: r.accountType,
                        originalCurrency: "KRW" as const,
                        originalAmount: parseNumber(r.amount),
                        krwAmount: parseNumber(r.amount),
                    })),
            });
            toast.success(asDraft ? "임시 저장되었습니다." : "월별 리포트가 저장되었습니다.");
            router.push(asDraft ? "/monthly" : "/");
        } catch (err) {
            console.error("[월별 리포트 저장 오류]", err);
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
                            className="rounded-md px-4 py-1.5 text-sm font-medium text-neutral-900 transition dark:text-neutral-100 bg-white shadow-sm dark:bg-neutral-900"
                        >
                            월별
                        </Link>
                        <Link
                            href="/reports/new/quarterly"
                            className="rounded-md px-4 py-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                            분기별
                        </Link>
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                        월별 리포트 작성
                    </h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        이번 달의 자금 흐름과 시장 흐름을 가볍게 기록하세요.
                    </p>
                </div>
                <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {getProfileLabel(profile)}
                    </span>
                </div>
            </div>

            {/* Section 1: 기본 정보 */}
            <FormSection label="기본 정보">
                <FormRow label="연도 · 월" sublabel="연도와 월을 선택하세요">
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
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className={inputCls}
                            style={{ width: "140px" }}
                        >
                            <option value="">월 선택</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <option key={m} value={String(m)}>
                                    {m}월
                                </option>
                            ))}
                        </select>
                    </div>
                </FormRow>
            </FormSection>

            {/* Section 2: 자금 현황 */}
            <FormSection label="자금 현황">
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
                <FormRow label="현재 총 평가금" sublabel="이번 달 말 기준 평가금">
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
                <FormRow label="신규 투입금" sublabel="이번 달 새로 추가한 금액">
                    <div className="space-y-2">
                        {newInvestmentRows.map((row) => (
                            <NewInvestmentRowItem
                                key={row.id}
                                row={row}
                                krwValue={toKRWForInvestment(row, 0, 0)}
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
            </FormSection>

            {/* 수익 요약 카드 */}
            {(currentValuation > 0 || principal > 0) && (
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
                                ? isPositive
                                    ? "text-emerald-400 dark:text-emerald-600"
                                    : "text-red-400 dark:text-red-500"
                                : "text-neutral-500"
                                }`}>
                                {profit !== null
                                    ? `${isPositive ? "+" : ""}${formatKRW(profit)}`
                                    : "—"}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">수익률</p>
                            <p className={`text-base font-bold ${profitRate !== null
                                ? isPositive
                                    ? "text-emerald-400 dark:text-emerald-600"
                                    : "text-red-400 dark:text-red-500"
                                : "text-neutral-500"
                                }`}>
                                {profitRate !== null
                                    ? `${isPositive ? "+" : ""}${profitRate.toFixed(2)}%`
                                    : "—"}
                            </p>
                        </div>
                        {totalNewInvestment > 0 && (
                            <div>
                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">신규 투입금</p>
                                <p className="text-base font-bold text-blue-400 dark:text-blue-600">
                                    {formatKRW(totalNewInvestment)}
                                </p>
                            </div>
                        )}
                    </div>
                    {totalNewInvestment > 0 && (
                        <p className="mt-3 text-[10px] text-neutral-500 dark:text-neutral-400">
                            * 신규 투입금 {formatKRW(totalNewInvestment)}은 수익 계산에서 제외됩니다.
                        </p>
                    )}
                </div>
            )}

            {/* Section 3: 회고록 */}
            <section className="mb-10">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    회고록
                </p>
                <div className="space-y-4">
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
                            : "bg-neutral-900 hover:bg-neutral-700 active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300",
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

function NewInvestmentRowItem({
    row, krwValue, onChange, onDelete,
}: {
    row: NewInvestmentRow;
    krwValue: number;
    onChange: (patch: Partial<Omit<NewInvestmentRow, "id">>) => void;
    onDelete: () => void;
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-blue-200/80 transition hover:ring-blue-300 dark:bg-neutral-900 dark:ring-blue-800 dark:hover:ring-blue-700">
            <div className="grid grid-cols-[150px_1fr_36px] items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-1">
                    <select
                        value={row.accountType}
                        onChange={(e) => {
                            const newType = e.target.value as Exclude<AccountType, "CASH">;
                            onChange({ accountType: newType });
                        }}
                        className="w-full rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-neutral-700 ring-1 ring-blue-200/80 outline-none transition focus:ring-2 focus:ring-blue-400 dark:bg-blue-900/30 dark:text-neutral-200 dark:ring-blue-700"
                    >
                        {(Object.keys(MONTHLY_ACCOUNT_LABELS) as Exclude<AccountType, "CASH">[]).map((k) => (
                            <option key={k} value={k}>{MONTHLY_ACCOUNT_LABELS[k]}</option>
                        ))}
                    </select>
                </div>

                <div className="relative flex items-center">
                    <input
                        type="number"
                        min={0}
                        value={row.amount}
                        onChange={(e) => onChange({ amount: e.target.value })}
                        placeholder="신규 투자금액 입력"
                        className="no-spinner w-full rounded-xl bg-blue-50 px-3 py-2 pr-16 text-right text-sm text-neutral-900 placeholder:text-neutral-300 ring-1 ring-blue-200/80 outline-none transition focus:ring-2 focus:ring-blue-400 dark:bg-blue-900/30 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:ring-blue-700"
                    />
                    <span className="pointer-events-none absolute right-9 text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                        KRW
                    </span>
                    <div className="absolute right-0 flex h-full flex-col overflow-hidden rounded-r-xl border-l border-blue-200 dark:border-blue-700">
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => {
                                const v = parseFloat(row.amount) || 0;
                                onChange({ amount: String(v + 1) });
                            }}
                            className="flex flex-1 items-center justify-center px-1.5 text-neutral-600 transition hover:bg-blue-100 dark:text-neutral-300 dark:hover:bg-blue-800"
                        >
                            <svg width="8" height="5" viewBox="0 0 10 6" fill="none">
                                <path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div className="h-px bg-blue-200 dark:bg-blue-700" />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => {
                                const v = parseFloat(row.amount) || 0;
                                if (v > 0) onChange({ amount: String(v - 1) });
                            }}
                            className="flex flex-1 items-center justify-center px-1.5 text-neutral-600 transition hover:bg-blue-100 dark:text-neutral-300 dark:hover:bg-blue-800"
                        >
                            <svg width="8" height="5" viewBox="0 0 10 6" fill="none">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onDelete}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-300 transition hover:bg-red-50 hover:text-red-400 dark:text-neutral-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
