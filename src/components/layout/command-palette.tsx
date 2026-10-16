"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Loader2,
  Moon,
  PenLine,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AccountType, Holding } from "@/generated/prisma";
import { useTheme } from "@/components/layout/theme-provider";
import { StockLogo } from "@/components/stock/stock-logo";
import { MAIN_NAV_ITEMS } from "@/lib/nav-items";
import { filterValuedHoldings } from "@/lib/profit";
import { cn } from "@/lib/utils";

const overlayTransition: Transition = { duration: 0.24, ease: "easeOut" };

const HOLDING_ACCOUNT_BADGE: Record<AccountType, string> = {
  US_DIRECT: "미국",
  KR_DIRECT: "한국",
  JP_DIRECT: "일본",
  ISA: "ISA",
  PENSION: "연금저축",
  CASH: "현금",
};

type NavCommand = {
  kind: "nav";
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  searchText: string;
};

type HoldingCommand = {
  kind: "holding";
  id: string;
  holdingId: string;
  ticker: string;
  name: string;
  accountType: AccountType;
  searchText: string;
};

type ActionCommand = {
  kind: "action";
  id: string;
  label: string;
  icon: LucideIcon;
  searchText: string;
  run: () => void | Promise<void>;
  loading?: boolean;
};

type CommandItem = NavCommand | HoldingCommand | ActionCommand;

type CommandGroup = {
  key: "nav" | "holding" | "action";
  label: string;
  items: CommandItem[];
};

function matchesQuery(searchText: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return searchText.toLowerCase().includes(q);
}

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

type CommandPaletteProps = {
  triggerClassName?: string;
};

