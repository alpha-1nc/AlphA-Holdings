"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteReport } from "@/app/actions/reports";

interface ReportDeleteButtonProps {
    reportId: number;
    reportType: "MONTHLY" | "QUARTERLY";
}

export function ReportDeleteButton({ reportId, reportType }: ReportDeleteButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteReport(reportId);
            toast.success("리포트가 삭제되었습니다.");
            router.push(reportType === "MONTHLY" ? "/monthly" : "/quarterly");
            router.refresh();
        } catch (err) {
            console.error("[리포트 삭제 오류]", err);
            toast.error("삭제 중 오류가 발생했습니다. 다시 시도해 주세요.");
            setIsDeleting(false);
        }
    };

    if (showConfirm) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">정말 삭제하시겠습니까?</span>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                >
                    {isDeleting ? (
                        <>
                            <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            삭제 중...
                        </>
                    ) : (
                        "삭제"
                    )}
                </button>
                <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isDeleting}
                    className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                    취소
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
            삭제
        </button>
    );
}
