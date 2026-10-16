"use client";

import { useEffect, useState, useMemo, type CSSProperties } from "react";
import { Plus } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile";
import type { WorkspaceProfile } from "@/lib/profile";
import { getWatchlistItems, deleteWatchlistItem } from "@/app/actions/watchlist";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WatchlistCard } from "@/components/watchlist/watchlist-card";
import {
  WatchlistItemModal,
  normalizeWatchlistStatus,
  STATUS_OPTIONS,
  type StatusTag,
  type WatchlistEditItem,
} from "@/components/watchlist/watchlist-item-modal";
import { getWatchlistStatusStyle } from "@/components/watchlist/watchlist-status-style";
import { cn } from "@/lib/utils";
import "@/components/dashboard/account-glass-switcher.css";

const STATUS_FILTERS = ["전체", ...STATUS_OPTIONS] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const PRIMARY_ACTION_CLASS =
  "inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 active:scale-[0.98] md:px-[1.125rem] md:text-[0.9375rem]";

type WatchlistItem = {
  id: string;
  ticker: string;
  companyName: string;
  logoUrl: string | null;
  interestReason: string | null;
  riskNotes: string | null;
  tag: string;
  addedAt: Date;
};

type ModalState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; item: WatchlistEditItem };

function StatusFilterSwitcher({
  value,
  onChange,
  counts,
}: {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
  counts: Partial<Record<StatusFilter, number>>;
}) {
  const activeIndex = Math.max(0, STATUS_FILTERS.indexOf(value));

  return (
    <div
      className="ag-switcher w-full max-w-none shrink overflow-x-auto sm:w-fit sm:max-w-none"
      data-idx={activeIndex}
      role="tablist"
      aria-label="상태 필터"
      style={
        {
          "--ag-idx": activeIndex,
          "--ag-count": STATUS_FILTERS.length,
        } as CSSProperties
      }
    >
      <span className="ag-switcher__indicator" aria-hidden />
      {STATUS_FILTERS.map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            className="ag-switcher__option gap-1.5"
            onClick={() => onChange(s)}
          >
            {s !== "전체" && (
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full opacity-80",
                  getWatchlistStatusStyle(s as StatusTag).dot,
                )}
                aria-hidden
              />
            )}
            {s}
            {s !== "전체" && (
              <span className="tabular-nums opacity-60">{counts[s] ?? 0}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function WatchlistClient() {
  const [profileId, setProfileId] = useState<WorkspaceProfile>("alpha-ceo");
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("전체");
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function refreshItems() {
    return getWatchlistItems(profileId).then((data) => {
      setItems(data as WatchlistItem[]);
    });
  }

  useEffect(() => {
    const p = getCurrentProfile() as WorkspaceProfile;
    setProfileId(p);
    getWatchlistItems(p).then((data) => {
      setItems(data as WatchlistItem[]);
      setLoading(false);
    });
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<StatusFilter, number>> = {};
    for (const s of STATUS_OPTIONS) {
      counts[s] = items.filter((i) => normalizeWatchlistStatus(i.tag) === s).length;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      return activeStatus === "전체" || normalizeWatchlistStatus(item.tag) === activeStatus;
    });
  }, [items, activeStatus]);

  async function handleConfirmDelete() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    await deleteWatchlistItem(deleteTargetId);
    setItems((prev) => prev.filter((i) => i.id !== deleteTargetId));
    setIsDeleting(false);
    setDeleteTargetId(null);
  }

  const addButton = (
    <button
      type="button"
      onClick={() => setModalState({ open: true, mode: "add" })}
      className={PRIMARY_ACTION_CLASS}
    >
      <Plus className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" />
      종목 추가
    </button>
  );

  return (
    <PageContainer>
      <WatchlistItemModal
        open={modalState.open}
        mode={modalState.open ? modalState.mode : "add"}
        profileId={profileId}
        editItem={modalState.open && modalState.mode === "edit" ? modalState.item : null}
        onClose={() => setModalState({ open: false })}
        onSaved={() => void refreshItems()}
      />

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTargetId(null);
        }}
        title="종목 삭제"
        description="이 종목을 관심목록에서 삭제할까요?"
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        tone="destructive"
      />

      <PageHeader title="Watchlist" subtitle="관심 종목과 메모" actions={addButton} />

      <div className="mb-7 md:mb-8">
        <StatusFilterSwitcher
          value={activeStatus}
          onChange={setActiveStatus}
          counts={statusCounts}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-border bg-muted/40 md:h-48"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center md:gap-4 md:py-28">
          <p className="text-base font-semibold text-foreground md:text-lg">
            {activeStatus !== "전체" ? "해당 상태의 종목이 없습니다" : "와치리스트가 비어있습니다"}
          </p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
            {activeStatus !== "전체"
              ? "다른 상태 필터를 선택해 보세요"
              : "관심 종목을 추가해 모니터링하세요"}
          </p>
          {activeStatus === "전체" && (
            <button
              type="button"
              onClick={() => setModalState({ open: true, mode: "add" })}
              className={cn(PRIMARY_ACTION_CLASS, "mt-1")}
            >
              <Plus className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" />
              첫 종목 추가
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2 lg:gap-5">
          {filtered.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onEditRequest={(editItem) => setModalState({ open: true, mode: "edit", item: editItem })}
              onDeleteRequest={setDeleteTargetId}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
