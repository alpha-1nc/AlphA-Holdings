import * as React from "react";
import { cn } from "@/lib/utils";

/** uitripled stocks-dashboard와 동일한 Card 스타일 */
export function HoldingsCard({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function HoldingsCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

export function HoldingsCardTitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function HoldingsCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

/** uitripled badge outline — rounded-full + font-semibold */
export function HoldingsBadge({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium leading-none text-foreground",
        className,
      )}
      {...props}
    />
  );
}
