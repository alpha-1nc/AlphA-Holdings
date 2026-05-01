-- CreateTable
CREATE TABLE "watchlist_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "memo" TEXT,
    "target_price" REAL,
    "tag" TEXT NOT NULL DEFAULT '관심',
    "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_item_profile_id_ticker_key" ON "watchlist_item"("profile_id", "ticker");
