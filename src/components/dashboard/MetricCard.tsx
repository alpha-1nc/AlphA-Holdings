"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const hoverTransition = { duration: 0.2 } as const;

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  /** 상승/하락 뱃지 — null 이면 미표시 */
  trend?: "up" | "down" | null;
  /** 뱃지 안 텍스트 (없으면 화살표만) */
  trendLabel?: string;
  index?: number;
}

export function MetricCard({
  icon: Icon,
  label,
  children,
  trend,
  trendLabel,
  index = 0,
}: MetricCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease, delay: 0.08 + index * 0.06 }}
      whileHover={reduceMotion ? undefined : { y: -4, transition: hoverTransition }}
      className="surface-card group relative overflow-hidden p-5 transition-all hover:border-border/60 hover:shadow-lg"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-foreground/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
      <div className="flex items-start justify-between gap-3">
        <Icon className="h-5 w-5 shrink-0 text-foreground/70" aria-hidden />
        {trend != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              trend === "up"
                ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/10 dark:text-emerald-400"
                : "bg-red-500/10 text-red-500 dark:bg-red-400/10 dark:text-red-400",
            )}
          >
            {trend === "up" ? (
              <ArrowUp className="h-3 w-3" aria-hidden />
            ) : (
              <ArrowDown className="h-3 w-3" aria-hidden />
            )}
            {trendLabel}
          </span>
        )}
      </div>
      <p className="shell-label mt-3">{label}</p>
      <div className="shell-num-lg mt-1.5">{children}</div>
      </div>
    </motion.div>
  );
}
