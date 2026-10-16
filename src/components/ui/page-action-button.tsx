import Link from "next/link";
import { cn } from "@/lib/utils";

/** 헤더 우측 보조 액션 — 수정·삭제 등 무채색 pill */
export const pageActionButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/50 px-4 py-2 text-xs font-semibold tracking-tight text-foreground/75 transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:pointer-events-none disabled:opacity-50";

type PageActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PageActionButton({ className, ...props }: PageActionButtonProps) {
  return <button type="button" className={cn(pageActionButtonClass, className)} {...props} />;
}

type PageActionLinkProps = React.ComponentProps<typeof Link>;

export function PageActionLink({ className, ...props }: PageActionLinkProps) {
  return <Link className={cn(pageActionButtonClass, className)} {...props} />;
}
