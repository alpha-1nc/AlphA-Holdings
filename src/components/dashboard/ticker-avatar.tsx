"use client";

import { useState, useRef, useEffect } from "react";
import { getTickerDisplayName } from "@/lib/ticker-metadata";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TickerAvatarProps {
    ticker: string;
    logoUrl?: string | null;
    size?: number;
    /** 편집 가능 시 클릭하여 이미지 URL/붙여넣기 */
    editable?: boolean;
    onLogoChange?: (url: string | null) => void;
}

export function TickerAvatar({
    ticker,
    logoUrl,
    size = 28,
    editable = false,
    onLogoChange,
}: TickerAvatarProps) {
    const [imgError, setImgError] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pasteInput, setPasteInput] = useState(logoUrl || "");
    const inputRef = useRef<HTMLInputElement>(null);
    const prevLogoUrl = useRef(logoUrl);

    const displayName = getTickerDisplayName(ticker);
    const initial = displayName ? displayName[0] : ticker?.trim().slice(0, 1)?.toUpperCase() || "?";

    const hasValidLogo = logoUrl?.trim() && !imgError;
    const sizeClass = size === 28 ? "h-7 w-7" : "h-6 w-6";

    useEffect(() => {
        if (prevLogoUrl.current !== logoUrl) {
            setImgError(false);
            prevLogoUrl.current = logoUrl;
        }
    }, [logoUrl]);

    useEffect(() => {
        if (dialogOpen) {
            setPasteInput(logoUrl || "");
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [dialogOpen, logoUrl]);

    const handleSave = () => {
        const raw = pasteInput.trim();
        const url = raw && !raw.startsWith("(") ? raw : null;
        console.log(`[TickerAvatar] 저장: ${ticker}, URL:`, url?.substring(0, 50));
        onLogoChange?.(url);
        setDialogOpen(false);
    };

    const handlePasteFromClipboard = async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith("image/")) {
                        const blob = await item.getType(type);
                        const dataUrl = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        setPasteInput(dataUrl);
                        return;
                    }
                }
            }
            setPasteInput((prev) => prev || "(클립보드에 이미지가 없습니다)");
        } catch (err) {
            console.warn("[클립보드 읽기]", err);
            setPasteInput((prev) => prev || "(클립보드 접근 권한이 필요합니다)");
        }
    };

    const avatarEl = (
        <span
            className={`relative inline-flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-neutral-200 dark:ring-neutral-700 ${
                editable ? "cursor-pointer transition hover:ring-neutral-400 dark:hover:ring-neutral-500" : ""
            }`}
            onClick={editable ? () => setDialogOpen(true) : undefined}
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
            onKeyDown={editable ? (e) => e.key === "Enter" && setDialogOpen(true) : undefined}
            title={editable ? "클릭하여 이미지 변경" : undefined}
        >
            {/* 아바타: 이미지 또는 첫 글자 */}
            <span
                className="absolute inset-0 flex items-center justify-center bg-neutral-100 font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                style={{
                    fontSize: Math.max(10, Math.floor(size * 0.4)),
                    opacity: hasValidLogo ? 0 : 1,
                }}
                aria-hidden={hasValidLogo || undefined}
            >
                {initial}
            </span>
            {hasValidLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    key={logoUrl}
                    src={logoUrl!}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() => {
                        console.warn(`[TickerAvatar] 이미지 로드 실패: ${ticker}`);
                        setImgError(true);
                    }}
                    onLoad={() => {
                        console.log(`[TickerAvatar] 이미지 로드 성공: ${ticker}`);
                    }}
                />
            )}
        </span>
    );

    return (
        <>
            {avatarEl}
            {editable && onLogoChange && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-md" showCloseButton>
                        <DialogHeader>
                            <DialogTitle className="text-sm">종목 이미지 설정</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                    이미지 URL 붙여넣기
                                </label>
                                <Input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="https://... 또는 Ctrl+V로 이미지 붙여넣기"
                                    value={pasteInput}
                                    onChange={(e) => setPasteInput(e.target.value)}
                                    onPaste={(e) => {
                                        const items = e.clipboardData?.items;
                                        if (items) {
                                            for (let i = 0; i < items.length; i++) {
                                                const item = items[i];
                                                if (item.type.startsWith("image/")) {
                                                    e.preventDefault();
                                                    const blob = item.getAsFile();
                                                    if (blob) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            if (reader.result) {
                                                                console.log(`[TickerAvatar] 이미지 붙여넣기 성공: ${ticker}`);
                                                                setPasteInput(reader.result as string);
                                                            }
                                                        };
                                                        reader.onerror = () => {
                                                            console.error(`[TickerAvatar] 이미지 읽기 실패: ${ticker}`);
                                                        };
                                                        reader.readAsDataURL(blob);
                                                    }
                                                    return;
                                                }
                                            }
                                        }
                                    }}
                                    className="font-mono text-xs"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={handlePasteFromClipboard}
                            >
                                클립보드에서 이미지 가져오기
                            </Button>
                            {pasteInput && pasteInput.startsWith("data:image/") && (
                                <div className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
                                    <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">미리보기:</p>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={pasteInput}
                                        alt="preview"
                                        className="h-20 w-20 rounded-lg object-cover"
                                        onError={() => console.error(`[TickerAvatar] 미리보기 로드 실패`)}
                                    />
                                </div>
                            )}
                        </div>
                        <DialogFooter className="mt-4 gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onLogoChange(null);
                                    setDialogOpen(false);
                                }}
                            >
                                이미지 제거
                            </Button>
                            <Button type="button" size="sm" onClick={handleSave}>
                                저장
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
