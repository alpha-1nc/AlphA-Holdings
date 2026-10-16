"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import logo from "@assets/logo.png";
import logoDark from "@assets/logo-dark.png";
import { MAIN_NAV_ITEMS } from "@/lib/nav-items";
import { useShell } from "@/components/layout/shell-context";

const DRAWER_WIDTH = 272;
const SHELL_HEADER_HEIGHT = 72;

function DrawerBrandBlock({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex shrink-0 items-center gap-3 px-5 pb-5 transition-opacity hover:opacity-80"
      aria-label="AlphA Holdings 홈"
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
        <Image
          src={logo}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 object-contain dark:hidden"
          priority
          aria-hidden
        />
        <Image
          src={logoDark}
          alt=""
          width={40}
          height={40}
          className="hidden h-10 w-10 object-contain dark:block"
          priority
          aria-hidden
        />
      </div>
      <span className="truncate text-base font-semibold tracking-tight text-foreground">
        AlphA Holdings
      </span>
    </Link>
  );
}

function DrawerNavItem({
  href,
  icon: Icon,
  label,
  isActive,
  onNavigate,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-200 ease-out",
        isActive
          ? "bg-foreground/[0.06] text-foreground"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
      )}
    >
      <Icon
        size={24}
        strokeWidth={isActive ? 2.2 : 1.75}
        className="shrink-0"
      />
      <span className="text-[15px] font-medium tracking-tight">{label}</span>
    </Link>
  );
}

export function AppDrawer() {
  const pathname = usePathname();
  const { drawerOpen, closeDrawer } = useShell();

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.button
            type="button"
            aria-label="메뉴 닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeDrawer}
            className="fixed inset-x-0 bottom-0 z-[45] bg-black/40 backdrop-blur-[2px]"
            style={{ top: SHELL_HEADER_HEIGHT }}
          />

          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ width: DRAWER_WIDTH, paddingTop: SHELL_HEADER_HEIGHT }}
            className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/40 bg-background shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="내비게이션 메뉴"
          >
            <DrawerBrandBlock onNavigate={closeDrawer} />

            <nav className="flex flex-col gap-2 px-4 pb-8">
              {MAIN_NAV_ITEMS.map(({ href, icon, shellLabel }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <DrawerNavItem
                    key={href}
                    href={href}
                    icon={icon}
                    label={shellLabel}
                    isActive={isActive}
                    onNavigate={closeDrawer}
                  />
                );
              })}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
