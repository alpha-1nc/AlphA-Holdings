/**
 * prisma를 import하기 전에 한 번 실행되도록 하는 사이드이펙트 모듈.
 * DATABASE_URL 로드 순서 때문에 `prisma` 싱글톤이 엉뚱한 SQLite 파일을 물지 않게 합니다.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });
