-- CreateTable
CREATE TABLE "AccountInitialCapital" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "krwAmount" REAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountInitialCapital_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountInitialCapital_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "usdRate" REAL,
    "jpyRate" REAL,
    "totalInvestedKrw" REAL,
    "totalCurrentKrw" REAL,
    "profile" TEXT NOT NULL DEFAULT 'AlphA Holdings Portfolio',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "journal" TEXT,
    "strategy" TEXT,
    "earningsReview" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Report" ("createdAt", "earningsReview", "id", "journal", "jpyRate", "periodLabel", "profile", "status", "strategy", "summary", "totalCurrentKrw", "totalInvestedKrw", "type", "updatedAt", "usdRate") SELECT "createdAt", "earningsReview", "id", "journal", "jpyRate", "periodLabel", "profile", "status", "strategy", "summary", "totalCurrentKrw", "totalInvestedKrw", "type", "updatedAt", "usdRate" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AccountInitialCapital_profileId_accountType_key" ON "AccountInitialCapital"("profileId", "accountType");
