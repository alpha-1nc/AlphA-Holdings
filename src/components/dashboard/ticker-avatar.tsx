"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPaste, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  extractImgSrcFromHtml,
  normalizeHttpUrl,
  resizeImageToDataUrl,
} from "@/lib/image-paste";
import { getFmpLogoUrl } from "@/lib/ticker-logo";

interface TickerAvatarProps {
  ticker: string;
  /** DB에 저장된 검색 표시명 (접근성·메타) */
  displayName?: string | null;
  logoUrl?: string | null;
  size?: number;
  /** 둥근 사각형 (기업 분석 리포트 스타일) — 기본은 원형 */
  roundedSquare?: boolean;
  /**
   * true이면 저장된 logoUrl이 없거나 로드 실패 시 FMP 티커 이미지 URL을 시도합니다.
   * (와치리스트·분기 스냅샷과 동일한 원형·스케일 스타일)
   */
  autoFmpLogo?: boolean;
  /** 편집 가능 시 클릭하여 이미지 붙여넣기 창 */
  editable?: boolean;
  onLogoChange?: (url: string | null) => void;
  /** 부모에서 비동기 저장 중 (예: 서버 액션) */
  isSaving?: boolean;
}

export function TickerAvatar({
  ticker,
  displayName: _displayNameProp,
  logoUrl,
  size = 28,
  roundedSquare = false,
  autoFmpLogo = false,
  editable = false,
  onLogoChange,
  isSaving = false,
}: TickerAvatarProps) {
  void _displayNameProp;
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const [failedFmpUrl, setFailedFmpUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogPasteRef = useRef<HTMLTextAreaElement>(null);

  const t = ticker.trim();
  const initial =
    (t.replace(/[^A-Za-z0-9가-힣]/g, "").slice(0, 2) || t[0] || "?").toUpperCase();

  const trimmedLogo = logoUrl?.trim() ?? "";
  const fmpUrl = autoFmpLogo && t ? getFmpLogoUrl(t) : null;

  const customFailed = Boolean(trimmedLogo && failedLogoUrl === trimmedLogo);
  const customOk = Boolean(trimmedLogo && !customFailed);
  const fmpFailed = Boolean(fmpUrl && failedFmpUrl === fmpUrl);
  const fmpOk = Boolean(fmpUrl && !fmpFailed);

  const displayUrl = customOk ? trimmedLogo : fmpOk && fmpUrl ? fmpUrl : null;
  const hasValidLogo = displayUrl !== null;

  useEffect(() => {
    setFailedLogoUrl(null);
    setFailedFmpUrl(null);
  }, [trimmedLogo, t, autoFmpLogo]);
  const sizeClass =
    size >= 40
      ? "h-10 w-10"
      : size >= 36
        ? "h-9 w-9"
        : size >= 32
          ? "h-8 w-8"
          : size === 28
            ? "h-7 w-7"
            : "h-6 w-6";

  useEffect(() => {
    if (!dialogOpen) return;
    const timer = window.setTimeout(() => {
      dialogPasteRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dialogOpen]);

  const persist = useCallback(
    (value: string | null) => {
      onLogoChange?.(value);
      if (value !== null) {
        setDialogOpen(false);
      }
    },
    [onLogoChange]
  );

  const handleImageBlob = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (file.type && !file.type.startsWith("image/")) return;
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        persist(dataUrl);
      } catch {
        toast.error("이미지를 불러오지 못했습니다.");
      }
    },
    [persist]
  );

  const tryConsumeClipboard = useCallback(
    async (dt: DataTransfer): Promise<boolean> => {
      if (dt.files && dt.files.length > 0) {
        const f = dt.files[0];
        if (!f.type || f.type.startsWith("image/")) {
          await handleImageBlob(f);
          return true;
        }
      }

      const items = dt.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file") {
            const ty = item.type;
            if (ty && !ty.startsWith("image/")) continue;
            const blob = item.getAsFile();
            if (blob) {
              await handleImageBlob(blob as File);
              return true;
            }
          }
        }
      }

      const html = dt.getData("text/html");
      if (html) {
        const src = extractImgSrcFromHtml(html);
        if (src) {
          persist(src);
          return true;
        }
      }

      const plain = dt.getData("text/plain").trim();
      if (plain) {
        const url = normalizeHttpUrl(plain);
        if (url) {
          persist(url);
          return true;
        }
      }

      return false;
    },
    [handleImageBlob, persist]
  );

  const onDialogPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      e.stopPropagation();
      void (async () => {
        const ok = await tryConsumeClipboard(e.clipboardData);
        if (!ok) {
          toast.message("붙여넣을 수 있는 이미지가 없습니다.");
        }
      })();
    },
    [tryConsumeClipboard]
  );

  const handleRemoveImage = useCallback(() => {
    onLogoChange?.(null);
    setDialogOpen(false);
  }, [onLogoChange]);

  const shapeClass = roundedSquare ? "rounded-xl" : "rounded-full";
  const pendingOverlay = isSaving;

  const avatarEl = (
    <span
      className={`relative inline-flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden ${shapeClass} ring-1 ring-neutral-200 dark:ring-neutral-700 ${
        editable
          ? "cursor-pointer transition hover:ring-primary/40 dark:hover:ring-primary/50"
          : ""
      }`}
      onClick={editable ? () => setDialogOpen(true) : undefined}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={
        editable ? (e) => e.key === "Enter" && setDialogOpen(true) : undefined
      }
      aria-label={
        editable ? "종목 이미지 붙여넣기 창 열기" : undefined
      }
    >
      <span
        className="absolute inset-0 flex items-center justify-center bg-neutral-100 font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
        style={{
          fontSize: Math.max(10, Math.floor(size * 0.45)),
          opacity: hasValidLogo ? 0 : 1,
        }}
        aria-hidden={hasValidLogo || undefined}
      >
        {pendingOverlay && !hasValidLogo ? (
          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
        ) : (
          initial
        )}
      </span>
      {hasValidLogo && displayUrl && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] bg-white dark:bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={displayUrl}
            src={displayUrl}
            alt=""
            aria-hidden
            draggable={false}
            className="block object-contain"
            style={{ width: "76%", height: "76%" }}
            onError={() => {
              if (displayUrl === trimmedLogo) setFailedLogoUrl(trimmedLogo);
              else if (fmpUrl && displayUrl === fmpUrl) setFailedFmpUrl(fmpUrl);
            }}
          />
        </div>
      )}
      {pendingOverlay && hasValidLogo && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        </div>
      )}
    </span>
  );

  return (
    <>
      {avatarEl}
      {editable && onLogoChange && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md" showCloseButton>
            <DialogHeader>
              <DialogTitle className="text-base">종목 이미지 붙여넣기</DialogTitle>
              <DialogDescription className="text-left">
                인터넷·노션 등에서 이미지를 복사한 뒤, 아래 영역을 클릭하고{" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                  Ctrl+V
                </kbd>{" "}
                또는{" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                  ⌘V
                </kbd>
                로 붙여넣으세요.
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <div
                className="pointer-events-none flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/35 bg-muted/40 px-4 py-8 text-center"
                aria-hidden
              >
                <ClipboardPaste
                  className="h-12 w-12 text-muted-foreground/80"
                  strokeWidth={1.25}
                />
                <p className="text-sm font-medium text-foreground">
                  여기를 클릭한 뒤 붙여넣기
                </p>
                <p className="text-xs text-muted-foreground">
                  이미지 파일·웹 이미지·이미지 URL 모두 지원
                </p>
              </div>
              <textarea
                ref={dialogPasteRef}
                readOnly
                rows={8}
                className="absolute inset-0 z-10 cursor-text resize-none rounded-xl border-0 bg-transparent p-4 text-transparent caret-primary selection:bg-transparent"
                aria-label="이미지 붙여넣기 영역"
                onPaste={onDialogPaste}
                onChange={(e) => {
                  e.target.value = "";
                }}
              />
            </div>

            {logoUrl && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-border/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={pendingOverlay}
                  onClick={handleRemoveImage}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  이미지 삭제
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
