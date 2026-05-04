/** 와치리스트·저널 공통: 줄 단위 글머리 접두(•-*) 제거 후 본문만 */
export function stripLineBulletPrefix(line: string): string {
  return line.replace(/^[\s\u2022\u30FB•\-\*・]+/u, "").trim();
}

/** 한 줄 한 항목 · 앞쪽 글머리 기호는 제거 후 비어 있지 않은 줄만 */
export function bulletLinesToArray(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(stripLineBulletPrefix)
    .filter(Boolean);
}

/**
 * 편집기·기존 DB 본문 정규화: 비어 있지 않은 줄마다 `• ` 접두 (빈 줄은 유지)
 */
export function normalizeJournalBulletText(raw: string): string {
  if (!raw.trim()) return "";
  return raw
    .split(/\r?\n/)
    .map((line) => {
      const core = stripLineBulletPrefix(line);
      if (!core) return "";
      return `• ${core}`;
    })
    .join("\n");
}
