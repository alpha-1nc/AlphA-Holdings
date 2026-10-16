"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export function DashboardStagger({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** 섹션 순서별 지연(초) */
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease, delay }}
    >
      {children}
    </motion.div>
  );
}
