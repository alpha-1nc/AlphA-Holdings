"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  /** 파괴적 액션 — 무채색 솔리드(빨강 아님) */
  tone?: "neutral" | "destructive";
};

/**
 * 확인 다이얼로그 — uitripled `native-dialog-shadcnui` 참고
 * (backdrop blur, 중앙 모달, rounded-2xl, spring 진입)
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  loading = false,
  tone = "neutral",
}: ConfirmDialogProps) {
  const shouldReduceMotion = useReducedMotion();

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    onOpenChange(next);
  };

  const panelMotion = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.96, y: 8, filter: "blur(6px)" },
        animate: {
          opacity: 1,
          scale: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { type: "spring" as const, duration: 0.45, bounce: 0.12 },
        },
        exit: {
          opacity: 0,
          scale: 0.98,
          y: 4,
          filter: "blur(4px)",
          transition: { duration: 0.18, ease: "easeOut" as const },
        },
      };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal keepMounted>
            <DialogPrimitive.Backdrop
              render={
                <motion.div
                  aria-hidden
                  className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                />
              }
            />

            <DialogPrimitive.Popup
              render={
                <motion.div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="confirm-dialog-title"
                  aria-describedby="confirm-dialog-description"
                  className={cn(
                    "fixed left-1/2 top-1/2 z-[65] w-[min(calc(100%-2rem),22rem)] -translate-x-1/2 -translate-y-1/2",
                    "overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl",
                    "ring-1 ring-foreground/5",
                  )}
                  {...panelMotion}
                >
                  <div className="relative px-6 pb-5 pt-6">
                    {!loading && (
                      <DialogPrimitive.Close
                        render={
                          <button
                            type="button"
                            aria-label="닫기"
                            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
                          />
                        }
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </DialogPrimitive.Close>
                    )}

                    <div className="space-y-2.5 pr-6">
                      <DialogPrimitive.Title
                        id="confirm-dialog-title"
                        className="text-lg font-semibold tracking-tight text-foreground"
                      >
                        {title}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description
                        id="confirm-dialog-description"
                        className="text-sm leading-relaxed text-muted-foreground"
                      >
                        {description}
                      </DialogPrimitive.Description>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 border-t border-border/50 bg-muted/20 px-6 py-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-[4.5rem] rounded-full border-border/80 bg-background/60"
                      onClick={() => handleOpenChange(false)}
                      disabled={loading}
                    >
                      {cancelLabel}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className={cn(
                        "min-w-[4.5rem] rounded-full font-semibold",
                        tone === "destructive"
                          ? "bg-foreground text-background hover:bg-foreground/90"
                          : "bg-foreground text-background hover:bg-foreground/90",
                      )}
                      onClick={() => void onConfirm()}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" aria-hidden />
                          처리 중…
                        </>
                      ) : (
                        confirmLabel
                      )}
                    </Button>
                  </div>
                </motion.div>
              }
            />
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
