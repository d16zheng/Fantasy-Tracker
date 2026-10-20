import { getCurrentSeasonEndYear } from "../../shared/season";
import type {
  ComparisonRequest,
  ComparisonResult,
  MatchupTeamResult,
} from "../../shared/types/matchup";
import { getFantasyLeague } from "./fantasyLeagueService";
import { getRosterPlayerStats } from "./playerStatsService";
import { calculateProjectedTotals, compareTeamTotals } from "./teamStatsService";

export async function evaluateAverageTeam(
  leagueId: string,
  teamId: string,
  name: string,
  seasonEndYear: number,
): Promise<MatchupTeamResult> {
  const summaries = await getRosterPlayerStats(
    {
      leagueId,
      teamId: Number(teamId),
      seasonEndYear: getCurrentSeasonEndYear(),
    },
    seasonEndYear,
  );

  const playerGames = summaries.map((summary) => summary.gameLog);

  return {
    teamId,
    name,
    totals: calculateProjectedTotals(playerGames),
    missingPlayerIds: summaries
      .filter((summary) => Boolean(summary.statsError))
      .map((summary) => summary.player.id),
  };
}

export async function getTeamComparison(request: ComparisonRequest): Promise<ComparisonResult> {
  const { leagueId, firstTeamId, secondTeamId, seasonEndYear } = request;

  const league = await getFantasyLeague(leagueId);

  const firstTeam = league.teams.find((team) => String(team.teamId) === firstTeamId);

  const secondTeam = league.teams.find((team) => String(team.teamId) === secondTeamId);

  if (!firstTeam || !secondTeam) {
    throw new Error("Selected team not found");
  }

  const firstResult = await evaluateAverageTeam(
    leagueId,
    firstTeamId,
    firstTeam.name,
    seasonEndYear,
  );

  const secondResult = await evaluateAverageTeam(
    leagueId,
    secondTeamId,
    secondTeam.name,
    seasonEndYear,
  );

  return {
    firstTeam: firstResult,
    secondTeam: secondResult,
    seasonEndYear,
    categories: compareTeamTotals(firstResult.totals, secondResult.totals),
  };
}
