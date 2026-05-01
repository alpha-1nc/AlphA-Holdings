"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TickerAvatar } from "@/components/dashboard/ticker-avatar";
import { updatePortfolioItemLogo } from "@/app/actions/update-portfolio-item-logo";

export function PortfolioItemLogoAvatar({
  portfolioItemId,
  reportId,
  ticker,
  displayName,
  logoUrl,
}: {
  portfolioItemId: number;
  reportId: number;
  ticker: string;
  displayName?: string | null;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <TickerAvatar
      ticker={ticker}
      displayName={displayName}
      logoUrl={logoUrl}
      size={44}
      autoFmpLogo
      editable
      isSaving={isPending}
      onLogoChange={(url) => {
        startTransition(async () => {
          const result = await updatePortfolioItemLogo(
            portfolioItemId,
            reportId,
            url
          );
          if (result.ok) {
            toast.success(
              url ? "종목 이미지를 저장했습니다." : "종목 이미지를 삭제했습니다."
            );
            router.refresh();
          } else {
            toast.error(result.error);
          }
        });
      }}
    />
  );
}
