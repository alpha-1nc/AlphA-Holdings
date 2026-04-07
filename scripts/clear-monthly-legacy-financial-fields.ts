/**
 * 기존 월별 리포트 레거시 수치 필드를 일괄 null로 정리합니다. 1회 실행 후 필요 시 삭제해도 됩니다.
 * 실행: npx tsx scripts/clear-monthly-legacy-financial-fields.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.report.updateMany({
    where: { type: "MONTHLY" },
    data: {
      totalInvestedKrw: null,
      totalCurrentKrw: null,
      usdRate: null,
      jpyRate: null,
    },
  });
  console.log(`Updated ${result.count} MONTHLY report(s): totalInvestedKrw, totalCurrentKrw, usdRate, jpyRate → null`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
