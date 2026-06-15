-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT,
    "marketCountry" TEXT,
    "currency" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "avgPrice" REAL NOT NULL,
    "lastPrice" REAL NOT NULL,
    "marketValue" REAL NOT NULL,
    "marketValueKrw" REAL NOT NULL,
    "profitLoss" REAL,
    "profitLossRate" REAL,
    "dailyProfitLoss" REAL,
    "manualNote" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Holding_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "totalValueKrw" REAL NOT NULL,
    "totalCostKrw" REAL,
    "netCashFlowKrw" REAL,
    "usdRate" REAL,
    "positions" JSONB,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "brokerOrderId" TEXT,
    "clientOrderId" TEXT,
    "ticker" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "price" REAL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filledQuantity" REAL,
    "avgFilledPrice" REAL,
    "commission" REAL,
    "tax" REAL,
    "orderedAt" DATETIME NOT NULL,
    "filledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrokerToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
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
    "snapshotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PortfolioSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("createdAt", "earningsReview", "id", "journal", "jpyRate", "periodLabel", "profile", "status", "strategy", "summary", "totalCurrentKrw", "totalInvestedKrw", "type", "updatedAt", "usdRate") SELECT "createdAt", "earningsReview", "id", "journal", "jpyRate", "periodLabel", "profile", "status", "strategy", "summary", "totalCurrentKrw", "totalInvestedKrw", "type", "updatedAt", "usdRate" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Holding_profileId_idx" ON "Holding"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_profileId_source_accountType_ticker_key" ON "Holding"("profileId", "source", "accountType", "ticker");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_profileId_idx" ON "PortfolioSnapshot"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_profileId_date_key" ON "PortfolioSnapshot"("profileId", "date");

-- CreateIndex
CREATE INDEX "Transaction_profileId_idx" ON "Transaction"("profileId");

-- CreateIndex
CREATE INDEX "Transaction_brokerOrderId_idx" ON "Transaction"("brokerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerToken_source_key" ON "BrokerToken"("source");
