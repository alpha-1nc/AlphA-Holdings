"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import type { WorkspaceProfile } from "@/lib/profile";
import { addWatchlistItem, updateWatchlistItem } from "@/app/actions/watchlist";
import { AppModal } from "@/components/ui/app-modal";
import {
  TickerSearchInput,
  type TickerSearchChangeMeta,
} from "@/components/dashboard/ticker-search-input";
import { cn } from "@/lib/utils";
import "@/components/dashboard/account-glass-switcher.css";

export const STATUS_OPTIONS = ["관심", "매수검토", "편입", "보류"] as const;
export type StatusTag = (typeof STATUS_OPTIONS)[number];

const BULLET_PLACEHOLDER = `예:\n실적 모멘텀 유지\n밸류에이션 여력`;

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm text-foreground transition-colors focus:outline-none md:text-[0.9375rem]";

const PRIMARY_ACTION_CLASS =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 md:text-[0.9375rem]";

export type WatchlistEditItem = {
  id: string;
  ticker: string;
  companyName: string;
  tag: string;
  interestReason: string | null;
  riskNotes: string | null;
};

export function normalizeWatchlistStatus(tag: string): StatusTag {
  const legacy: Record<string, string> = { 보유중: "편입", 매도검토: "보류" };
  const mapped = legacy[tag] ?? tag;
  if ((STATUS_OPTIONS as readonly string[]).includes(mapped)) {
    return mapped as StatusTag;
  }
  return "관심";
}

function emptyFormValues(): {
  ticker: string;
  companyName: string;
  tag: StatusTag;
  interestReason: string;
  riskNotes: string;
} {
  return {
    ticker: "",
    companyName: "",
    tag: "관심",
    interestReason: "",
    riskNotes: "",
  };
}

function itemToFormValues(item: WatchlistEditItem) {
  return {
    ticker: item.ticker,
    companyName: item.companyName,
    tag: normalizeWatchlistStatus(item.tag),
    interestReason: item.interestReason ?? "",
    riskNotes: item.riskNotes ?? "",
  };
}

