import type { GamePerformance, GameStats } from "../../shared/types/stats";
import type {
  MatchupRequest,
  WeeklyProjectionResult,
  WeeklyProjectionTeamResult,
} from "../../shared/types/matchup";
import { getCurrentSeasonEndYear } from "../../shared/season";
import { getFantasyLeague } from "./fantasyLeagueService";
import { getRosterPlayerStats } from "./playerStatsService";
import { getWeeklyGameCounts, normalizeTeam } from "./scheduleService";
import { calculateTotalsFromAverages, compareTeamTotals } from "./teamStatsService";

const statKeys: (keyof GameStats)[] = [
  "minutes",
  "fgm",
  "fga",
  "ftm",
  "fta",
  "threepm",
  "threepa",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "to",
  "points",
];

function calculatePlayerAverage(games: GamePerformance[]): GameStats | null {
  const regularGames = games.filter((game) => game.phase === "regular");
  if (regularGames.length === 0) return null;

  const averages = {} as GameStats;
  for (const stat of statKeys) {
    averages[stat] =
      regularGames.reduce((sum, game) => sum + game[stat], 0) / regularGames.length;
  }
  return averages;
}

async function projectTeam(
  leagueId: string,
  teamId: string,
  name: string,
  roster: { espnPlayerId: string; nbaTeamAbbreviation?: string }[],
  seasonEndYear: number,
  gameCounts: Record<string, number>,
): Promise<WeeklyProjectionTeamResult> {
  const summaries = await getRosterPlayerStats(
    {
      leagueId,
      teamId: Number(teamId),
      seasonEndYear: getCurrentSeasonEndYear(),
    },
    seasonEndYear,
  );
  const rosterById = new Map(roster.map((player) => [`espn:${player.espnPlayerId}`, player]));
  const playerAverages: GameStats[] = [];
  const multipliers: number[] = [];
  const players: WeeklyProjectionTeamResult["players"] = [];
  const missingPlayerIds: string[] = [];

  for (const summary of summaries) {
    const playerId = summary.player.id;
    const rosterPlayer = rosterById.get(playerId);
    const average = calculatePlayerAverage(summary.gameLog);
    const nbaTeam = normalizeTeam(
      rosterPlayer?.nbaTeamAbbreviation ?? summary.player.team.abbreviation,
    );
    const scheduledGames = nbaTeam ? (gameCounts[nbaTeam] ?? 0) : 0;

    players.push({ playerId, nbaTeam, scheduledGames });
    if (!average || !nbaTeam || summary.statsError) {
      missingPlayerIds.push(playerId);
      continue;
    }

    playerAverages.push(average);
    multipliers.push(scheduledGames);
  }

  return {
    teamId,
    name,
    totals: calculateTotalsFromAverages(playerAverages, multipliers),
    players,
    missingPlayerIds,
  };
}

export async function getWeeklyProjection(
  request: MatchupRequest,
): Promise<WeeklyProjectionResult> {
  const { leagueId, firstTeamId, secondTeamId, seasonEndYear, startDate, endDate } = request;
  const league = await getFantasyLeague(leagueId);
  const firstTeam = league.teams.find((team) => String(team.teamId) === firstTeamId);
  const secondTeam = league.teams.find((team) => String(team.teamId) === secondTeamId);
  if (!firstTeam || !secondTeam) throw new Error("Selected team not found");

  const gameCounts = await getWeeklyGameCounts(startDate, endDate);
  const [firstResult, secondResult] = await Promise.all([
    projectTeam(
      leagueId,
      firstTeamId,
      firstTeam.name,
      firstTeam.players,
      seasonEndYear,
      gameCounts,
    ),
    projectTeam(
      leagueId,
      secondTeamId,
      secondTeam.name,
      secondTeam.players,
      seasonEndYear,
      gameCounts,
    ),
  ]);

  return {
    firstTeam: firstResult,
    secondTeam: secondResult,
    seasonEndYear,
    startDate,
    endDate,
    categories: compareTeamTotals(firstResult.totals, secondResult.totals),
  };
}
