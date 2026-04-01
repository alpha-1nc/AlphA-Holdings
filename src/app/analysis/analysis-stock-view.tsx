"use client";

import { useCallback, useState, type ReactNode } from "react";
import { FileSearch } from "lucide-react";
import { PageMainTitle } from "@/components/layout/page-main-title";
import AnalysisLoader from "./AnalysisLoader";
import AnalysisTickerModal from "./analysis-ticker-modal";

export function AnalysisStockView({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTicker, setLoadingTicker] = useState("");

  const handleLoadingChange = useCallback((loading: boolean, ticker?: string) => {
    setIsLoading(loading);
    setLoadingTicker(ticker ?? "");
  }, []);

  return (
    <>
      <div
        role="banner"
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <PageMainTitle icon={FileSearch}>Stock Analysis Reports</PageMainTitle>
        </div>
        <AnalysisTickerModal onLoadingChange={handleLoadingChange} />
      </div>

      <hr className="my-2 h-px w-full shrink-0 border-0 bg-border" />

      <div className="min-h-[min(420px,72vh)] w-full">
        {isLoading ? (
          <AnalysisLoader ticker={loadingTicker} />
        ) : (
          children
        )}
      </div>
    </>
  );
}
