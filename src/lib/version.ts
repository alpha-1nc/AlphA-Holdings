import packageJson from "../../package.json";

/**
 * 앱 버전 정보를 반환합니다.
 * package.json의 version 필드를 읽어옵니다.
 */
export function getAppVersion(): string {
  return packageJson.version;
}
