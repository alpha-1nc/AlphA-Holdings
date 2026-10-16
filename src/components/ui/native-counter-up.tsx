"use client";

import { cn } from "@/lib/utils";
import { animate, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export interface NativeCounterUpProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label?: string;
  autoStart?: boolean;
  className?: string;
}

export function NativeCounterUp({
  value,
  duration = 2,
  prefix = "",
  suffix = "",
  decimals = 0,
  label,
  autoStart = true,
  className,
}: NativeCounterUpProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!autoStart) return;
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }
    setDisplayValue(0);
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplayValue(
          decimals > 0 ? Number(latest.toFixed(decimals)) : Math.round(latest),
        );
      },
    });
    return () => controls.stop();
  }, [value, duration, autoStart, shouldReduceMotion, decimals]);

  const formattedValue = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn("tabular-nums font-bold", className)}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {prefix}
      {formattedValue}
      {suffix}
      {label && <span className="sr-only">{label}</span>}
    </motion.span>
  );
}
