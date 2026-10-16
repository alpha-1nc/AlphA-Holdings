"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedAccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AnimatedAccordion({
  title,
  children,
  defaultOpen = false,
  className,
}: AnimatedAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/30", className)}>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.04]"
        whileHover={reduceMotion ? undefined : { backgroundColor: "rgba(0,0,0,0.02)" }}
        aria-expanded={open}
      >
        <span className="text-[11px] font-medium text-foreground/45">{title}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeInOut" }}
          className="shrink-0 text-foreground/35"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </motion.span>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeInOut" }}
          >
            <div className="border-t border-border/25 px-3 py-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
