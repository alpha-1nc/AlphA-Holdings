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
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "journal" TEXT,
    "strategy" TEXT,
    "earningsReview" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Report" ("createdAt", "earningsReview", "id", "journal", "jpyRate", "periodLabel", "profile", "strategy", "summary", "totalCurrentKrw", "totalInvestedKrw", "type", "updatedAt", "usdRate") SELECT "createdAt", "earningsReview", "id", "journal", "jpyRate", "periodLabel", "profile", "strategy", "summary", "totalCurrentKrw", "totalInvestedKrw", "type", "updatedAt", "usdRate" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