async function resolveCompanyNameFromTicker(ticker: string): Promise<string | null> {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) return null;

  try {
    const res = await fetch(
      `/api/search-ticker?q=${encodeURIComponent(normalized)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ symbol: string; name: string }>;
    };
    const results = data.results ?? [];
    const exact = results.find((r) => r.symbol.toUpperCase() === normalized);
    return exact?.name ?? results[0]?.name ?? null;
  } catch {
    return null;
  }
}

function TagSwitcher({
  value,
  onChange,
}: {
  value: StatusTag;
  onChange: (next: StatusTag) => void;
}) {
  const activeIndex = Math.max(0, STATUS_OPTIONS.indexOf(value));

  return (
    <div
      className="ag-switcher w-fit max-w-full shrink overflow-x-auto"
      data-idx={activeIndex}
      role="tablist"
      aria-label="상태 선택"
      style={
        {
          "--ag-idx": activeIndex,
          "--ag-count": STATUS_OPTIONS.length,
        } as CSSProperties
      }
    >
      <span className="ag-switcher__indicator" aria-hidden />
      {STATUS_OPTIONS.map((t) => {
        const active = t === value;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            className="ag-switcher__option"
            onClick={() => onChange(t)}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

type WatchlistFormProps = {
  ticker: string;
  companyName: string;
  tag: StatusTag;
  interestReason: string;
  riskNotes: string;
  onTickerChange: (value: string, meta?: TickerSearchChangeMeta) => void;
  onCompanyNameChange: (value: string) => void;
  onTagChange: (value: StatusTag) => void;
  onInterestReasonChange: (value: string) => void;
  onRiskNotesChange: (value: string) => void;
};

function WatchlistForm({
  ticker,
  companyName,
  tag,
  interestReason,
  riskNotes,
  onTickerChange,
  onCompanyNameChange,
  onTagChange,
  onInterestReasonChange,
  onRiskNotesChange,
}: WatchlistFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
          티커 *
        </label>
        <TickerSearchInput
          value={ticker}
          onChange={onTickerChange}
          placeholder="NVDA 또는 회사명 검색"
          inputClassName={INPUT_CLASS}
        />
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground/75 md:text-[0.8125rem]">
          검색 후 선택하면 티커와 종목명이 자동으로 채워집니다. 직접 입력도 가능합니다.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
          종목명 (선택)
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          placeholder="NVIDIA Corporation"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
          상태
        </label>
        <TagSwitcher value={tag} onChange={onTagChange} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
          관심 이유 (선택)
        </label>
        <p className="mb-2 text-xs leading-snug text-muted-foreground/80 md:text-[0.8125rem]">
          한 줄에 한 항목씩 입력하면 글머리 목록으로 보입니다. 줄 앞의 •, -, * 는 자동으로 정리됩니다.
        </p>
        <textarea
          value={interestReason}
          onChange={(e) => onInterestReasonChange(e.target.value)}
          placeholder={BULLET_PLACEHOLDER}
          rows={4}
          className={cn(INPUT_CLASS, "min-h-[6.5rem] resize-y md:text-base")}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
          리스크 (선택)
        </label>
        <p className="mb-2 text-xs leading-snug text-muted-foreground/80 md:text-[0.8125rem]">
          한 줄에 한 항목씩 입력하면 글머리 목록으로 보입니다.
        </p>
        <textarea
          value={riskNotes}
          onChange={(e) => onRiskNotesChange(e.target.value)}
          placeholder={BULLET_PLACEHOLDER}
          rows={4}
          className={cn(INPUT_CLASS, "min-h-[6.5rem] resize-y md:text-base")}
        />
      </div>
    </div>
  );
}

export type WatchlistItemModalProps = {
  open: boolean;
  mode: "add" | "edit";
  profileId: WorkspaceProfile;
  editItem?: WatchlistEditItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export function WatchlistItemModal({
  open,
  mode,
  profileId,
  editItem,
  onClose,
  onSaved,
}: WatchlistItemModalProps) {
  const [ticker, setTicker] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [tag, setTag] = useState<StatusTag>("관심");
  const [interestReason, setInterestReason] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editItem) {
      const v = itemToFormValues(editItem);
      setTicker(v.ticker);
      setCompanyName(v.companyName);
      setTag(v.tag);
      setInterestReason(v.interestReason);
      setRiskNotes(v.riskNotes);
    } else {
      const v = emptyFormValues();
      setTicker(v.ticker);
      setCompanyName(v.companyName);
      setTag(v.tag);
      setInterestReason(v.interestReason);
      setRiskNotes(v.riskNotes);
    }
  }, [open, mode, editItem]);

  async function handleSubmit() {
    if (!ticker.trim()) return;
    setLoading(true);
    try {
      const normalizedTicker = ticker.trim().toUpperCase();
      let resolvedCompanyName = companyName.trim();

      if (
        !resolvedCompanyName ||
        resolvedCompanyName.toUpperCase() === normalizedTicker
      ) {
        const lookedUp = await resolveCompanyNameFromTicker(normalizedTicker);
        resolvedCompanyName = lookedUp ?? normalizedTicker;
      }

      const payload = {
        ticker: normalizedTicker,
        companyName: resolvedCompanyName,
        tag,
        interestReason: interestReason.trim() || undefined,
        riskNotes: riskNotes.trim() || undefined,
      };

      if (mode === "add") {
        await addWatchlistItem(profileId, payload);
      } else if (editItem) {
        await updateWatchlistItem(editItem.id, {
          ticker: payload.ticker,
          companyName: payload.companyName,
          tag: payload.tag,
          interestReason: payload.interestReason ?? null,
          riskNotes: payload.riskNotes ?? null,
        });
      }
      onSaved();
      onClose();
    } catch {
      toast.error(
        mode === "add"
          ? "종목 추가에 실패했습니다. 같은 티커가 이미 있을 수 있습니다."
          : "저장에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "add" ? "종목 추가" : "종목 수정";
  const submitLabel = mode === "add" ? (loading ? "추가 중..." : "추가") : loading ? "저장 중..." : "저장";

  function handleTickerChange(next: string, meta?: TickerSearchChangeMeta) {
    setTicker(next.toUpperCase());
    if (meta?.source === "select" && meta.displayName) {
      setCompanyName(meta.displayName);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      disableClose={loading}
      footer={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !ticker.trim()}
          className={PRIMARY_ACTION_CLASS}
        >
          {submitLabel}
        </button>
      }
    >
      <WatchlistForm
        ticker={ticker}
        companyName={companyName}
        tag={tag}
        interestReason={interestReason}
        riskNotes={riskNotes}
        onTickerChange={handleTickerChange}
        onCompanyNameChange={setCompanyName}
        onTagChange={setTag}
        onInterestReasonChange={setInterestReason}
        onRiskNotesChange={setRiskNotes}
      />
    </AppModal>
  );
}
