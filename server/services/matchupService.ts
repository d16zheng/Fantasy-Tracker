import type { GamePerformance } from "../../shared/types/stats";
import type { MatchupRequest, MatchupResult, MatchupTeamResult } from "../../shared/types/matchup";
import { getCurrentSeasonEndYear } from "../../shared/season";
import { getFantasyLeague } from "./fantasyLeagueService";
import { getRosterPlayerStats } from "./playerStatsService";
import { calculateTeamTotals, compareTeamTotals } from "./teamStatsService";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getGameDate(value: string): string {
  const parts = dateFormatter.formatToParts(new Date(value));

  const get = (type: string) => parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function filterWeeklyGames(
  games: GamePerformance[],
  startDate: string,
  endDate: string,
): GamePerformance[] {
  return games.filter((game) => {
    const date = getGameDate(game.date);

    return game.phase === "regular" && date >= startDate && date <= endDate;
  });
}

async function evaluateWeeklyTeam(
  leagueId: string,
  teamId: string,
  name: string,
  seasonEndYear: number,
  startDate: string,
  endDate: string,
): Promise<MatchupTeamResult> {
  const summaries = await getRosterPlayerStats(
    {
      leagueId,
      teamId: Number(teamId),
      seasonEndYear: getCurrentSeasonEndYear(),
    },
    seasonEndYear,
  );

  const weeklyGames = summaries.flatMap((summary) =>
    filterWeeklyGames(summary.gameLog, startDate, endDate),
  );

  return {
    teamId,
    name,
    totals: calculateTeamTotals(weeklyGames),
    missingPlayerIds: summaries
      .filter((summary) => Boolean(summary.statsError))
      .map((summary) => summary.player.id),
  };
}

export async function getWeeklyMatchup(request: MatchupRequest): Promise<MatchupResult> {
  const { leagueId, firstTeamId, secondTeamId, seasonEndYear, startDate, endDate } = request;

  const league = await getFantasyLeague(leagueId);

  const firstTeam = league.teams.find((team) => String(team.teamId) === firstTeamId);

  const secondTeam = league.teams.find((team) => String(team.teamId) === secondTeamId);

  if (!firstTeam || !secondTeam) {
    throw new Error("Selected team not found");
  }

  const firstResult = await evaluateWeeklyTeam(
    leagueId,
    firstTeamId,
    firstTeam.name,
    seasonEndYear,
    startDate,
    endDate,
  );

  const secondResult = await evaluateWeeklyTeam(
    leagueId,
    secondTeamId,
    secondTeam.name,
    seasonEndYear,
    startDate,
    endDate,
  );

  return {
    firstTeam: firstResult,
    secondTeam: secondResult,
    seasonEndYear,
    startDate,
    endDate,
    categories: compareTeamTotals(firstResult.totals, secondResult.totals),
  };
}
