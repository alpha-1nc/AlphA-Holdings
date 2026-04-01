"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import logoLight from "@assets/logo.png";
import logoDark from "@assets/logo-dark.png";
import { useTheme } from "@/components/layout/theme-provider";
import { cn } from "@/lib/utils";

const MESSAGE_BUILDERS = [
  (ticker: string) => `Analysing MARKET DATA for ${ticker}...`,
  () => "Fetching Composite Score...",
  () => "Synthesizing AI Insights...",
  () => "Finalizing Alpha Report...",
] as const;

/** 타원 궤도 + 중심으로 수축하는 입자 레이어 */
function FluxParticles({
  ringRadius,
  count,
  spinDurationSec,
  sinkDurationSec,
  delayStepSec,
  particleClass,
  reverse,
  sinkKeyframes,
}: {
  ringRadius: number;
  count: number;
  spinDurationSec: number;
  sinkDurationSec: number;
  delayStepSec: number;
  particleClass: string;
  reverse?: boolean;
  sinkKeyframes: "analysis-flux-sink-outer" | "analysis-flux-sink-inner";
}) {
  const step = 360 / count;
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{
        animation: `analysis-flux-spin ${spinDurationSec}s linear infinite`,
        animationDirection: reverse ? "reverse" : "normal",
      }}
    >
      <div
        className="relative flex h-[1px] w-[1px] items-center justify-center"
        style={{ transform: "scaleY(0.52)" }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={`${ringRadius}-${i}`}
            className="absolute left-0 top-0"
            style={{ transform: `rotate(${i * step}deg)` }}
          >
            <div
              className="relative flex h-0 w-0 items-center justify-center"
              style={{ transform: `translateY(-${ringRadius}px)` }}
            >
              <div
                className={cn("h-2 w-2 rounded-full", particleClass)}
                style={{
                  animation: `${sinkKeyframes} ${sinkDurationSec}s ease-in-out infinite`,
                  animationDelay: `${i * delayStepSec}s`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisLoaderDark({ ticker }: { ticker: string }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(1);

  const line = useMemo(() => {
    const t = ticker.trim() || "—";
    return MESSAGE_BUILDERS[msgIndex](t);
  }, [msgIndex, ticker]);

  useEffect(() => {
    if (!ticker.trim()) return;
    setMsgIndex(0);
  }, [ticker]);

  useEffect(() => {
    if (!ticker.trim()) return;
    const id = window.setInterval(() => {
      setFade(0);
      window.setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGE_BUILDERS.length);
        setFade(1);
      }, 280);
    }, 3000);
    return () => window.clearInterval(id);
  }, [ticker]);

  return (
    <div
      className="relative flex min-h-[min(420px,72vh)] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-background px-4 py-14"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes analysis-flux-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes analysis-flux-sink-outer {
  0% { transform: translate3d(0,0,0) scale(1); opacity: 0.42; filter: blur(0); }
  78% { opacity: 0.78; }
  100% { transform: translate3d(0, 88px, 0) scale(0.12); opacity: 0; filter: blur(0.5px); }
}
@keyframes analysis-flux-sink-inner {
  0% { transform: translate3d(0,0,0) scale(1); opacity: 0.4; filter: blur(0); }
  78% { opacity: 0.75; }
  100% { transform: translate3d(0, 56px, 0) scale(0.1); opacity: 0; filter: blur(0.45px); }
}
`,
        }}
      />

      <div className="relative flex h-[220px] w-[220px] items-center justify-center sm:h-[260px] sm:w-[260px]">
        <FluxParticles
          ringRadius={88}
          count={8}
          spinDurationSec={3.4}
          sinkDurationSec={2.85}
          delayStepSec={0.32}
          sinkKeyframes="analysis-flux-sink-outer"
          particleClass="bg-emerald-400/55 shadow-[0_0_14px_rgba(52,211,153,0.35)]"
        />
        <FluxParticles
          ringRadius={56}
          count={6}
          spinDurationSec={2.2}
          sinkDurationSec={2.2}
          delayStepSec={0.28}
          reverse
          sinkKeyframes="analysis-flux-sink-inner"
          particleClass="bg-emerald-300/45 shadow-[0_0_10px_rgba(110,231,183,0.32)]"
        />

        <div className="relative z-10 flex h-[120px] w-[120px] items-center justify-center sm:h-[132px] sm:w-[132px]">
          <Image
            src={logoDark}
            alt=""
            width={132}
            height={132}
            className="h-full w-full object-contain opacity-90 animate-pulse"
            priority
          />
        </div>
      </div>

      <p
        className="mt-10 max-w-md text-center text-xs font-medium tracking-wide text-neutral-400 transition-opacity duration-300 ease-out dark:text-neutral-400"
        style={{ opacity: fade }}
      >
        {line}
      </p>
    </div>
  );
}

function AnalysisLoaderLight({ ticker }: { ticker: string }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(1);

  const line = useMemo(() => {
    const t = ticker.trim() || "—";
    return MESSAGE_BUILDERS[msgIndex](t);
  }, [msgIndex, ticker]);

  useEffect(() => {
    if (!ticker.trim()) return;
    setMsgIndex(0);
  }, [ticker]);

  useEffect(() => {
    if (!ticker.trim()) return;
    const id = window.setInterval(() => {
      setFade(0);
      window.setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGE_BUILDERS.length);
        setFade(1);
      }, 280);
    }, 3000);
    return () => window.clearInterval(id);
  }, [ticker]);

  return (
    <div
      className="relative flex min-h-[min(420px,72vh)] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-background px-4 py-14"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes analysis-flux-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes analysis-flux-sink-outer {
  0% { transform: translate3d(0,0,0) scale(1); opacity: 0.36; filter: blur(0); }
  78% { opacity: 0.7; }
  100% { transform: translate3d(0, 88px, 0) scale(0.1); opacity: 0; filter: blur(0.4px); }
}
@keyframes analysis-flux-sink-inner {
  0% { transform: translate3d(0,0,0) scale(1); opacity: 0.34; filter: blur(0); }
  78% { opacity: 0.68; }
  100% { transform: translate3d(0, 56px, 0) scale(0.08); opacity: 0; filter: blur(0.4px); }
}
`,
        }}
      />

      <div className="relative flex h-[220px] w-[220px] items-center justify-center sm:h-[260px] sm:w-[260px]">
        <FluxParticles
          ringRadius={88}
          count={8}
          spinDurationSec={3.4}
          sinkDurationSec={2.85}
          delayStepSec={0.32}
          sinkKeyframes="analysis-flux-sink-outer"
          particleClass="bg-emerald-600/40 shadow-[0_0_12px_rgba(5,150,105,0.28)]"
        />
        <FluxParticles
          ringRadius={56}
          count={6}
          spinDurationSec={2.2}
          sinkDurationSec={2.2}
          delayStepSec={0.28}
          reverse
          sinkKeyframes="analysis-flux-sink-inner"
          particleClass="bg-emerald-500/35 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
        />

        <div className="relative z-10 flex h-[120px] w-[120px] items-center justify-center sm:h-[132px] sm:w-[132px]">
          <Image
            src={logoLight}
            alt=""
            width={132}
            height={132}
            className="h-full w-full object-contain opacity-95 animate-pulse"
            priority
          />
        </div>
      </div>

      <p
        className="mt-10 max-w-md text-center text-xs font-medium tracking-wide text-neutral-500 transition-opacity duration-300 ease-out"
        style={{ opacity: fade }}
      >
        {line}
      </p>
    </div>
  );
}

export default function AnalysisLoader({ ticker }: { ticker: string }) {
  const { theme } = useTheme();
  return theme === "dark" ? (
    <AnalysisLoaderDark ticker={ticker} />
  ) : (
    <AnalysisLoaderLight ticker={ticker} />
  );
}

export { AnalysisLoaderDark, AnalysisLoaderLight };
