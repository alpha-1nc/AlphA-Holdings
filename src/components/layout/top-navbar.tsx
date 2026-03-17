"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, PenLine, Settings, Moon, Sun, BarChart2, TrendingUp, FileSearch } from "lucide-react";
import { useTheme } from "@/components/layout/theme-provider";
import clsx from "clsx";
import { useState } from "react";
import logo from "@assets/logo.png";
import logoDark from "@assets/logo-dark.png";

const navItems = [
    { href: "/", icon: Home, label: "홈" },
    { href: "/monthly", icon: BarChart2, label: "월별 리포트" },
    { href: "/quarterly", icon: TrendingUp, label: "분기별 리포트" },
    { href: "/analysis", icon: FileSearch, label: "투자 분석" },
    { href: "/reports/new", icon: PenLine, label: "새 리포트" },
    { href: "/settings", icon: Settings, label: "설정" },
];

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
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={clsx(
                    "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                        ? "bg-neutral-100 text-neutral-900 dark:bg-white/12 dark:text-white shadow-sm"
                        : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 hover:-translate-y-0.5 dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-200"
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

    return (
        <header className="sticky top-0 z-50 w-full border-b border-neutral-200/60 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/85">
            <div className="mx-auto flex h-[68px] max-w-screen-2xl items-center justify-between px-4 md:px-8">
                {/* Logo + Brand */}
                <Link href="/" className="flex items-center gap-2.5 select-none group">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
                        <Image
                            src={logo}
                            alt="AlphA Holdings logo"
                            width={36}
                            height={36}
                            className="h-9 w-9 object-contain dark:hidden"
                            priority
                        />
                        <Image
                            src={logoDark}
                            alt="AlphA Holdings logo"
                            width={36}
                            height={36}
                            className="hidden h-9 w-9 object-contain dark:block"
                            priority
                        />
                    </div>
                    <span
                        className="hidden text-[17px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 transition-opacity duration-200 group-hover:opacity-80 sm:block"
                        style={{ fontFamily: "var(--font-inter), sans-serif", letterSpacing: "-0.025em" }}
                    >
                        AlphA Holdings
                    </span>
                </Link>

                {/* Icon Navigation */}
                <nav className="flex items-center gap-0.5 md:gap-1.5">
                    {navItems.map(({ href, icon, label }) => {
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
                                "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 hover:-translate-y-0.5",
                                "dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-200"
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
        </header>
    );
}
