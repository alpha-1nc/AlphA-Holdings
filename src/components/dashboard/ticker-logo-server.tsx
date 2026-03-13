"use client";

/**
 * TickerLogoServer (Client Component)
 *
 * [렌더링 전략]
 * - domain이 ticker-metadata.ts에 명시적으로 등록된 경우에만 이미지 요청
 * - domain 없음 → <img> 렌더 시도 없이 즉시 이니셜 아바타만 표시
 * - 이미지 로드 성공: imgReady=true → <img> 표시, 아바타는 opacity-0으로 숨김
 * - 이미지 로드 실패(404 등): imgError=true → <img> 완전 언마운트 → 아바타만 표시
 *
 * [API]
 * - unavatar.io?fallback=false: 로고 없을 때 404를 반환 → onError 100% 작동
 * - Google Favicon API는 로고 없을 때 기본 지구본 이미지를 반환하므로 사용하지 않음
 */

import { useState } from "react";
import { getTickerDomain } from "@/lib/ticker-metadata";

interface TickerLogoProps {
    ticker: string;
    size?: number;
}

export function TickerLogoServer({ ticker, size = 28 }: TickerLogoProps) {
    const [imgReady, setImgReady] = useState(false);
    const [imgError, setImgError] = useState(false);

    if (!ticker?.trim()) return null;

    // ticker-metadata.ts에 domain이 명시적으로 등록된 경우에만 src 생성
    const domain = getTickerDomain(ticker);
    const src = domain ? `https://unavatar.io/${domain}?fallback=false` : null;

    const initials =
        ticker
            .trim()
            .replace(/[^A-Za-z0-9]/g, "")
            .slice(0, 2)
            .toUpperCase() ||
        ticker.trim().slice(0, 2).toUpperCase();

    // domain 없거나 이미지 에러 → <img> 마운트하지 않음
    const mountImg = Boolean(src && !imgError);

    return (
        <span
            className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-neutral-200 dark:ring-neutral-700"
            style={{ width: size, height: size }}
        >
            {/* 아바타 레이어: 항상 DOM에 존재, 이미지 로드 성공 시 opacity-0 */}
            <span
                className="absolute inset-0 flex items-center justify-center bg-neutral-100 font-bold text-neutral-500 transition-opacity duration-150 dark:bg-neutral-800 dark:text-neutral-400"
                style={{
                    fontSize: Math.max(8, Math.floor(size * 0.32)),
                    opacity: imgReady ? 0 : 1,
                    pointerEvents: imgReady ? "none" : "auto",
                }}
                aria-hidden={imgReady}
            >
                {initials}
            </span>

            {/* 이미지 레이어: mountImg=false이면 DOM에서 완전 제거 */}
            {mountImg && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src!}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                        opacity: imgReady ? 1 : 0,
                        transition: "opacity 150ms ease",
                    }}
                    onLoad={() => setImgReady(true)}
                    onError={() => setImgError(true)}
                />
            )}
        </span>
    );
}
