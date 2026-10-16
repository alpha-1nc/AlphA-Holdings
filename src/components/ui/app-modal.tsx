"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { cn } from "@/lib/utils";

export type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 로딩 중 닫기 방지 */
  disableClose?: boolean;
  className?: string;
  bodyClassName?: string;
};

/**
 * 공통 앱 모달 — body 스크롤 잠금, 헤더(z-60) 위 z-index, 내부 스크롤만 허용.
 */
export function AppModal({
  open,
  onOpenChange,
  title,
  children,
  footer,
  disableClose = false,
  className,
  bodyClassName,
}: AppModalProps) {
  useBodyScrollLock(open);

  const handleOpenChange = (next: boolean) => {
    if (disableClose && !next) return;
    onOpenChange(next);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      {open && (
        <DialogPrimitive.Portal keepMounted>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm data-open:animate-in data-open:fade-in-0"
          aria-hidden
        />

        <DialogPrimitive.Popup
          aria-modal="true"
          role="dialog"
          className={cn(
            "fixed z-[75] flex w-[min(calc(100%-2rem),32rem)] flex-col overflow-hidden",
            "rounded-2xl border border-border bg-card shadow-2xl outline-none",
            "left-1/2 top-1/2 max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem))] -translate-x-1/2 -translate-y-1/2",
            "max-sm:top-auto max-sm:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] max-sm:max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem))] max-sm:-translate-y-0",
            className,
          )}
        >
          <div className="shrink-0 border-b border-border px-6 pb-4 pt-6 md:px-7 md:pb-5 md:pt-7">
            <div className="flex items-center justify-between gap-3">
              <DialogPrimitive.Title className="text-lg font-bold text-foreground">
                {title}
              </DialogPrimitive.Title>
              {!disableClose && (
                <DialogPrimitive.Close
                  render={
                    <button
                      type="button"
                      aria-label="닫기"
                      className="rounded-lg p-1.5 transition-colors hover:bg-muted"
                    />
                  }
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </DialogPrimitive.Close>
              )}
            </div>
          </div>

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 md:px-7 md:py-5",
              bodyClassName,
            )}
          >
            {children}
          </div>

          {footer != null && (
            <div className="shrink-0 border-t border-border px-6 pb-5 pt-4 md:px-7 md:pb-6 md:pt-5">
              {footer}
            </div>
          )}
        </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
}
