-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PortfolioStrategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CORE',
    "targetWeight" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PortfolioStrategy_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportAiComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" INTEGER NOT NULL,
    "monthlySummary" TEXT NOT NULL,
    "monthlyChange" TEXT,
    "nextAction" TEXT NOT NULL,
    "inputJson" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportAiComment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analysis_report_upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "company_code" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "verdict" TEXT,
    "html" TEXT NOT NULL,
    "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalysisReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodLabel" TEXT NOT NULL,
    "reportData" JSONB NOT NULL,
    "rating" TEXT NOT NULL,
    "totalScore" REAL NOT NULL,
    "appliedModel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PortfolioItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportId" INTEGER NOT NULL,
    "ticker" TEXT NOT NULL,
    "displayName" TEXT,
    "logoUrl" TEXT,
    "sector" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CORE',
    "accountType" TEXT NOT NULL,
    "originalCurrency" TEXT NOT NULL,
    "originalAmount" REAL NOT NULL,
    "krwAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PortfolioItem" ("accountType", "createdAt", "id", "krwAmount", "logoUrl", "originalAmount", "originalCurrency", "reportId", "sector", "ticker") SELECT "accountType", "createdAt", "id", "krwAmount", "logoUrl", "originalAmount", "originalCurrency", "reportId", "sector", "ticker" FROM "PortfolioItem";
DROP TABLE "PortfolioItem";
ALTER TABLE "new_PortfolioItem" RENAME TO "PortfolioItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_label_key" ON "Profile"("label");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioStrategy_profileId_ticker_key" ON "PortfolioStrategy"("profileId", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "ReportAiComment_reportId_key" ON "ReportAiComment"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_report_upload_year_month_company_code_key" ON "analysis_report_upload"("year", "month", "company_code");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisReport_slug_key" ON "AnalysisReport"("slug");
