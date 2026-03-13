"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";

import { getTickerDomain } from "@/lib/ticker-metadata";

export interface TickerSearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: "stock" | "etf";
    region: "US" | "KR" | "JP";
    currency: "USD" | "KRW" | "JPY";
    domain?: string;
}

/* ── Logo ────────────────────────────────────────────────────────────────*/
export function TickerLogo({
    symbol,
    region,
    size = 28,
}: {
    symbol: string;
    region?: string;
    size?: number;
}) {
    const [imgOk, setImgOk] = useState(false);
    const [imgError, setImgError] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        // symbol 변경 시 이미지 상태 초기화
        setImgOk(false);
        setImgError(false);
        return () => { mountedRef.current = false; };
    }, [symbol]);

    // ticker-metadata.ts에 domain이 명시적으로 등록된 경우에만 src 생성
    const domain = getTickerDomain(symbol);
    const src = domain ? `https://unavatar.io/${domain}?fallback=false` : null;

    const initials = symbol.replace(/[^A-Z0-9]/gi, "").slice(0, 2).toUpperCase();
    const bgCls =
        region === "KR" ? "bg-red-50 text-red-500 dark:bg-red-950/60 dark:text-red-400" :
        region === "JP" ? "bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400" :
        "bg-blue-50 text-blue-500 dark:bg-blue-950/60 dark:text-blue-400";

    // domain 없거나 이미지 에러 → <img> 마운트하지 않음
    const mountImg = Boolean(src && !imgError);

    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/10 ${bgCls}`}
            style={{ width: size, height: size, fontSize: Math.floor(size * 0.3) }}
        >
            <span className="absolute inset-0 flex items-center justify-center font-bold select-none">
                {initials}
            </span>
            {mountImg && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    key={src}
                    src={src!}
                    alt=""
                    aria-hidden
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${imgOk ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => { if (mountedRef.current) setImgOk(true); }}
                    onError={() => { if (mountedRef.current) setImgError(true); }}
                />
            )}
        </span>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   TickerSearchInput
   - Portal 없음: 부모가 overflow:visible 이어야 함
   - 드롭다운은 absolute로 input 바로 아래 렌더링
   - 여러 번 검색 가능, accountType 변경 시 자동 초기화
══════════════════════════════════════════════════════════════════════════ */
interface TickerSearchInputProps {
    value: string;
    onChange: (ticker: string) => void;
    accountType?: string;
    placeholder?: string;
}

const REGION_ICONS: Record<string, React.ReactNode> = { 
    US: <Globe className="h-3 w-3" />, 
    KR: <Globe className="h-3 w-3" />, 
    JP: <Globe className="h-3 w-3" /> 
};

export function TickerSearchInput({
    value,
    onChange,
    accountType,
    placeholder = "종목 검색...",
}: TickerSearchInputProps) {
    const [inputVal, setInputVal] = useState(value);
    const [results, setResults] = useState<TickerSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    // 선택된 종목 메타 (로고 표시용)
    const [selectedMeta, setSelectedMeta] = useState<{ symbol: string; region: string } | null>(null);

    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    // 현재 진행 중인 fetch를 취소하기 위한 AbortController
    const abortRef = useRef<AbortController | null>(null);
    // onChange 콜백을 ref로 저장하여 accountType 변경 시 안전하게 호출
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    // 외부에서 value가 바뀌면 inputVal 동기화
    useEffect(() => {
        setInputVal(value);
        if (!value) {
            setSelectedMeta(null);
            setResults([]);
            setIsOpen(false);
        }
    }, [value]);

    // accountType이 *변경*되었을 때만 검색어 및 결과 초기화 (초기 마운트 시에는 실행하지 않음)
    const prevAccountTypeRef = useRef(accountType);
    useEffect(() => {
        if (prevAccountTypeRef.current !== accountType) {
            prevAccountTypeRef.current = accountType;
            setInputVal("");
            setResults([]);
            setIsOpen(false);
            setIsLoading(false);
            setSelectedMeta(null);
            setActiveIdx(-1);
            onChangeRef.current("");
            if (abortRef.current) abortRef.current.abort();
            clearTimeout(debounceRef.current);
        }
    }, [accountType]);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    /* ── Search ──────────────────────────────────────────────────────────*/
    const doSearch = useCallback(async (q: string, acct?: string) => {
        // 이전 요청 취소
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        if (!q.trim()) {
            setResults([]);
            setIsLoading(false);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        setIsOpen(true);

        try {
            const params = new URLSearchParams({ q: q.trim() });
            if (acct && acct !== "CASH") params.set("account", acct);
            const res = await fetch(`/api/search-ticker?${params.toString()}`, {
                signal: controller.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setResults(Array.isArray(data.results) ? data.results : []);
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") return;
            console.error("[TickerSearch] fetch error:", err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /* ── Input change ────────────────────────────────────────────────────*/
    const handleChange = (v: string) => {
        setInputVal(v);
        setActiveIdx(-1);
        onChange(v); // 직접 입력 시에도 부모에 반영

        clearTimeout(debounceRef.current);

        if (!v.trim()) {
            // 입력 지우면 즉시 닫기 + 결과 초기화
            setResults([]);
            setIsOpen(false);
            setIsLoading(false);
            if (abortRef.current) abortRef.current.abort();
            return;
        }

        // 250ms 디바운스 후 검색
        debounceRef.current = setTimeout(() => {
            doSearch(v, accountType);
        }, 250);
    };

    /* ── Select ──────────────────────────────────────────────────────────*/
    const handleSelect = (t: TickerSearchResult) => {
        onChange(t.symbol);
        setInputVal(t.symbol);
        setSelectedMeta({ symbol: t.symbol, region: t.region });
        setIsOpen(false);
        setResults([]);
        setActiveIdx(-1);
        // 다음 검색을 위해 input focus 유지
        inputRef.current?.blur();
    };

    /* ── Keyboard ────────────────────────────────────────────────────────*/
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx(p => Math.min(p + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx(p => Math.max(p - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIdx >= 0 && results[activeIdx]) {
                handleSelect(results[activeIdx]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const showDropdown = isOpen && (isLoading || results.length > 0 || inputVal.trim().length > 0);

    return (
        <div ref={wrapRef} className="relative w-full">
            {/* Input row */}
            <div className="flex items-center gap-2">
                {selectedMeta && value === selectedMeta.symbol && (
                    <TickerLogo symbol={selectedMeta.symbol} region={selectedMeta.region} size={22} />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputVal}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={placeholder}
                    onChange={e => handleChange(e.target.value)}
                    onFocus={() => {
                        // 포커스 시 기존 값이 있으면 다시 검색
                        if (inputVal.trim()) {
                            doSearch(inputVal, accountType);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none ring-1 ring-neutral-200/80 transition placeholder:text-neutral-300 focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700 dark:placeholder:text-neutral-600 dark:focus:ring-neutral-500"
                />
            </div>

            {/* Dropdown — absolute, 부모 overflow:visible 필요 */}
            {showDropdown && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-5">
                            <svg className="h-4 w-4 animate-spin text-neutral-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span className="text-sm text-neutral-400">검색 중...</span>
                        </div>
                    ) : results.length > 0 ? (
                        <ul className="max-h-[240px] overflow-y-auto py-1">
                            {results.map((t, idx) => (
                                <li key={`${t.symbol}-${t.exchange}-${idx}`}>
                                    <button
                                        type="button"
                                        onMouseDown={e => { e.preventDefault(); handleSelect(t); }}
                                        onMouseEnter={() => setActiveIdx(idx)}
                                        className={[
                                            "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                                            activeIdx === idx
                                                ? "bg-neutral-100 dark:bg-neutral-800"
                                                : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                                        ].join(" ")}
                                    >
                                        <TickerLogo symbol={t.symbol} region={t.region} size={30} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
                                                    {t.symbol}
                                                </span>
                                                {t.type === "etf" && (
                                                    <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                                                        ETF
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                                    {REGION_ICONS[t.region]}
                                                    {t.exchange}
                                                </span>
                                            </div>
                                            <div className="truncate text-xs leading-tight text-neutral-500 dark:text-neutral-400">
                                                {t.name}
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : inputVal.trim() ? (
                        <div className="px-4 py-5 text-center">
                            <p className="text-sm text-neutral-400">검색 결과가 없습니다</p>
                            <p className="mt-0.5 text-xs text-neutral-500">다른 키워드로 검색하거나 직접 입력하세요</p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
