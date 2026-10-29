import type { GamePerformance, GameStats } from "../../shared/types/stats";
import type {
  MatchupRequest,
  WeeklyProjectionResult,
  WeeklyProjectionTeamResult,
} from "../../shared/types/matchup";
import { getCurrentSeasonEndYear } from "../../shared/season";
import { getFantasyLeague } from "./fantasyLeagueService";
import { getRosterPlayerStats } from "./playerStatsService";
import { getPlayerGameLog } from "./gameLogService";
import { getWeeklyGameCounts, normalizeTeam } from "./scheduleService";
import { calculateTotalsFromAverages, compareTeamTotals } from "./teamStatsService";
import { isNbaTeam } from "../data/nbaTeam";

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

const nbaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getNbaDate(value: string): string {
  const parts = nbaDateFormatter.formatToParts(new Date(value));
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function calculatePlayerAverage(games: GamePerformance[], beforeDate: string): GameStats | null {
  const regularGames = games.filter(
    (game) => game.phase === "regular" && getNbaDate(game.date) < beforeDate,
  );
  if (regularGames.length === 0) return null;

  const averages = {} as GameStats;
  for (const stat of statKeys) {
    averages[stat] = regularGames.reduce((sum, game) => sum + game[stat], 0) / regularGames.length;
  }
  return averages;
}

async function getPlayerHistoryBefore(
  playerId: string,
  espnPlayerId: string,
  currentSeasonEndYear: number,
  currentSeasonGames: GamePerformance[],
  beforeDate: string,
): Promise<{ seasonEndYear: number; games: GamePerformance[] } | null> {
  for (let offset = 0; offset < 4; offset += 1) {
    const seasonEndYear = currentSeasonEndYear - offset;
    let seasonGames = currentSeasonGames;
    if (offset > 0) {
      try {
        seasonGames = await getPlayerGameLog(playerId, espnPlayerId, seasonEndYear);
      } catch {
        continue;
      }
    }
    const regularGames = seasonGames.filter(
      (game) => game.phase === "regular" && getNbaDate(game.date) < beforeDate,
    );
    if (regularGames.length > 0) return { seasonEndYear, games: regularGames };
  }
  return null;
}

function multiplyStats(stats: GameStats, games: number): GameStats {
  return Object.fromEntries(
    Object.entries(stats).map(([stat, value]) => [stat, value * games]),
  ) as GameStats;
}

async function projectTeam(
  leagueId: string,
  teamId: string,
  name: string,
  roster: { espnPlayerId: string; nbaTeamAbbreviation?: string }[],
  seasonEndYear: number,
  startDate: string,
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
  const missingSchedulePlayerIds: string[] = [];

  const historyByIndex: (Awaited<ReturnType<typeof getPlayerHistoryBefore>> | null)[] = new Array(
    summaries.length,
  ).fill(null);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, summaries.length) }, async () => {
      while (nextIndex < summaries.length) {
        const index = nextIndex++;
        const { player } = summaries[index];
        historyByIndex[index] = await getPlayerHistoryBefore(
          player.id,
          player.espnId,
          seasonEndYear,
          summaries[index].gameLog,
          startDate,
        );
      }
    }),
  );

  for (const [index, summary] of summaries.entries()) {
    const playerId = summary.player.id;
    const rosterPlayer = rosterById.get(playerId);
    const playerHistory = historyByIndex[index];
    const average = playerHistory ? calculatePlayerAverage(playerHistory.games, startDate) : null;
    const rawNbaTeam = rosterPlayer?.nbaTeamAbbreviation ?? summary.player.team.abbreviation;
    const normalizedTeam = rawNbaTeam ? normalizeTeam(rawNbaTeam) : "";
    const scheduleAvailable = isNbaTeam(normalizedTeam);
    const nbaTeam = scheduleAvailable ? normalizedTeam : null;
    const scheduledGames = scheduleAvailable ? (gameCounts[normalizedTeam] ?? 0) : null;
    const statsAvailable = Boolean(average);

    players.push({
      playerId,
      nbaTeam,
      scheduledGames,
      statsSeasonEndYear: playerHistory?.seasonEndYear ?? null,
      perGameStats: statsAvailable ? average : null,
      projectedStats:
        statsAvailable && scheduledGames !== null ? multiplyStats(average!, scheduledGames) : null,
      statsAvailable,
      scheduleAvailable,
    });
    if (!statsAvailable) {
      missingPlayerIds.push(playerId);
    }
    if (!scheduleAvailable) missingSchedulePlayerIds.push(playerId);
    if (!statsAvailable || !scheduleAvailable || scheduledGames === null) continue;

    playerAverages.push(average!);
    multipliers.push(scheduledGames);
  }

  return {
    teamId,
    name,
    totals: calculateTotalsFromAverages(playerAverages, multipliers),
    players,
    missingPlayerIds,
    missingSchedulePlayerIds,
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
      startDate,
      gameCounts,
    ),
    projectTeam(
      leagueId,
      secondTeamId,
      secondTeam.name,
      secondTeam.players,
      seasonEndYear,
      startDate,
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
