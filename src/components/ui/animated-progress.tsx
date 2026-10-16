"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type DeviationProgressTone = "over" | "under";

interface DeviationProgressBarProps {
  /** 0–50: half-bar width from center — over fills left, under fills right */
  fillPercent: number;
  tone: DeviationProgressTone;
  /** 0–1: stronger deviation → higher emphasis */
  intensity?: number;
  animDelay?: number;
  className?: string;
}

export function DeviationProgressBar({
  fillPercent,
  tone,
  intensity = 0.7,
  animDelay = 0,
  className,
}: DeviationProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const width = useTransform(progress, (v) => `${v}%`);
  const clamped = Math.min(Math.max(fillPercent, 0), 50);
  const opacity = 0.45 + intensity * 0.55;

  const barColor = tone === "over" ? "var(--down)" : "var(--up)";

  useEffect(() => {
    if (reduceMotion) {
      progress.set(clamped);
      return;
    }
    const controls = animate(progress, clamped, {
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
      delay: animDelay,
    });
    return controls.stop;
  }, [clamped, animDelay, progress, reduceMotion]);

  return (
    <div
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]",
        className,
      )}
      aria-hidden
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/15" />
      {tone === "over" && (
        <motion.div
          className="absolute inset-y-0 right-1/2 rounded-l-full"
          style={{ width, background: barColor, opacity }}
        />
      )}
      {tone === "under" && (
        <motion.div
          className="absolute inset-y-0 left-1/2 rounded-r-full"
          style={{ width, background: barColor, opacity }}
        />
      )}
    </div>
  );
}
