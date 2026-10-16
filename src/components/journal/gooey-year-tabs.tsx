"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GooeyFilter } from "@/components/ui/gooey-filter";
import { useScreenSize } from "@/hooks/use-screen-size";
import { Button } from "@/components/ui/button";

/* ──────────────────────────────────────────────────────────────
   Gooey 연도 탭 — 원본 GooeyDemo(21st.dev) 이식.
   시각/모션은 원본 그대로: 흰 패널(bg-[#efefef]) + 검은 글씨 대비,
   gooey filter, layoutId 활성 탭, AnimatePresence blur 페이드.
   변경점: 더미 .md 목록 → props(연도별 일지/리포트) 데이터만 교체.
   없는 폰트(font-calendas/font-overusedGrotesk)는 기본 sans 로 대체.
   ────────────────────────────────────────────────────────────── */

export interface GooeyYearEntry {
  id: string;
  period: string;
  keyword?: string;
}

export interface GooeyYear {
  year: string;
  entries: GooeyYearEntry[];
}

interface GooeyYearTabsProps {
  years: GooeyYear[];
  onSelect?: (id: string) => void;
}

export function GooeyYearTabs({ years, onSelect }: GooeyYearTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [isGooeyEnabled, setIsGooeyEnabled] = useState(true);
  const screenSize = useScreenSize();

  const activeYear = years[activeTab];

  return (
    <div className="relative flex h-full min-h-[600px] w-full justify-center p-8 text-xs sm:text-sm md:text-base">
      <GooeyFilter
        id="gooey-filter"
        strength={screenSize.isBelow("md") ? 8 : 15}
      />

      <Button
        variant="outline"
        onClick={() => setIsGooeyEnabled(!isGooeyEnabled)}
        className="absolute top-4 left-4"
      >
        {isGooeyEnabled ? "Disable filter" : "Enable filter"}
      </Button>

      <div className="relative mt-24 w-11/12 md:w-4/5">
        <div
          className="absolute inset-0"
          style={{ filter: isGooeyEnabled ? "url(#gooey-filter)" : "none" }}
        >
          <div className="flex w-full">
            {years.map((_, index) => (
              <div key={index} className="relative h-8 flex-1 md:h-12">
                {activeTab === index && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-[#efefef]"
                    transition={{
                      type: "spring",
                      bounce: 0.0,
                      duration: 0.4,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          {/* Content panel */}
          <div className="h-[200px] w-full overflow-hidden bg-[#efefef] text-muted-foreground sm:h-[250px] md:h-[300px]">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeTab}
                initial={{
                  opacity: 0,
                  y: 50,
                  filter: "blur(10px)",
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  y: -50,
                  filter: "blur(10px)",
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeOut",
                }}
                className="p-8 md:p-12"
              >
                <div className="mt-4 space-y-2 sm:mt-8 md:mt-8">
                  <ul>
                    {activeYear?.entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="border-b border-muted-foreground/50 pt-2 pb-1 text-black"
                      >
                        <button
                          type="button"
                          onClick={() => onSelect?.(entry.id)}
                          className="w-full cursor-pointer text-left"
                        >
                          {entry.keyword
                            ? `${entry.period} · ${entry.keyword}`
                            : entry.period}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Interactive text overlay, no filter */}
        <div className="relative flex w-full">
          {years.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className="h-8 flex-1 md:h-12"
            >
              <span
                className={`flex h-full w-full items-center justify-center ${
                  activeTab === index ? "text-black" : "text-muted-foreground"
                }`}
              >
                {tab.year}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
