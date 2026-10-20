import { getCurrentSeasonEndYear } from "../../shared/season";
import { fetchEspnLeague } from "../integrations/espn/client";
import { mapEspnPlayer } from "../integrations/espn/mapper";
import { prisma } from "../db/prisma";
import type { FantasyLeague } from "../../shared/types/fantasy";

export async function getFantasyLeague(leagueId: string): Promise<FantasyLeague> {
  const seasonEndYear = getCurrentSeasonEndYear();
  const response = await fetchEspnLeague(leagueId, seasonEndYear);

  const leagueTeams = response.teams.map((team) => ({
    teamId: String(team.id),
    name: team.name || `Team ${team.id}`,
    players: (team.roster?.entries ?? []).map((entry) =>
      mapEspnPlayer(entry.playerPoolEntry.player),
    ),
  }));

  const savedTeams = await prisma.$transaction(
    leagueTeams.map((team) =>
      prisma.fantasyLeagueTeam.upsert({
        where: {
          leagueId_teamId: { leagueId, teamId: Number(team.teamId) },
        },
        create: {
          leagueId,
          teamId: Number(team.teamId),
          name: team.name,
          owner: "",
          rosterJson: JSON.stringify(team.players),
        },
        update: {
          name: team.name,
          rosterJson: JSON.stringify(team.players),
        },
      }),
    ),
  );

  return {
    leagueId,
    seasonEndYear,
    teams: savedTeams.map((team) => ({
      teamId: String(team.teamId),
      name: team.name,
      owner: team.owner,
      players: JSON.parse(team.rosterJson) as (typeof leagueTeams)[number]["players"],
    })),
  };
}
