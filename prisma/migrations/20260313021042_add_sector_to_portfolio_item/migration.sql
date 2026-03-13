/*
  Warnings:

  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `currentValue` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `marketSummary` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `nextStrategy` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `quarter` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `thoughts` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `totalInvested` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Report` table. All the data in the column will be lost.
  - Added the required column `jpyRate` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodLabel` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCurrentKrw` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalInvestedKrw` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usdRate` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Asset_ticker_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Asset";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Transaction";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportId" INTEGER NOT NULL,
    "ticker" TEXT NOT NULL,
    "sector" TEXT,
    "accountType" TEXT NOT NULL,
    "originalCurrency" TEXT NOT NULL,
    "originalAmount" REAL NOT NULL,
    "krwAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewInvestment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportId" INTEGER NOT NULL,
    "accountType" TEXT NOT NULL,
    "originalCurrency" TEXT NOT NULL,
    "originalAmount" REAL NOT NULL,
    "krwAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewInvestment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "usdRate" REAL NOT NULL,
    "jpyRate" REAL NOT NULL,
    "totalInvestedKrw" REAL NOT NULL,
    "totalCurrentKrw" REAL NOT NULL,
    "profile" TEXT NOT NULL DEFAULT 'AlphA Holdings Portfolio',
    "summary" TEXT,
    "journal" TEXT,
    "strategy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Report" ("createdAt", "id", "type", "updatedAt") SELECT "createdAt", "id", "type", "updatedAt" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
