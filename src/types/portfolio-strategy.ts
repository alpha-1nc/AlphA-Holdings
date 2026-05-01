// ── 목표 포트폴리오 관련 타입 (프론트엔드용) ────────────────────────

import type { AccountType, AssetRole, PortfolioStrategy, Profile } from "@/generated/prisma";

// Re-export Prisma types for convenience
export type { AccountType, AssetRole, PortfolioStrategy, Profile };

/** AssetRole 표시 라벨 */
export const ASSET_ROLE_LABELS: Record<AssetRole, string> = {
  CORE: "코어",
  GROWTH: "성장",
  BOOSTER: "부스터",
  DEFENSIVE: "방어",
  INDEX: "지수",
  BOND: "채권",
  UNASSIGNED: "미지정",
};

/** 전략 생성 입력 */
export interface CreatePortfolioStrategyInput {
  profileId: string;
  ticker: string;
  role?: AssetRole;
  targetWeight: number;
  accountType?: AccountType;
}

/** 전략 수정 입력 (부분 업데이트) */
export interface UpdatePortfolioStrategyInput {
  role?: AssetRole;
  targetWeight?: number;
  accountType?: AccountType;
}

/** 프로필과 함께 로드된 전략 */
export type PortfolioStrategyWithProfile = PortfolioStrategy & {
  profile: Profile;
};
