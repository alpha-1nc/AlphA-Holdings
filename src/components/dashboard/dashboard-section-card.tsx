"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const hoverTransition = { duration: 0.2 } as const;

const contentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease } },
};

interface DashboardSectionCardProps {
  label: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  index?: number;
}

export function DashboardSectionCard({
  label,
  meta,
  children,
  className,
  labelClassName,
  index = 0,
}: DashboardSectionCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.42, ease, delay: 0.08 + index * 0.06 }
      }
      whileHover={reduceMotion ? undefined : { y: -4, transition: hoverTransition }}
      className={cn(
        "surface-card group relative h-full overflow-hidden p-6 transition-all hover:border-border/60 hover:shadow-lg",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-foreground/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <motion.div
        className="relative flex h-full flex-col"
        variants={reduceMotion ? undefined : contentVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
      >
        <motion.div
          variants={itemVariants}
          className="flex items-start justify-between gap-3"
        >
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.25em] text-foreground/40",
              labelClassName,
            )}
          >
            {label}
          </p>
          {meta}
        </motion.div>

        <motion.div variants={itemVariants} className="mt-5 min-h-0 flex-1">
          {children}
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
