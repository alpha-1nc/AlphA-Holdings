"use client";

import { useEffect, useState, useMemo } from "react";
import { Bookmark, Plus, Trash2, ExternalLink, Search, X, Pencil } from "lucide-react";
import { getCurrentProfile } from "@/lib/profile";
import type { WorkspaceProfile } from "@/lib/profile";
import {
  getWatchlistItems,
  addWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
} from "@/app/actions/watchlist";
import { PageMainTitle } from "@/components/layout/page-main-title";
import {
  TickerSearchInput,
  type TickerSearchChangeMeta,
} from "@/components/dashboard/ticker-search-input";

/** 와치리스트 상태 (DB `tag` 컬럼과 동일 값) */
const STATUS_OPTIONS = ["관심", "매수검토", "편입", "보류"] as const;
const STATUS_FILTERS = ["전체", ...STATUS_OPTIONS] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

/** 예전 탭 값 → 새 상태 (필터·뱅지 표시용) */
const LEGACY_STATUS_MAP: Record<string, string> = {
  보유중: "편입",
  매도검토: "보류",
};

function normalizeStatus(tag: string): (typeof STATUS_OPTIONS)[number] {
  const mapped = LEGACY_STATUS_MAP[tag] ?? tag;
  if ((STATUS_OPTIONS as readonly string[]).includes(mapped)) {
    return mapped as (typeof STATUS_OPTIONS)[number];
  }
  return "관심";
}

/** 한 줄 한 항목 · 앞쪽 글머리 기호는 제거 후 표시 */
function bulletLinesToArray(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\u2022\u30FB•\-\*・]+/u, "").trim())
    .filter(Boolean);
}

const BULLET_PLACEHOLDER = `예:\n실적 모멘텀 유지\n밸류에이션 여력`;

function BulletListView({ text }: { text: string }) {
  const items = bulletLinesToArray(text);
  if (items.length === 0) return null;
  return (
    <ul
      className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed"
      style={{ color: "var(--ah-text-muted)" }}
    >
      {items.map((line, i) => (
        <li key={i} className="pl-0.5 marker:text-neutral-400 dark:marker:text-neutral-500">
          {line}
        </li>
      ))}
    </ul>
  );
}

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

const STATUS_STYLE: Record<string, string> = {
  관심:    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  매수검토: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  편입:    "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  보류:    "bg-amber-500/15 text-amber-800 dark:text-amber-300",
};

