ALTER TABLE "FantasyLeagueTeam"
ADD COLUMN "owner" TEXT NOT NULL DEFAULT '';

UPDATE "FantasyLeagueTeam"
SET "owner" = COALESCE(
    (
        SELECT "FantasyTeamOwner"."owner"
        FROM "FantasyTeamOwner"
        WHERE "FantasyTeamOwner"."leagueId" = "FantasyLeagueTeam"."leagueId"
          AND "FantasyTeamOwner"."teamId" = "FantasyLeagueTeam"."teamId"
    ),
    ''
);

DROP TABLE "FantasyTeamOwner";
