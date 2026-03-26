"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisReportMeta } from "@/constants/analysis-reports";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveAnalysisReportFromHtml } from "@/app/actions/analysis-reports-user";
import {
  getPeriodsFromReports,
  filterReportsByPeriod,
} from "@/lib/analysis-reports-utils";

const LOGO_STORAGE_KEY = "analysis-report-logo";

function getLogoKey(year: number, month: number, companyCode: string) {
  return `${LOGO_STORAGE_KEY}-${year}-${String(month).padStart(2, "0")}-${companyCode}`;
}

function CompanyLogo({ report }: { report: AnalysisReportMeta }) {
  const key = getLogoKey(report.year, report.month, report.companyCode);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValidLogo = imageUrl?.trim() && !imgError;

  const loadStored = () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(key);
    if (stored) {
      setImageUrl(stored);
      setImgError(false);
    } else {
      setImageUrl(null);
    }
  };

  useEffect(() => {
    loadStored();
  }, [key]);

  useEffect(() => {
    if (dialogOpen) {
      setPasteInput(imageUrl || "");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [dialogOpen, imageUrl]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(true);
  };

  const handleSave = () => {
    const raw = pasteInput.trim();
    const url = raw && !raw.startsWith("(") ? raw : null;
    if (url) {
      try {
        if (url.startsWith("data:")) {
          localStorage.setItem(key, url);
        } else {
          new URL(url);
          localStorage.setItem(key, url);
        }
        setImageUrl(url);
        setImgError(false);
      } catch {
        // invalid URL, ignore
      }
    }
    setDialogOpen(false);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            setPasteInput(dataUrl);
            return;
          }
        }
      }
      setPasteInput((prev) => prev || "(클립보드에 이미지가 없습니다)");
    } catch {
      setPasteInput((prev) => prev || "(클립보드 접근 권한이 필요합니다)");
    }
  };

  const handleRemove = () => {
    localStorage.removeItem(key);
    setImageUrl(null);
    setImgError(false);
    setDialogOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleLogoClick}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 font-bold text-neutral-600 transition hover:ring-2 hover:ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:ring-neutral-600"
        title="클릭하여 이미지 변경"
      >
        {hasValidLogo ? (
          <img
            src={imageUrl!}
            alt={report.companyCode}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => {
              localStorage.removeItem(key);
              setImageUrl(null);
              setImgError(true);
            }}
          />
        ) : (
          <span>{report.companyCode}</span>
        )}
      </button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-sm">
              {report.companyName} 이미지 설정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                이미지 URL 붙여넣기
              </label>
              <Input
                ref={inputRef}
                type="text"
                placeholder="https://... 또는 Ctrl+V로 이미지 붙여넣기"
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (items) {
                    for (let i = 0; i < items.length; i++) {
                      const item = items[i];
                      if (item.type.startsWith("image/")) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        if (blob) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) setPasteInput(reader.result as string);
                          };
                          reader.readAsDataURL(blob);
                        }
                        return;
                      }
                    }
                  }
                }}
                className="font-mono text-xs"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handlePasteFromClipboard}
            >
              클립보드에서 이미지 가져오기
            </Button>
            {pasteInput && (pasteInput.startsWith("data:image/") || pasteInput.startsWith("http")) && (
              <div className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
                <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">미리보기:</p>
                <img
                  src={pasteInput}
                  alt="preview"
                  className="h-20 w-20 rounded-lg object-cover"
                  onError={() => {}}
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
              >
                이미지 제거
              </Button>
            )}
            <Button type="button" size="sm" onClick={handleSave}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AnalysisReportsClient({
  initialReports,
}: {
  initialReports: AnalysisReportMeta[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [htmlPaste, setHtmlPaste] = useState("");
  const [saving, setSaving] = useState(false);

  const periods = getPeriodsFromReports(initialReports);

  const handleSaveHtml = async () => {
    setSaving(true);
    try {
      await saveAnalysisReportFromHtml(htmlPaste);
      toast.success("보고서가 등록되었습니다. 연·월·티커는 HTML에서 자동으로 읽었습니다.");
      setHtmlPaste("");
      setAddOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            기업 투자 분석 보고서
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            기업별 장기 투자 분석 리포트 · 연도/월 기준 데이터
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 self-start sm:self-auto"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          HTML 붙여넣기로 추가
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-base">투자 분석 HTML 등록</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            AI가 생성한 HTML 전체를 붙여넣으면, 푸터의 기준일(○○년 ○월)로 월이 분류되고 제목·티커·판정(BUY 등)을 읽어 카드가 추가됩니다.
          </p>
          <Textarea
            value={htmlPaste}
            onChange={(e) => setHtmlPaste(e.target.value)}
            placeholder="<!DOCTYPE html> ..."
            className="min-h-[240px] font-mono text-xs"
            spellCheck={false}
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
              취소
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={handleSaveHtml}>
              {saving ? "저장 중…" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {initialReports.length > 0 ? (
        <div className="space-y-8">
          {periods.map((periodStr) => {
            const [year, month] = periodStr.split("-").map(Number);
            const reports = filterReportsByPeriod(initialReports, year, month);
            const monthLabel = new Date(year, month - 1).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
            });

            return (
              <section key={periodStr}>
                <div className="mb-4 flex items-center justify-between">
                  <p
                    className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500"
                    suppressHydrationWarning
                  >
                    {monthLabel}
                  </p>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    {reports.length}개 보고서
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {reports.map((report) => (
                    <Link
                      key={`${report.year}-${report.month}-${report.companyCode}`}
                      href={`/analysis/${report.year}/${String(report.month).padStart(2, "0")}/${report.companyCode}`}
                      className="group block"
                    >
                      <div className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-none ring-1 ring-transparent transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:ring-neutral-200/70 dark:border-neutral-800 dark:bg-neutral-900/80 dark:hover:border-neutral-700">
                        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-500" />
                        <div className="p-5 pt-6">
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className="shrink-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <CompanyLogo report={report} />
                            </div>
                            {report.verdict && (
                              <span
                                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                                  report.verdict === "BUY"
                                    ? "border-emerald-300/40 bg-emerald-50/70 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-900/40 dark:text-emerald-400"
                                    : report.verdict === "SELL"
                                      ? "border-red-300/40 bg-red-50/70 text-red-600 dark:border-red-500/40 dark:bg-red-900/40 dark:text-red-400"
                                      : "border-amber-300/40 bg-amber-50/70 text-amber-600 dark:border-amber-500/40 dark:bg-amber-900/40 dark:text-amber-400"
                                }`}
                              >
                                {report.verdict}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
                            {report.companyName}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                            {report.title}
                          </p>
                          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-300">
                            <ExternalLink className="h-3.5 w-3.5" />
                            보고서 보기
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/80 shadow-none dark:border-neutral-800 dark:bg-neutral-900/60">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
              <FileText className="h-7 w-7 text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              등록된 투자 분석 보고서가 없습니다.
            </p>
            <p className="mt-2 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
              상단의 &quot;HTML 붙여넣기로 추가&quot;로 보고서를 등록하거나, 코드의 constants/analysis-reports.ts에 메타데이터를 추가해 주세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
