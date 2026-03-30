"use client";

/**
 * /analysis 목록 페이지 레이아웃 래퍼.
 * 서버 RSC 자식(children)과 클라이언트 경계를 한 곳에 두어
 * 하이드레이션 시 루트 노드 불일치를 줄입니다.
 */
export function AnalysisPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {children}
    </div>
  );
}
