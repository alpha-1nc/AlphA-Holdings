"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

type CountUpProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** 애니메이션 길이(초). 기본 1.1s */
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  /** 자릿수별 미세 스태거(슬롯머신 느낌) */
  slotMachine?: boolean;
};

function formatNumber(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** ease-out cubic */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 마운트 시 0 → value 로 부드럽게 증가(ease-out).
 * 천단위 콤마 포맷. prefers-reduced-motion 이면 즉시 최종값.
 */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.1,
  className,
  style,
  slotMachine = false,
}: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const [animated, setAnimated] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) return;

    let start: number | null = null;
    const durationMs = Math.max(duration, 0.01) * 1000;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / durationMs, 1);
      setAnimated(progress < 1 ? value * easeOut(progress) : value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, reduceMotion]);

  const display = reduceMotion ? value : animated;
  const formatted = formatNumber(display, decimals);
  const fullText = `${prefix}${formatted}${suffix}`;

  if (!slotMachine || reduceMotion) {
    return (
      <span className={className} style={style}>
        {fullText}
      </span>
    );
  }

  // 슬롯머신: 각 문자에 미세 지연 + translateY
  const chars = fullText.split("");
  let digitIdx = 0;
  const overallProgress = value > 0 ? display / value : 1;

  return (
    <span className={className} style={style} aria-label={fullText}>
      {chars.map((char, i) => {
        const isDigit = /\d/.test(char);
        const stagger = isDigit ? digitIdx++ * 0.06 : 0;
        const progress = Math.min(1, Math.max(0, overallProgress - stagger));
        const y = (1 - easeOut(progress)) * (isDigit ? 0.55 : 0.35);

        return (
          <span
            key={`${i}-${char}`}
            className="inline-block tabular-nums"
            style={{
              transform: `translateY(${y}em)`,
              opacity: 0.35 + progress * 0.65,
              transition: "transform 80ms ease-out, opacity 80ms ease-out",
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
