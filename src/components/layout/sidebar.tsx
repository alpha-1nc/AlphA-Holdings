"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  PlusCircle,
} from "lucide-react";
import logo from "@assets/logo.png";
import logoDark from "@assets/logo-dark.png";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Monthly Report",
    href: "/monthly",
    icon: FileText,
  },
  {
    label: "Quarterly Report",
    href: "/quarterly",
    icon: BarChart3,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {/* Brand */}
      <div className="flex h-20 items-center gap-3 border-b border-neutral-100 px-6 backdrop-blur-xl dark:border-neutral-800/80">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-neutral-900/5 shadow-[0_0_0_1px_rgba(15,23,42,0.03)] dark:bg-white/5 dark:shadow-[0_0_0_1px_rgba(15,23,42,0.35)]">
          <Image
            src={logo}
            alt="AlphA Holdings logo"
            className="h-8 w-8 object-contain dark:hidden"
            priority
          />
          <Image
            src={logoDark}
            alt="AlphA Holdings logo"
            className="hidden h-8 w-8 object-contain dark:block"
            priority
          />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
            AlphA Holdings
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Menu
        </p>
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active
                    ? "text-white dark:text-neutral-900"
                    : "text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-white"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 새 리포트 작성 CTA */}
      <div className="px-3 pb-2">
        <Link
          href="/reports/new"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          <PlusCircle className="h-4 w-4 shrink-0" />
          새 리포트 작성
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-100 px-3 py-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-500 transition-all hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-neutral-400" />
            <span>Appearance</span>
          </div>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-900 dark:text-neutral-300">
            {theme === "dark" ? "Dark" : "Light"}
          </span>
        </button>
      </div>
    </aside>
  );
}
