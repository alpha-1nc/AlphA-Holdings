"use client";

/** 셸 공통 배경 — 은은한 무채색 그라데이션 + 미세 노이즈. 로고 워터마크 없음. */

const NOISE_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function ShellBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 82% 8%, color-mix(in srgb, var(--foreground) 3%, transparent) 0%, transparent 55%), radial-gradient(110% 90% at 10% 100%, color-mix(in srgb, var(--foreground) 2.5%, transparent) 0%, transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay dark:opacity-[0.05]"
        style={{
          backgroundImage: NOISE_DATA_URI,
          backgroundRepeat: "repeat",
        }}
      />
    </div>
  );
}
