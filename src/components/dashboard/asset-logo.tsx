"use client";

import { useState } from "react";

interface AssetLogoProps {
    logoUrl?: string | null;
    companyName: string;
    ticker: string;
}

export function AssetLogo({ logoUrl, companyName, ticker }: AssetLogoProps) {
    const [hasError, setHasError] = useState(false);

    if (!logoUrl || hasError) {
        return (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-sm font-bold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                {ticker[0]}
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={logoUrl}
            alt={companyName}
            className="h-9 w-9 rounded-xl object-contain bg-neutral-50 p-0.5"
            onError={() => setHasError(true)}
        />
    );
}
