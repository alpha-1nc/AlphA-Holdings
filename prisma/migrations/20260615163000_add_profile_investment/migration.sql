-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "amountKrw" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "sourceReportId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Investment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Investment_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Investment_profileId_idx" ON "Investment"("profileId");

-- CreateIndex
CREATE INDEX "Investment_sourceReportId_idx" ON "Investment"("sourceReportId");
