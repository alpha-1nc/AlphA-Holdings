-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PortfolioStrategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CORE',
    "targetWeight" REAL NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'US_DIRECT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PortfolioStrategy_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PortfolioStrategy" ("createdAt", "displayName", "id", "profileId", "role", "targetWeight", "ticker", "updatedAt") SELECT "createdAt", "displayName", "id", "profileId", "role", "targetWeight", "ticker", "updatedAt" FROM "PortfolioStrategy";
DROP TABLE "PortfolioStrategy";
ALTER TABLE "new_PortfolioStrategy" RENAME TO "PortfolioStrategy";
CREATE UNIQUE INDEX "PortfolioStrategy_profileId_ticker_accountType_key" ON "PortfolioStrategy"("profileId", "ticker", "accountType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
