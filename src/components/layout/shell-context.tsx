"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type ShellContextValue = {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);

  return (
    <ShellContext.Provider value={{ drawerOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell must be used within a ShellProvider");
  }
  return ctx;
}
