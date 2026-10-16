-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "snapshotKind" TEXT NOT NULL DEFAULT 'DAILY',
    "totalValueKrw" REAL NOT NULL,
    "totalAssetKrw" REAL,
    "totalCostKrw" REAL,
    "netCashFlowKrw" REAL,
    "usdRate" REAL,
    "positions" JSONB,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PortfolioSnapshot" ("date", "id", "netCashFlowKrw", "positions", "profileId", "syncedAt", "totalCostKrw", "totalValueKrw", "usdRate") SELECT "date", "id", "netCashFlowKrw", "positions", "profileId", "syncedAt", "totalCostKrw", "totalValueKrw", "usdRate" FROM "PortfolioSnapshot";
DROP TABLE "PortfolioSnapshot";
ALTER TABLE "new_PortfolioSnapshot" RENAME TO "PortfolioSnapshot";
CREATE INDEX "PortfolioSnapshot_profileId_idx" ON "PortfolioSnapshot"("profileId");
CREATE INDEX "PortfolioSnapshot_profileId_snapshotKind_idx" ON "PortfolioSnapshot"("profileId", "snapshotKind");
CREATE UNIQUE INDEX "PortfolioSnapshot_profileId_date_snapshotKind_key" ON "PortfolioSnapshot"("profileId", "date", "snapshotKind");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
