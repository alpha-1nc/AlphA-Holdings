"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/layout/theme-provider";
import clsx from "clsx";
import { useState } from "react";
import logo from "@assets/logo.png";
import logoDark from "@assets/logo-dark.png";
import { useLogoHomeCinematic } from "@/components/layout/logo-home-cinematic";
import { MobileTopHeader } from "@/components/layout/mobile-top-header";
import { MAIN_NAV_ITEMS } from "@/lib/nav-items";

interface NavIconButtonProps {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive: boolean;
}

function NavIconButton({ href, icon: Icon, label, isActive }: NavIconButtonProps) {
    const [hovered, setHovered] = useState(false);

    return (
        <div className="relative flex flex-col items-center">
            <Link
                href={href}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={clsx(
                    "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                        ? [
                              "bg-neutral-100 text-neutral-900",
                              "ring-1 ring-neutral-200/90 shadow-sm shadow-neutral-900/[0.06]",
                              "dark:bg-white/12 dark:text-white",
                              "dark:ring-white/20 dark:shadow-[0_1px_4px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.07)]",
                          ]
                        : [
                              "text-neutral-400 ring-1 ring-transparent",
                              "hover:-translate-y-0.5 hover:bg-neutral-100 hover:text-neutral-800",
                              "hover:ring-neutral-200/70 hover:shadow-sm hover:shadow-neutral-900/[0.05]",
                              "dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-200",
                              "dark:hover:ring-white/12 dark:hover:shadow-[0_1px_3px_rgba(0,0,0,0.45)]",
                          ]
                )}
            >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            </Link>

            {/* Tooltip — hidden on touch devices */}
            <div
                className={clsx(
                    "pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap",
                    "hidden rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg sm:block",
                    "dark:bg-white dark:text-neutral-900",
                    "transition-all duration-150",
                    hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                )}
            >
                {label}
                {/* Arrow */}
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900 dark:border-b-white" />
            </div>
        </div>
    );
}

export function TopNavbar() {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const [themeHovered, setThemeHovered] = useState(false);
    const { start: startLogoHome, portal: logoHomePortal } = useLogoHomeCinematic();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-neutral-200/60 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/85">
            {logoHomePortal}
            <div className="mx-auto max-w-screen-2xl px-4 md:px-10">
                {/* 모바일 전용: 좌 로고 · 가운데 메뉴 아이콘+제목 · 우 프로필 */}
                <div className="md:hidden">
                    <MobileTopHeader onLogoClick={startLogoHome} />
                </div>

                <div className="hidden h-[68px] items-center justify-between md:flex">
                {/* Logo + Brand — 클릭 시 시네마틱 홈 전환 */}
                <button
                    type="button"
                    aria-label="홈으로 이동"
                    onClick={startLogoHome}
                    className="flex items-center gap-2.5 select-none text-left group rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-950"
                >
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
                        <Image
                            src={logo}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 object-contain dark:hidden"
                            priority
                            aria-hidden
                        />
                        <Image
                            src={logoDark}
                            alt=""
                            width={36}
                            height={36}
                            className="hidden h-9 w-9 object-contain dark:block"
                            priority
                            aria-hidden
                        />
                    </div>
                    <span
                        className="hidden text-[17px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 transition-opacity duration-200 group-hover:opacity-80 sm:block"
                        style={{ fontFamily: "var(--font-inter), sans-serif", letterSpacing: "-0.025em" }}
                        aria-hidden
                    >
                        AlphA Holdings
                    </span>
                </button>

                {/* Icon Navigation — 데스크톱만 상단 아이콘 줄; 모바일은 하단 탭 */}
                <nav className="hidden items-center gap-0.5 md:flex md:gap-1.5">
                    {MAIN_NAV_ITEMS.map(({ href, icon, label }) => {
                        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                        return (
                            <NavIconButton
                                key={href}
                                href={href}
                                icon={icon}
                                label={label}
                                isActive={isActive}
                            />
                        );
                    })}

                    {/* Divider */}
                    <div className="mx-2 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

                    {/* Theme Toggle */}
                    <div className="relative flex flex-col items-center">
                        <button
                            onClick={toggleTheme}
                            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
                            onMouseEnter={() => setThemeHovered(true)}
                            onMouseLeave={() => setThemeHovered(false)}
                            className={clsx(
                                "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                                "ring-1 ring-transparent hover:-translate-y-0.5",
                                theme === "dark"
                                    ? "text-amber-400 hover:bg-amber-500/15 hover:text-amber-300 hover:ring-amber-400/30 hover:shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
                                    : "text-violet-600 hover:bg-violet-100 hover:text-violet-700 hover:ring-violet-300/55 hover:shadow-sm hover:shadow-violet-900/10"
                            )}
                        >
                            {theme === "dark" ? (
                                <Sun size={20} strokeWidth={1.8} />
                            ) : (
                                <Moon size={20} strokeWidth={1.8} />
                            )}
                        </button>

                        {/* Theme Tooltip — hidden on touch devices */}
                        <div
                            className={clsx(
                                "pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap",
                                "hidden rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg sm:block",
                                "dark:bg-white dark:text-neutral-900",
                                "transition-all duration-150",
                                themeHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                            )}
                        >
                            {theme === "dark" ? "라이트 모드" : "다크 모드"}
                            <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900 dark:border-b-white" />
                        </div>
                    </div>
                </nav>
                </div>
            </div>
        </header>
    );
}
