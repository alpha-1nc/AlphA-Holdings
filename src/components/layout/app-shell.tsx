"use client";

import { AppDrawer } from "@/components/layout/app-drawer";
import { AppHeader } from "@/components/layout/app-header";
import { ShellBackground } from "@/components/layout/shell-background";
import { ShellProvider } from "@/components/layout/shell-context";

function AppShellInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen min-w-0">
      <ShellBackground />
      <AppDrawer />
      <AppHeader />
      <div className="flex min-h-screen min-w-0 flex-col">
        {/* fixed 헤더 높이만큼 문서 흐름 확보 */}
        <div className="h-[72px] shrink-0" aria-hidden />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <AppShellInner>{children}</AppShellInner>
    </ShellProvider>
  );
}
