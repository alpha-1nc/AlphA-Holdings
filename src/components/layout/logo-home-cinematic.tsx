"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import logo from "@assets/logo.png";
import logoDark from "@assets/logo-dark.png";

export type LogoHomePhase = "idle" | "emerge" | "reveal" | "fadeout";

const EMERGE_MS = 1000;
/** reveal(로고 축소 + 텍스트)이 끝난 뒤 잠시 머물렀다가 페이드아웃 */
const REVEAL_TO_FADEOUT_MS = 1750;
const FADEOUT_MS = 500;

export function useLogoHomeCinematic() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [phase, setPhase] = useState<LogoHomePhase>("idle");
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const clearTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    useEffect(() => () => clearTimers(), [clearTimers]);

    useEffect(() => {
        if (phase !== "fadeout") return;
        const t = setTimeout(() => {
            router.push("/");
            setPhase("idle");
        }, FADEOUT_MS);
        return () => clearTimeout(t);
    }, [phase, router]);

    const start = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            if (phase !== "idle") return;

            clearTimers();
            setPhase("emerge");

            const t1 = setTimeout(() => setPhase("reveal"), EMERGE_MS);
            const t2 = setTimeout(() => setPhase("fadeout"), EMERGE_MS + REVEAL_TO_FADEOUT_MS);
            timersRef.current.push(t1, t2);
        },
        [phase, clearTimers]
    );

    const overlay =
        mounted && phase !== "idle" ? (
            <div
                role="presentation"
                aria-hidden
                className={clsx(
                    "fixed inset-0 z-[100] flex items-center justify-center",
                    "bg-white/95 backdrop-blur-sm dark:bg-neutral-950/95",
                    "transition-opacity duration-500 ease-out",
                    phase === "fadeout" ? "opacity-0" : "opacity-100"
                )}
            >
                <div className="flex items-center justify-center">
                    {/* 심볼: emerge에서 크게 등장 → reveal에서 160→72로 축소 */}
                    <div
                        className={clsx(
                            "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
                            "transition-[width,height] duration-[1000ms] ease-out will-change-[width,height]",
                            phase === "emerge" ? "h-[160px] w-[160px]" : "h-[72px] w-[72px]"
                        )}
                    >
                        <div
                            className={clsx(
                                "flex h-full w-full items-center justify-center",
                                phase === "emerge" && "animate-logo-emerge"
                            )}
                        >
                            <Image
                                src={logo}
                                alt=""
                                width={160}
                                height={160}
                                className="h-full w-full max-h-[160px] max-w-[160px] object-contain dark:hidden"
                                aria-hidden
                            />
                            <Image
                                src={logoDark}
                                alt=""
                                width={160}
                                height={160}
                                className="hidden h-full w-full max-h-[160px] max-w-[160px] object-contain dark:block"
                                aria-hidden
                            />
                        </div>
                    </div>

                    {/* 브랜드 텍스트: reveal에서만 펼쳐짐 */}
                    <div
                        className={clsx(
                            "overflow-hidden will-change-[max-width,opacity]",
                            "transition-[max-width,margin-left,opacity] duration-[1050ms] ease-out",
                            phase === "emerge"
                                ? "ml-0 max-w-0 opacity-0 delay-0"
                                : "ml-3 max-w-[300px] opacity-100 delay-150"
                        )}
                    >
                        <span
                            className="block whitespace-nowrap text-[17px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50"
                            style={{
                                fontFamily: "var(--font-inter), sans-serif",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            AlphA Holdings
                        </span>
                    </div>
                </div>
            </div>
        ) : null;

    return {
        start,
        portal: mounted && overlay ? createPortal(overlay, document.body) : null,
    };
}
