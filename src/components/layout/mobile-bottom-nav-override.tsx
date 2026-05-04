"use client";

import { createContext, useContext, type ReactNode } from "react";

const MobileBottomNavOverrideContext = createContext<number | null>(null);

/** `/reports/[id]` 등 경로만으로는 하단 탭을 알 수 없을 때, 해당 섹션 탭 인덱스를 지정 */
export function MobileBottomNavOverrideProvider({
  value,
  children,
}: {
  value: number | null;
  children: ReactNode;
}) {
  return (
    <MobileBottomNavOverrideContext.Provider value={value}>
      {children}
    </MobileBottomNavOverrideContext.Provider>
  );
}

export function useMobileBottomNavOverride(): number | null {
  return useContext(MobileBottomNavOverrideContext);
}
