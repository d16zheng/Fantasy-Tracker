import type {
  CategoryComparison,
  MatchupCategory,
  SummedStatKey,
  TeamCategoryTotals,
} from "../../shared/types/matchup";
import type { GamePerformance, GameStats } from "../../shared/types/stats";

const categories: MatchupCategory[] = [
  "fgPercentage",
  "ftPercentage",
  "threepm",
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "to",
];

const statKeys: SummedStatKey[] = [
  "fgm",
  "fga",
  "ftm",
  "fta",
  "threepm",
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "to",
];

const averageStatKeys: (keyof GameStats)[] = [
  "minutes",
  ...statKeys,
  "threepa",
];

function emptyTotals(): TeamCategoryTotals {
  return {
    fgm: 0,
    fga: 0,
    fgPercentage: null,
    ftm: 0,
    fta: 0,
    ftPercentage: null,
    threepm: 0,
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    to: 0,
  };
}

function finalizePercentages(totals: TeamCategoryTotals): TeamCategoryTotals {
  return {
    ...totals,
    fgPercentage: totals.fga > 0 ? totals.fgm / totals.fga : null,
    ftPercentage: totals.fta > 0 ? totals.ftm / totals.fta : null,
  };
}

export function calculateTeamTotals(games: GamePerformance[]): TeamCategoryTotals {
  const totals = emptyTotals();

  for (const game of games) {
    for (const stat of statKeys) {
      totals[stat] += game[stat];
    }
  }

  return finalizePercentages(totals);
}

export function calculateProjectedTotals(
  playerGames: GamePerformance[][],
  gamesMultiplier: number[] = playerGames.map(() => 1),
): TeamCategoryTotals {
  const averages: GameStats[] = [];
  const multipliers: number[] = [];

  playerGames.forEach((games, index) => {
    const regularGames = games.filter((game) => game.phase === "regular");
    if (regularGames.length === 0) return;

    const average = {} as GameStats;
    for (const stat of averageStatKeys) {
      average[stat] =
        regularGames.reduce((sum, game) => sum + game[stat], 0) / regularGames.length;
    }
    averages.push(average);
    multipliers.push(gamesMultiplier[index] ?? 1);
  });

  return calculateTotalsFromAverages(averages, multipliers);
}

export function calculateTotalsFromAverages(
  playerAverages: GameStats[],
  gamesMultiplier: number[] = playerAverages.map(() => 1),
): TeamCategoryTotals {
  const totals = emptyTotals();
  playerAverages.forEach((average, index) => {
    const multiplier = Math.max(0, gamesMultiplier[index] ?? 1);
    for (const stat of statKeys) totals[stat] += average[stat] * multiplier;
  });
  return finalizePercentages(totals);
}

export function compareTeamTotals(
  first: TeamCategoryTotals,
  second: TeamCategoryTotals,
): CategoryComparison[] {
  return categories.map((category) => {
    const a = first[category];
    const b = second[category];

    if (a == null || b == null || a == b) {
      return { category, winner: "tie" };
    }

    const firstWins = category === "to" ? a < b : a > b;

    return {
      category,
      winner: firstWins ? "win" : "lose",
    };
  });
}
