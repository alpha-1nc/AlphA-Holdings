"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";
import { CommandPalette } from "@/components/layout/command-palette";
import { MenuToggleIcon } from "@/components/layout/menu-toggle-icon";
import { useShell } from "@/components/layout/shell-context";

const headerIconBtn =
  "flex items-center justify-center rounded-full p-2 text-foreground transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5 active:bg-foreground/5";

export function AppHeader() {
  const { drawerOpen, toggleDrawer } = useShell();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex h-[72px] shrink-0 items-center justify-between gap-3 px-4 transition-[background-color,backdrop-filter] duration-200 md:px-8",
        // 스크롤 시에만 은은한 frosted — 드로어 열림은 투명 유지(라이트 흰 띠 방지)
        scrolled && "bg-background/30 backdrop-blur-sm",
      )}
    >
      <button
        type="button"
        onClick={toggleDrawer}
        aria-label={drawerOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={drawerOpen}
        className={cn("shrink-0", headerIconBtn)}
      >
        <MenuToggleIcon open={drawerOpen} className="h-7 w-7" />
      </button>

      <div className="flex items-center gap-3">
        <CommandPalette triggerClassName={headerIconBtn} />

        <AnimatedThemeToggle
          iconSize={22}
          className={headerIconBtn}
        />
      </div>
    </header>
  );
}
