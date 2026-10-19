CREATE TABLE "FantasyLeagueTeam" (
    "leagueId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rosterJson" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("leagueId", "teamId")
);

CREATE INDEX "FantasyLeagueTeam_leagueId_idx" ON "FantasyLeagueTeam"("leagueId");
