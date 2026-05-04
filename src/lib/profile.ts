// ── 프로필 관련 유틸리티 ────────────────────────────────────────────────

export type WorkspaceProfile = "alpha-ceo" | "partner";

export const PROFILE_STORAGE_KEY = "alpha-holdings-profile";

// 프로필 ID → 표시 라벨 매핑
export const PROFILE_LABELS: Record<WorkspaceProfile, string> = {
    "alpha-ceo": "AlphA Holdings Portfolio",
    partner: "MindongFolio",
};

/** 설정 화면 — 운용 프로필 소개 카드 문구 */
export const WORKSPACE_PROFILE_INTRO: Record<
    WorkspaceProfile,
    { name: string; title: string; bio: string }
> = {
    "alpha-ceo": {
        name: "AlphA Holdings",
        title: "AlphA Holdings Portfolio",
        bio:
            "AlphA Inc. 산하의 자산운용본부에 속해 있으며 AlphA Inc.의 투자와 자산을 통제 하고 관리하며 포트폴리오를 운용합니다.",
    },
    partner: {
        name: "MindongFolio",
        title: "개인 포트폴리오",
        bio: "Mindong의 개인 포트폴리오이며 AlphA Holdings에 의해 위탁 운용됩니다.",
    },
};

/** 모바일 헤더 등 — AlphA Holdings → A, MindongFolio → M */
export const PROFILE_MOBILE_INITIALS: Record<WorkspaceProfile, string> = {
    "alpha-ceo": "A",
    partner: "M",
};

export function getProfileMobileInitial(profile: WorkspaceProfile): string {
    return PROFILE_MOBILE_INITIALS[profile];
}

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