function TickerLogo({
  ticker,
  logoUrl,
  size = 40,
}: {
  ticker: string;
  logoUrl: string | null;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const showImg = logoUrl && !imgError;
  const initials = ticker.replace(/[^A-Za-z0-9가-힣]/g, "").slice(0, 2) || ticker.charAt(0);

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full ring-1 ring-black/[0.06] dark:ring-white/10 ${
        showImg ? "" : "flex items-center justify-center"
      }`}
      style={{
        width: size,
        height: size,
        background: showImg ? undefined : "var(--ah-card-soft)",
      }}
    >
      {showImg ? (
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white dark:bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={ticker}
            draggable={false}
            className="block object-contain"
            style={{ width: "76%", height: "76%" }}
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <span
          className="font-bold leading-none select-none"
          style={{
            color: "var(--ah-text-pri)",
            fontSize: Math.max(11, Math.round(size * 0.34)),
          }}
        >
          {initials.toUpperCase()}
        </span>
      )}
    </div>
  );
}

/* ── 종목 추가 모달 ── */
function AddModal({
  profileId,
  onClose,
}: {
  profileId: WorkspaceProfile;
  onClose: () => void;
}) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [interestReason, setInterestReason] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [tag, setTag] = useState<(typeof STATUS_OPTIONS)[number]>("관심");
  const [loading, setLoading] = useState(false);

  function handleTickerSearchChange(t: string, meta?: TickerSearchChangeMeta) {
    setTicker(t);
    if (meta?.source === "select") {
      setName(meta.displayName?.trim() || "");
    } else {
      const same = t.trim().toUpperCase() === ticker.trim().toUpperCase();
      if (!same) setName("");
    }
  }

  async function handleSubmit() {
    if (!ticker.trim()) return;
    setLoading(true);
    await addWatchlistItem(profileId, {
      ticker: ticker.trim().toUpperCase(),
      companyName: name.trim() || ticker.trim(),
      interestReason: interestReason.trim() || undefined,
      riskNotes: riskNotes.trim() || undefined,
      tag,
    });
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--ah-card)", border: "1px solid var(--ah-border)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: "var(--ah-text-pri)" }}>
            종목 추가
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-4 w-4" style={{ color: "var(--ah-text-muted)" }} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>
              종목 검색 *
            </label>
            <TickerSearchInput
              value={ticker}
              onChange={handleTickerSearchChange}
              placeholder="티커 또는 회사명으로 검색..."
            />
            {ticker && (
              <p className="mt-1 text-xs" style={{ color: "var(--ah-text-subtle)" }}>
                {name || ticker}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>
              상태
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                  style={{
                    background: tag === t ? "var(--ah-accent)" : "var(--ah-card-soft)",
                    color: tag === t ? "var(--ah-accent-fg)" : "var(--ah-text-muted)",
                    border: "1px solid var(--ah-border)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>
              관심 이유 (선택)
            </label>
            <p className="mb-1.5 text-[11px] leading-snug" style={{ color: "var(--ah-text-subtle)" }}>
              한 줄에 한 항목씩 입력하면 글머리 목록으로 보입니다. 줄 앞의 •, -, * 는 자동으로 정리됩니다.
            </p>
            <textarea
              value={interestReason}
              onChange={(e) => setInterestReason(e.target.value)}
              placeholder={BULLET_PLACEHOLDER}
              rows={5}
              className="w-full resize-y rounded-xl px-3 py-2.5 text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--ah-card-soft)",
                border: "1px solid var(--ah-border)",
                color: "var(--ah-text-pri)",
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--ah-text-muted)" }}>
              리스크 (선택)
            </label>
            <p className="mb-1.5 text-[11px] leading-snug" style={{ color: "var(--ah-text-subtle)" }}>
              한 줄에 한 항목씩 입력하면 글머리 목록으로 보입니다.
            </p>
            <textarea
              value={riskNotes}
              onChange={(e) => setRiskNotes(e.target.value)}
              placeholder={BULLET_PLACEHOLDER}
              rows={5}
              className="w-full resize-y rounded-xl px-3 py-2.5 text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--ah-card-soft)",
                border: "1px solid var(--ah-border)",
                color: "var(--ah-text-pri)",
              }}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !ticker.trim()}
          className="mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{
            background: "var(--ah-accent)",
            color: "var(--ah-accent-fg)",
          }}
        >
          {loading ? "추가 중..." : "추가"}
        </button>
      </div>
    </div>
  );
}

/* ── 종목 카드 ── */
function WatchlistCard({
  item,
  onDelete,
  onUpdate,
}: {
  item: WatchlistItem;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    data: { interestReason?: string | null; riskNotes?: string | null; tag?: string }
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>(() =>
    normalizeStatus(item.tag)
  );
  const [interestReason, setInterestReason] = useState(item.interestReason ?? "");
  const [riskNotes, setRiskNotes] = useState(item.riskNotes ?? "");

  useEffect(() => {
    setStatus(normalizeStatus(item.tag));
    setInterestReason(item.interestReason ?? "");
    setRiskNotes(item.riskNotes ?? "");
  }, [item.id, item.tag, item.interestReason, item.riskNotes]);

  async function saveEdit() {
    await onUpdate(item.id, {
      tag: status,
      interestReason: interestReason.trim() || null,
      riskNotes: riskNotes.trim() || null,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setStatus(normalizeStatus(item.tag));
    setInterestReason(item.interestReason ?? "");
    setRiskNotes(item.riskNotes ?? "");
    setEditing(false);
  }

  const displayStatus = normalizeStatus(item.tag);
  const hasNotes = Boolean(
    bulletLinesToArray(item.interestReason ?? "").length ||
      bulletLinesToArray(item.riskNotes ?? "").length
  );

  const fieldClass =
    "w-full resize-y rounded-lg px-3 py-1.5 text-sm focus:outline-none min-h-[5rem]";

  const statusBadgeClass = STATUS_STYLE[displayStatus] ?? STATUS_STYLE["관심"];

  return (
    <div
      className="group flex flex-col rounded-2xl p-5 transition-all duration-300 hover:shadow-md"
      style={{ background: "var(--ah-card)", border: "1px solid var(--ah-border)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <TickerLogo ticker={item.ticker} logoUrl={item.logoUrl} size={40} />
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--ah-text-pri)" }}>
              {item.ticker}
            </p>
            <p className="text-xs" style={{ color: "var(--ah-text-muted)" }}>
              {item.companyName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass}`}>
            {displayStatus}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg p-1.5 opacity-70 transition-all hover:opacity-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="상태·메모 수정"
            aria-label="상태·메모 수정"
          >
            <Pencil className="h-3.5 w-3.5" style={{ color: "var(--ah-text-muted)" }} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="rounded-lg p-1.5 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-500/10"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex-1">
        {editing ? (
          <div className="space-y-2">
            <div>
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--ah-text-subtle)" }}>
                상태
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStatus(t)}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all"
                    style={{
                      background: status === t ? "var(--ah-accent)" : "var(--ah-card-soft)",
                      color: status === t ? "var(--ah-accent-fg)" : "var(--ah-text-muted)",
                      border: "1px solid var(--ah-border)",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--ah-text-subtle)" }}>
                관심 이유
              </span>
              <p className="mb-1 text-[10px] leading-snug" style={{ color: "var(--ah-text-subtle)" }}>
                한 줄에 한 항목 (글머리로 표시)
              </p>
              <textarea
                value={interestReason}
                onChange={(e) => setInterestReason(e.target.value)}
                placeholder={BULLET_PLACEHOLDER}
                className={fieldClass}
                style={{
                  background: "var(--ah-card-soft)",
                  border: "1px solid var(--ah-border)",
                  color: "var(--ah-text-pri)",
                }}
              />
            </div>
            <div>
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--ah-text-subtle)" }}>
                리스크
              </span>
              <p className="mb-1 text-[10px] leading-snug" style={{ color: "var(--ah-text-subtle)" }}>
                한 줄에 한 항목 (글머리로 표시)
              </p>
              <textarea
                value={riskNotes}
                onChange={(e) => setRiskNotes(e.target.value)}
                placeholder={BULLET_PLACEHOLDER}
                className={fieldClass}
                style={{
                  background: "var(--ah-card-soft)",
                  border: "1px solid var(--ah-border)",
                  color: "var(--ah-text-pri)",
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                className="flex-1 rounded-lg py-1.5 text-xs font-semibold"
                style={{ background: "var(--ah-accent)", color: "var(--ah-accent-fg)" }}
              >
                저장
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 rounded-lg py-1.5 text-xs font-medium"
                style={{ background: "var(--ah-card-soft)", color: "var(--ah-text-muted)" }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full text-left">
            {hasNotes ? (
              <div className="space-y-3">
                {bulletLinesToArray(item.interestReason ?? "").length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--ah-text-subtle)" }}>
                      관심 이유
                    </p>
                    <BulletListView text={item.interestReason ?? ""} />
                  </div>
                )}
                {bulletLinesToArray(item.riskNotes ?? "").length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--ah-text-subtle)" }}>
                      리스크
                    </p>
                    <BulletListView text={item.riskNotes ?? ""} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--ah-text-subtle)" }}>
                연필 아이콘으로 상태·관심 이유·리스크를 입력하세요.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-3"
           style={{ borderColor: "var(--ah-border)" }}>
        <span className="text-xs" style={{ color: "var(--ah-text-subtle)" }}>
          {new Date(item.addedAt).toLocaleDateString("ko-KR")}
        </span>
        <a
          href={`https://finance.yahoo.com/quote/${item.ticker}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
          style={{ color: "var(--ah-text-subtle)" }}
        >
          Yahoo Finance
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

/* ── 메인 클라이언트 ── */
export function WatchlistClient() {
  const [profileId, setProfileId] = useState<WorkspaceProfile>("alpha-ceo");
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("전체");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const p = getCurrentProfile() as WorkspaceProfile;
    setProfileId(p);
    getWatchlistItems(p).then((data) => {
      setItems(data as WatchlistItem[]);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchStatus =
        activeStatus === "전체" || normalizeStatus(item.tag) === activeStatus;
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        item.ticker.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        (item.interestReason?.toLowerCase().includes(q) ?? false) ||
        (item.riskNotes?.toLowerCase().includes(q) ?? false);
      return matchStatus && matchSearch;
    });
  }, [items, activeStatus, search]);

  async function handleDelete(id: string) {
    await deleteWatchlistItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleUpdate(
    id: string,
    data: { interestReason?: string | null; riskNotes?: string | null; tag?: string }
  ) {
    await updateWatchlistItem(id, data);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...data } : i))
    );
  }

  return (
    <div className="w-full space-y-6 p-0">
      {showAddModal && (
        <AddModal
          profileId={profileId}
          onClose={() => {
            setShowAddModal(false);
            getWatchlistItems(profileId).then((d) => setItems(d as WatchlistItem[]));
          }}
        />
      )}

      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageMainTitle icon={Bookmark}>Watchlist</PageMainTitle>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: "var(--ah-accent)", color: "var(--ah-accent-fg)" }}
        >
          <Plus className="h-4 w-4" />
          종목 추가
        </button>
      </div>

      {/* 검색 + 상태 필터 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex flex-wrap items-center gap-1 rounded-full p-1"
          style={{ background: "var(--ah-card)", border: "1px solid var(--ah-border)" }}
        >
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveStatus(s)}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                background: activeStatus === s ? "var(--ah-accent)" : "transparent",
                color: activeStatus === s ? "var(--ah-accent-fg)" : "var(--ah-text-muted)",
              }}
            >
              {s}
              {s !== "전체" && (
                <span className="ml-1.5 tabular-nums opacity-60">
                  {items.filter((i) => normalizeStatus(i.tag) === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <div
          className="flex items-center gap-2 rounded-full px-3.5 py-2"
          style={{ background: "var(--ah-card)", border: "1px solid var(--ah-border)" }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ah-text-subtle)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="티커, 종목명 검색"
            className="w-40 bg-transparent text-sm focus:outline-none"
            style={{ color: "var(--ah-text-pri)" }}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-3.5 w-3.5" style={{ color: "var(--ah-text-subtle)" }} />
            </button>
          )}
        </div>
      </div>

      {/* 카드 그리드 */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl"
                 style={{ background: "var(--ah-card-soft)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <Bookmark className="h-10 w-10" style={{ color: "var(--ah-text-subtle)" }} />
          <p className="text-base font-semibold" style={{ color: "var(--ah-text-pri)" }}>
            {search || activeStatus !== "전체" ? "검색 결과가 없습니다" : "와치리스트가 비어있습니다"}
          </p>
          <p className="text-sm" style={{ color: "var(--ah-text-muted)" }}>
            {search || activeStatus !== "전체"
              ? "다른 검색어나 상태를 선택해 보세요"
              : "관심 종목을 추가해 모니터링하세요"}
          </p>
          {!search && activeStatus === "전체" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: "var(--ah-accent)", color: "var(--ah-accent-fg)" }}
            >
              <Plus className="h-4 w-4" />
              첫 종목 추가
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
