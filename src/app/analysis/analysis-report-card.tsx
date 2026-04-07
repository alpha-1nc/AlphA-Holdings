"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateAnalysisCardImage } from "@/app/actions/update-analysis-card-image";
import {
  extractImgSrcFromHtml,
  normalizeHttpUrl,
  resizeImageToDataUrl,
} from "@/lib/image-paste";
import { AnalysisReportDeleteButton } from "./analysis-report-delete-button";

function ratingBadgeClass(rating: string): string {
  switch (rating) {
    case "Strong Buy":
      return "border-emerald-500/50 bg-emerald-600/15 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-300";
    case "Buy":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-400/15 dark:text-emerald-200";
    case "Hold":
      return "border-amber-400/50 bg-amber-400/15 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200";
    case "Sell":
      return "border-orange-400/50 bg-orange-500/15 text-orange-800 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-orange-200";
    case "Strong Sell":
      return "border-red-400/50 bg-red-600/15 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export interface AnalysisReportCardProps {
  reportId: string;
  href: string;
  companyName: string;
  ticker: string;
  rating: string;
  totalScore: number;
  initialCardImageDataUrl: string | null;
}

export function AnalysisReportCard({
  reportId,
  href,
  companyName,
  ticker,
  rating,
  totalScore,
  initialCardImageDataUrl,
}: AnalysisReportCardProps) {
  const router = useRouter();
  const dialogPasteRef = useRef<HTMLTextAreaElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(
    initialCardImageDataUrl
  );
  const [isPending, startTransition] = useTransition();
  const tickerInitial = ticker.trim()[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    setImageUrl(initialCardImageDataUrl);
  }, [initialCardImageDataUrl]);

  useEffect(() => {
    if (!pasteOpen) return;
    const t = window.setTimeout(() => {
      dialogPasteRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [pasteOpen]);

  const persist = useCallback(
    (value: string | null) => {
      startTransition(async () => {
        const result = await updateAnalysisCardImage(reportId, value);
        if (result.ok) {
          setImageUrl(value);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    },
    [reportId, router]
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
            const t = item.type;
            if (t && !t.startsWith("image/")) continue;
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
        if (ok) {
          setPasteOpen(false);
          toast.success("커버 이미지를 저장했습니다.");
        } else {
          toast.message("붙여넣을 수 있는 이미지가 없습니다.");
        }
      })();
    },
    [tryConsumeClipboard]
  );

  const handleRemoveImage = useCallback(() => {
    persist(null);
    setPasteOpen(false);
    toast.success("커버 이미지를 삭제했습니다.");
  }, [persist]);

  return (
    <Card
      size="sm"
      className="h-full overflow-hidden border-border/70 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-foreground/10"
    >
      <CardHeader className="space-y-0 pb-0 pt-3.5">
        <div className="flex flex-row items-start gap-2.5 sm:gap-3">
          <div className="relative h-11 w-11 shrink-0 sm:h-12 sm:w-12">
            <button
              type="button"
              className="relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-[20%] bg-muted/80 ring-1 ring-border/50 transition hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="커버 이미지 붙여넣기 창 열기"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPasteOpen(true);
              }}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-1 text-center">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="text-lg font-bold tabular-nums text-muted-foreground sm:text-xl">
                      {tickerInitial}
                    </span>
                  )}
                </div>
              )}
              {isPending && imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                </div>
              )}
            </button>
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-row items-start justify-between gap-2">
              <Link href={href} className="min-w-0 flex-1 outline-none">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  분석 대상
                </p>
                <CardTitle className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug tracking-tight transition-colors hover:text-primary sm:text-[0.95rem]">
                  {companyName}
                </CardTitle>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {ticker}
                </p>
              </Link>
              <Badge
                variant="outline"
                className={`shrink-0 px-1.5 py-0 text-[9px] font-semibold leading-tight sm:text-[10px] ${ratingBadgeClass(rating)}`}
              >
                {rating}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 border-t border-border/50 bg-muted/25 px-3 py-3 sm:px-4">
        <Link href={href} className="block outline-none">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            종합 점수
          </p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-[2rem] sm:leading-none">
            {Number.isInteger(totalScore)
              ? totalScore
              : totalScore.toFixed(1)}
          </p>
        </Link>
        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
          <AnalysisReportDeleteButton
            reportId={reportId}
            companyName={companyName}
          />
        </div>
      </CardContent>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-base">커버 이미지 붙여넣기</DialogTitle>
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

          {imageUrl && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-border/50"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isPending}
                onClick={handleRemoveImage}
              >
                <Trash2 className="h-3.5 w-3.5" />
                이미지 삭제
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
