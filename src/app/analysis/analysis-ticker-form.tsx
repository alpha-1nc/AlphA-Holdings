"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateAnalysisAction } from "@/app/actions/generate-analysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AnalysisTickerForm() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await generateAnalysisAction(ticker);
      if (result.success && result.slug && result.year && result.month) {
        toast.success("분석 리포트가 생성되었습니다.");
        router.push(`/analysis/${result.year}/${result.month}/${result.slug}`);
        router.refresh();
        setTicker("");
      } else {
        toast.error(result.error ?? "분석 생성에 실패했습니다.");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <label
          htmlFor="analysis-ticker"
          className="text-sm font-medium text-foreground"
        >
          티커
        </label>
        <Input
          id="analysis-ticker"
          name="ticker"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="예: AAPL"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="font-mono"
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full shrink-0 sm:w-auto">
        {pending ? "분석 중…" : "리포트 생성"}
      </Button>
    </form>
  );
}
