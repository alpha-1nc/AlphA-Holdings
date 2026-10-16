"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteJournal } from "@/app/actions/journal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageActionButton, PageActionLink } from "@/components/ui/page-action-button";
import { cn } from "@/lib/utils";

type JournalDetailActionsProps = {
  journalId: number;
  periodLabel: string;
};

export function JournalDetailActions({
  journalId,
  periodLabel,
}: JournalDetailActionsProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteJournal(journalId);
      if (!result.ok) {
        toast.error(result.error);
        setIsDeleting(false);
        return;
      }
      toast.success("일지가 삭제되었습니다.");
      setDialogOpen(false);
      router.push("/journal");
      router.refresh();
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <PageActionLink href={`/journal/new?period=${encodeURIComponent(periodLabel)}`}>
          수정
        </PageActionLink>
        <PageActionButton
          onClick={() => setDialogOpen(true)}
          className={cn("text-muted-foreground hover:text-foreground/80")}
        >
          삭제
        </PageActionButton>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="일지 삭제"
        description="이 일지를 삭제할까요? 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        loading={isDeleting}
        tone="destructive"
      />
    </>
  );
}
