"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownAZ,
  ChevronDown,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  NativeNestedList,
  type ListItem,
} from "@/components/ui/native-nested-list";
import { cn } from "@/lib/utils";

export type HoldingSortKey =
  | "profit-rate-desc"
  | "profit-rate-asc"
  | "value-desc"
  | "value-asc"
  | "daily-rate-desc"
  | "name-asc";

export const HOLDING_SORT_OPTIONS: { value: HoldingSortKey; label: string }[] = [
  { value: "profit-rate-desc", label: "총 수익률 높은순" },
  { value: "profit-rate-asc", label: "총 수익률 낮은 순" },
  { value: "value-desc", label: "평가금 높은 순" },
  { value: "value-asc", label: "평가금 낮은 순" },
  { value: "daily-rate-desc", label: "일간 수익률 높은 순" },
  { value: "name-asc", label: "가나다 순" },
];

export const DEFAULT_HOLDING_SORT: HoldingSortKey = "value-desc";

const SORT_ICONS: Record<HoldingSortKey, ReactNode> = {
  "profit-rate-desc": <TrendingUp className="h-4 w-4 text-green-500" />,
  "profit-rate-asc": <TrendingDown className="h-4 w-4 text-red-500" />,
  "value-desc": <DollarSign className="h-4 w-4 text-blue-500" />,
  "value-asc": <DollarSign className="h-4 w-4 text-muted-foreground" />,
  "daily-rate-desc": <TrendingUp className="h-4 w-4 text-emerald-500" />,
  "name-asc": <ArrowDownAZ className="h-4 w-4 text-violet-500" />,
};

export function HoldingSortSelect({
  sortKey,
  onSortChange,
  disabled,
}: {
  sortKey: HoldingSortKey;
  onSortChange: (value: HoldingSortKey) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const label =
    HOLDING_SORT_OPTIONS.find((option) => option.value === sortKey)?.label ??
    "평가금 높은 순";

  const items = useMemo<ListItem[]>(
    () =>
      HOLDING_SORT_OPTIONS.map((option) => ({
        id: option.value,
        label: option.label,
        icon: SORT_ICONS[option.value],
        onClick: (e) => {
          e.stopPropagation();
          onSortChange(option.value);
          setOpen(false);
        },
      })),
    [onSortChange],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50 sm:text-sm",
          open && "text-foreground",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="보유 종목 정렬"
      >
        <span>{label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="inline-flex"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-background p-3 shadow-md"
            role="listbox"
            aria-label="정렬 옵션"
          >
            <NativeNestedList
              items={items}
              activeId={sortKey}
              size="sm"
              showExpandIcon={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
