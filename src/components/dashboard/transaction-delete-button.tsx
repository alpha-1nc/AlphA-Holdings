"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deletePortfolioItem } from "@/app/actions/portfolio-items";

interface TransactionDeleteButtonProps {
  id: number;
}

export function TransactionDeleteButton({ id }: TransactionDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deletePortfolioItem(id);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="ml-2 rounded-full p-2 text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
        onClick={(e) => e.stopPropagation()}
      >
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            입출금 내역 삭제
          </DialogTitle>
        </DialogHeader>
        <p className="mt-1 text-sm text-neutral-500">
          이 입출금 내역을 삭제하면 총 투자금 계산 등에 즉시 반영됩니다. 계속하시겠습니까?
        </p>
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            삭제하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
