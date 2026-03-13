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

interface AssetDeleteButtonProps {
  id: number;
}

export function AssetDeleteButton({ id }: AssetDeleteButtonProps) {
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
        className="rounded-full p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
        onClick={(e) => e.stopPropagation()}
      >
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            종목 삭제
          </DialogTitle>
        </DialogHeader>
        <p className="mt-1 text-sm text-neutral-500">
          이 종목을 삭제하면 대시보드에서 더 이상 보이지 않습니다. 계속하시겠습니까?
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
