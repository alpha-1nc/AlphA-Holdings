-- Redefine watchlist_item: drop memo/target_price, add interest_reason / risk_notes
PRAGMA foreign_keys=OFF;

CREATE TABLE "watchlist_item_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "interest_reason" TEXT,
    "risk_notes" TEXT,
    "tag" TEXT NOT NULL DEFAULT '관심',
    "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

INSERT INTO "watchlist_item_new" ("id", "profile_id", "ticker", "company_name", "interest_reason", "risk_notes", "tag", "added_at", "updated_at")
SELECT "id", "profile_id", "ticker", "company_name", "memo", NULL, "tag", "added_at", "updated_at"
FROM "watchlist_item";

DROP TABLE "watchlist_item";
ALTER TABLE "watchlist_item_new" RENAME TO "watchlist_item";

CREATE UNIQUE INDEX "watchlist_item_profile_id_ticker_key" ON "watchlist_item"("profile_id", "ticker");

PRAGMA foreign_keys=ON;
