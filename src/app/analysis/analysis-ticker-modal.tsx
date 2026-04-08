"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { generateAnalysisAction } from "@/app/actions/generate-analysis";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TICKER_INPUT_RE = /^[A-Za-z][A-Za-z0-9.\-]{0,14}$/;

function isValidTickerToken(s: string): boolean {
  return TICKER_INPUT_RE.test(s.trim()) && s.trim().length > 0;
}

type AnalysisTickerModalProps = {
  onLoadingChange?: (loading: boolean, ticker?: string) => void;
};

export default function AnalysisTickerModal({
  onLoadingChange,
}: AnalysisTickerModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [apiResults, setApiResults] = useState<
    { symbol: string; name: string }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const q = query.trim();
  const qUpper = q.toUpperCase();

  useEffect(() => {
    if (!q) {
      setApiResults([]);
      setSearchLoading(false);
      return;
    }

    const ac = new AbortController();
    const t = window.setTimeout(() => {
      setSearchLoading(true);
      fetch(`/api/search-ticker?q=${encodeURIComponent(q)}`, {
        signal: ac.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("search failed");
          const data = (await res.json()) as {
            results?: { symbol: string; name: string }[];
          };
          setApiResults(data.results ?? []);
        })
        .catch(() => {
          if (!ac.signal.aborted) setApiResults([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setSearchLoading(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(t);
      ac.abort();
      setSearchLoading(false);
    };
  }, [q]);

  const rows = useMemo(() => {
    type Row =
      | { kind: "primary"; symbol: string }
      | { kind: "suggest"; symbol: string; name: string };

    const out: Row[] = [];

    if (isValidTickerToken(q)) {
      out.push({ kind: "primary", symbol: qUpper });
    }

    const seen = new Set<string>();
    if (out[0]?.kind === "primary") seen.add(out[0].symbol);

    for (const t of apiResults) {
      if (out.length >= 1 + 12) break;
      if (seen.has(t.symbol)) continue;
      seen.add(t.symbol);
      out.push({ kind: "suggest", symbol: t.symbol, name: t.name });
    }

    return out;
  }, [q, qUpper, apiResults]);

  useEffect(() => {
    setHighlight(0);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const runAnalysis = useCallback(
    (ticker: string) => {
      onLoadingChange?.(true, ticker);
      close();
      startTransition(async () => {
        let endLoading = true;
        try {
          const result = await generateAnalysisAction(ticker);
          if (result.success && result.slug && result.year && result.month) {
            endLoading = false;
            toast.success("분석 리포트가 생성되었습니다.");
            router.push(`/analysis/${result.year}/${result.month}/${result.slug}`);
            router.refresh();
            return;
          }
          toast.error(result.error ?? "분석 생성에 실패했습니다.");
        } finally {
          if (endLoading) onLoadingChange?.(false);
        }
      });
    },
    [close, onLoadingChange, router],
  );

  const onSubmitRow = (index: number) => {
    const row = rows[index];
    if (!row || pending) return;
    runAnalysis(row.symbol);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        + Add Analysis
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "max-w-[min(100vw-2rem,32rem)] gap-0 overflow-hidden p-0",
            "rounded-2xl border border-neutral-200/90 bg-white shadow-2xl",
            "dark:border-neutral-700/90 dark:bg-neutral-950",
            "sm:max-w-lg",
          )}
        >
          <DialogTitle className="sr-only">티커 검색</DialogTitle>
          <DialogDescription className="sr-only">
            회사명 또는 티커로 검색한 뒤 항목을 선택하면 분석 리포트를 생성합니다.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b border-neutral-200/80 px-3 py-2.5 dark:border-neutral-800">
            <Search
              className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search ticker, e.g. GOOGL"
              value={query}
              disabled={pending}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) =>
                    rows.length ? Math.min(h + 1, rows.length - 1) : 0,
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (rows.length === 0 && isValidTickerToken(q)) {
                    runAnalysis(qUpper);
                  } else {
                    onSubmitRow(highlight);
                  }
                }
              }}
              className={cn(
                "min-w-0 flex-1 border-0 bg-transparent py-1 text-base text-neutral-900 outline-none",
                "placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500",
              )}
            />
          </div>

          <ul
            className="max-h-[min(50vh,18rem)] overflow-y-auto py-1"
            role="listbox"
            aria-label="검색 결과"
          >
            {rows.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {!q
                  ? "티커 또는 회사명을 입력하세요."
                  : searchLoading
                    ? "검색 중…"
                    : "일치하는 제안이 없습니다. 영문 티커를 입력한 뒤 Enter로 분석을 시작할 수 있습니다."}
              </li>
            ) : (
              rows.map((row, i) => {
                const isPrimary = row.kind === "primary";
                const title = isPrimary
                  ? `분석 생성 — ${row.symbol}`
                  : row.symbol;
                const sub = isPrimary
                  ? "입력한 심볼로 리포트 생성"
                  : row.name;

                return (
                  <li key={`${row.kind}-${row.symbol}-${i}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === highlight}
                      disabled={pending}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => onSubmitRow(i)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors",
                        i === highlight
                          ? "bg-neutral-100 dark:bg-neutral-800/90"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/80",
                      )}
                    >
                      <span className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        {title}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {sub}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {pending && (
            <div className="border-t border-neutral-200/80 px-4 py-2 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              분석 중… 잠시만 기다려 주세요.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
