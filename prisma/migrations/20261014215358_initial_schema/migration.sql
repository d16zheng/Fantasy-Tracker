-- CreateTable
CREATE TABLE "TrackedPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "espnId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GamePerformanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "espnEventId" TEXT NOT NULL,
    "seasonEndYear" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "GamePerformanceRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "TrackedPlayer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameLogSync" (
    "playerId" TEXT NOT NULL,
    "seasonEndYear" INTEGER NOT NULL,
    "fetchedAt" DATETIME NOT NULL,

    PRIMARY KEY ("playerId", "seasonEndYear"),
    CONSTRAINT "GameLogSync_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "TrackedPlayer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackedPlayer_espnId_key" ON "TrackedPlayer"("espnId");

-- CreateIndex
CREATE INDEX "GamePerformanceRecord_playerId_seasonEndYear_idx" ON "GamePerformanceRecord"("playerId", "seasonEndYear");

-- CreateIndex
CREATE UNIQUE INDEX "GamePerformanceRecord_playerId_espnEventId_key" ON "GamePerformanceRecord"("playerId", "espnEventId");
