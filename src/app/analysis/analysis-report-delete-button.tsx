"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAnalysisReport } from "@/app/actions/delete-analysis-report";
import { Button } from "@/components/ui/button";

interface AnalysisReportDeleteButtonProps {
  reportId: string;
  companyName: string;
}

export function AnalysisReportDeleteButton({
  reportId,
  companyName,
}: AnalysisReportDeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAnalysisReport(reportId);
      toast.success("리포트가 삭제되었습니다.");
      router.refresh();
    } catch (err) {
      console.error("[분석 리포트 삭제 오류]", err);
      toast.error("삭제 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="relative shrink-0">
      {showConfirm && (
        <div
          className="absolute bottom-full right-0 z-20 mb-1.5 w-[min(16rem,calc(100vw-2rem))] rounded-md border border-border bg-popover p-2.5 text-popover-foreground shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2 text-left text-[11px] leading-snug text-muted-foreground">
            「{companyName}」 리포트를 삭제할까요?
          </p>
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isDeleting}
              onClick={() => setShowConfirm(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "삭제 중…" : "삭제"}
            </Button>
          </div>
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        disabled={isDeleting}
        aria-label={`${companyName} 리포트 삭제`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowConfirm((v) => !v);
        }}
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        )}
      </Button>
    </div>
  );
}
