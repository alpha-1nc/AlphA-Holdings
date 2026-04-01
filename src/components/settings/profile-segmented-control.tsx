"use client";

import { motion } from "framer-motion";
import type { WorkspaceProfile } from "@/lib/profile";

const SEGMENTS: { id: WorkspaceProfile; label: string }[] = [
    { id: "alpha-ceo", label: "AlphA Holdings Portfolio" },
    { id: "partner", label: "MindongFolio" },
];

type ProfileSegmentedControlProps = {
    value: WorkspaceProfile;
    onChange: (profile: WorkspaceProfile) => void;
};

export function ProfileSegmentedControl({
    value,
    onChange,
}: ProfileSegmentedControlProps) {
    const activeIndex = Math.max(0, SEGMENTS.findIndex((s) => s.id === value));

    return (
        <div className="w-full rounded-full bg-neutral-200/95 p-1.5 ring-1 ring-neutral-300/80 dark:bg-neutral-800/95 dark:ring-0">
            <div className="relative flex w-full">
                <motion.div
                    layout
                    layoutDependency={value}
                    className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 rounded-full bg-white shadow-lg ring-1 ring-black/5 dark:bg-neutral-600/95 dark:shadow-black/40 dark:ring-0"
                    initial={false}
                    animate={{
                        x: activeIndex === 0 ? 0 : "100%",
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 520,
                        damping: 38,
                        mass: 0.8,
                    }}
                />
                {SEGMENTS.map((seg) => {
                    const isActive = seg.id === value;
                    return (
                        <button
                            key={seg.id}
                            type="button"
                            onClick={() => onChange(seg.id)}
                            className={
                                "relative z-10 flex min-h-[44px] flex-1 items-center justify-center rounded-full px-6 py-3 text-center text-sm font-semibold leading-snug transition-colors " +
                                (isActive
                                    ? "text-neutral-900 dark:text-neutral-50"
                                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200")
                            }
                        >
                            {seg.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
