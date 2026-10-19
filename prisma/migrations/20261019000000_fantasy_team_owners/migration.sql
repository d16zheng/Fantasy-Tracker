CREATE TABLE "FantasyTeamOwner" (
    "leagueId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    PRIMARY KEY ("leagueId", "teamId")
);
