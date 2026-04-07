// ── 프로필 관련 유틸리티 ────────────────────────────────────────────────

export type WorkspaceProfile = "alpha-ceo" | "partner";

export const PROFILE_STORAGE_KEY = "alpha-holdings-profile";

// 프로필 ID → 표시 라벨 매핑
export const PROFILE_LABELS: Record<WorkspaceProfile, string> = {
    "alpha-ceo": "AlphA Holdings Portfolio",
    partner: "MindongFolio",
};

/** 모바일 상단 헤더 등 좁은 영역용 짧은 표기 */
export const PROFILE_HEADER_SHORT: Record<WorkspaceProfile, string> = {
    "alpha-ceo": "AlphA",
    partner: "Mindong",
};

// 프로필 라벨 → 프로필 ID 역매핑
export const LABEL_TO_PROFILE: Record<string, WorkspaceProfile> = {
    "AlphA Holdings Portfolio": "alpha-ceo",
    "MindongFolio": "partner",
};

/**
 * localStorage에서 현재 프로필을 가져옵니다.
 * 없으면 기본값 "alpha-ceo"를 반환합니다.
 */
export function getCurrentProfile(): WorkspaceProfile {
    if (typeof window === "undefined") return "alpha-ceo";
    
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY) as WorkspaceProfile | null;
    if (stored === "alpha-ceo" || stored === "partner") {
        return stored;
    }
    
    return "alpha-ceo";
}

/**
 * 프로필을 저장합니다.
 */
export function setCurrentProfile(profile: WorkspaceProfile): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROFILE_STORAGE_KEY, profile);
    window.dispatchEvent(new CustomEvent("alpha-holdings-profile-change"));
}

/**
 * 프로필 ID를 표시 라벨로 변환합니다.
 */
export function getProfileLabel(profile: WorkspaceProfile): string {
    return PROFILE_LABELS[profile];
}

/**
 * 표시 라벨을 프로필 ID로 변환합니다.
 */
export function getProfileFromLabel(label: string): WorkspaceProfile | null {
    return LABEL_TO_PROFILE[label] || null;
}