export function CommandPalette({ triggerClassName }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "동기화 실패");
      toast.success("동기화 완료");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "동기화 중 오류");
    } finally {
      setSyncing(false);
    }
  }, []);

  const navItems: NavCommand[] = useMemo(
    () =>
      MAIN_NAV_ITEMS.map((item) => ({
        kind: "nav" as const,
        id: `nav-${item.href}`,
        href: item.href,
        label: item.shellLabel,
        icon: item.icon,
        searchText: `${item.shellLabel} ${item.label} ${item.shortLabel} ${item.href}`,
      })),
    [],
  );

  const holdingItems: HoldingCommand[] = useMemo(
    () =>
      filterValuedHoldings(holdings).map((h) => ({
        kind: "holding" as const,
        id: `holding-${h.id}`,
        holdingId: h.id,
        ticker: h.ticker,
        name: h.name ?? h.ticker,
        accountType: h.accountType,
        searchText: `${h.name ?? h.ticker} ${h.ticker} ${HOLDING_ACCOUNT_BADGE[h.accountType]}`,
      })),
    [holdings],
  );

  const actionItems: ActionCommand[] = useMemo(
    () => [
      {
        kind: "action" as const,
        id: "action-journal-new",
        label: "새 일지 작성",
        icon: PenLine,
        searchText: "새 일지 작성 journal new",
        run: () => router.push("/journal/new"),
      },
      {
        kind: "action" as const,
        id: "action-sync",
        label: "데이터 동기화",
        icon: RefreshCw,
        searchText: "데이터 동기화 sync refresh",
        loading: syncing,
        run: handleSync,
      },
      {
        kind: "action" as const,
        id: "action-theme",
        label: theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환",
        icon: Moon,
        searchText: "다크모드 라이트모드 theme dark light",
        run: toggleTheme,
      },
    ],
    [router, handleSync, syncing, theme, toggleTheme],
  );

  const groups: CommandGroup[] = useMemo(() => {
    const q = query.trim();
    const filter = <T extends CommandItem>(items: T[]) =>
      q ? items.filter((item) => matchesQuery(item.searchText, q)) : items;

    return [
      { key: "nav" as const, label: "이동", items: filter(navItems) },
      { key: "holding" as const, label: "내 종목", items: filter(holdingItems) },
      { key: "action" as const, label: "액션", items: filter(actionItems) },
    ].filter((group) => group.items.length > 0);
  }, [query, navItems, holdingItems, actionItems]);

  const indexedGroups = useMemo(() => {
    let index = 0;
    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        const current = index;
        index += 1;
        return { item, index: current };
      }),
    }));
  }, [groups]);

  const flatItems = useMemo(
    () => indexedGroups.flatMap((group) => group.items.map(({ item }) => item)),
    [indexedGroups],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    setHoldingsLoading(true);
    fetch("/api/holdings")
      .then((res) => (res.ok ? res.json() : { holdings: [] }))
      .then((data) => setHoldings(data.holdings ?? []))
      .catch(() => setHoldings([]))
      .finally(() => setHoldingsLoading(false));
  }, [isOpen]);

  const executeItem = useCallback(
    async (item: CommandItem) => {
      if (item.kind === "nav") {
        router.push(item.href);
        close();
        return;
      }
      if (item.kind === "holding") {
        router.push(`/holdings?open=${encodeURIComponent(item.holdingId)}`);
        close();
        return;
      }
      if (item.kind === "action") {
        if (item.id === "action-sync" && syncing) return;
        await item.run();
        close();
      }
    },
    [router, close, syncing],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (flatItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % flatItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatItems[activeIndex];
        if (item) void executeItem(item);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems, activeIndex, close, executeItem]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-command-index="${activeIndex}"]`,
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const panelVariants: Variants = shouldReduceMotion
    ? {
        initial: { opacity: 0, y: 0, scale: 1 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 0, scale: 1 },
      }
    : {
        initial: { opacity: 0, scale: 0.96, y: 20, filter: "blur(6px)" },
        animate: {
          opacity: 1,
          scale: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.28, ease: [0.18, 0.89, 0.32, 1.12] },
        },
        exit: {
          opacity: 0,
          scale: 0.97,
          y: 12,
          filter: "blur(8px)",
          transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
        },
      };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="검색 또는 이동"
        className={cn("flex items-center justify-center", triggerClassName)}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
      >
        <Search className="h-[22px] w-[22px]" strokeWidth={1.8} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              aria-hidden
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={overlayTransition}
              onClick={close}
            />

            <div className="fixed inset-0 z-[65] flex items-start justify-center px-4 pt-24 sm:px-6">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="명령 팔레트"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={panelVariants}
                className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/60 bg-card/90 backdrop-blur-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <motion.div
                    className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-[150px]"
                    animate={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: [0.25, 0.55, 0.25], scale: [0.92, 1.08, 0.98] }
                    }
                    transition={
                      shouldReduceMotion
                        ? undefined
                        : { duration: 8, repeat: Infinity, ease: "easeInOut" }
                    }
                  />
                  <motion.div
                    className="absolute bottom-[-30%] right-[-5%] h-72 w-72 rounded-full bg-emerald-400/20 blur-[160px]"
                    animate={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: [0.2, 0.5, 0.2], rotate: [0, 12, 0] }
                    }
                    transition={
                      shouldReduceMotion
                        ? undefined
                        : { duration: 10, repeat: Infinity, ease: "linear" }
                    }
                  />
                </div>

                <div className="relative flex items-center gap-3 border-b border-border/60 px-5 py-4">
                  <Search className="h-5 w-5 text-foreground" aria-hidden />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="검색 또는 이동…"
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <motion.button
                    type="button"
                    onClick={close}
                    aria-label="닫기"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
                    whileHover={shouldReduceMotion ? undefined : { rotate: 90, scale: 1.05 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </motion.button>
                </div>

                <motion.div
                  ref={listRef}
                  className="relative max-h-96 overflow-y-auto px-2 py-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {holdingsLoading && holdingItems.length === 0 && !query.trim() ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      보유 종목 불러오는 중…
                    </div>
                  ) : flatItems.length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-white/5 p-6 text-center text-sm text-muted-foreground backdrop-blur">
                      결과 없음
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {indexedGroups.map((group) => (
                        <div key={group.key}>
                          <GroupLabel>{group.label}</GroupLabel>
                          <ul className="space-y-1" role="list">
                            {group.items.map(({ item, index }) => {
                              const isActive = index === activeIndex;

                              return (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    data-command-index={index}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => void executeItem(item)}
                                    className={cn(
                                      "group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                                      isActive
                                        ? "border-border bg-white/10"
                                        : "border-transparent bg-white/5 hover:border-border hover:bg-white/10",
                                    )}
                                  >
                                    {item.kind === "nav" && (
                                      <>
                                        <div className="flex min-w-0 items-center gap-3">
                                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background shadow-sm">
                                            <item.icon
                                              className="h-[18px] w-[18px] text-foreground/80"
                                              strokeWidth={1.75}
                                            />
                                          </span>
                                          <span className="truncate text-sm font-medium text-foreground">
                                            {item.label}
                                          </span>
                                        </div>
                                      </>
                                    )}

                                    {item.kind === "holding" && (
                                      <>
                                        <div className="flex min-w-0 items-center gap-3">
                                          <StockLogo ticker={item.ticker} size={40} />
                                          <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm font-medium text-foreground">
                                              {item.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {item.ticker}
                                            </span>
                                          </div>
                                        </div>
                                        <span className="ml-3 shrink-0 rounded-full border border-border/40 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          {HOLDING_ACCOUNT_BADGE[item.accountType]}
                                        </span>
                                      </>
                                    )}

                                    {item.kind === "action" && (
                                      <>
                                        <div className="flex min-w-0 items-center gap-3">
                                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background shadow-sm">
                                            {item.loading ? (
                                              <Loader2
                                                className="h-[18px] w-[18px] animate-spin text-muted-foreground"
                                                aria-hidden
                                              />
                                            ) : (
                                              <item.icon
                                                className="h-[18px] w-[18px] text-foreground/80"
                                                strokeWidth={1.75}
                                              />
                                            )}
                                          </span>
                                          <span className="truncate text-sm font-medium text-foreground">
                                            {item.label}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
