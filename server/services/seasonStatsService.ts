import type { GamePerformance, SeasonStats } from "../../shared/types/stats";

export function calculateSeasonStats(
  performances: GamePerformance[],
  playerId: string,
  seasonEndYear: number,
): SeasonStats {
  const games = performances.filter(
    (game) =>
      game.playerId === playerId &&
      game.seasonEndYear === seasonEndYear &&
      game.phase === "regular",
  );

  const gamesPlayed = games.length;

  const total = (stat: keyof GamePerformance): number =>
    games.reduce((sum, game) => sum + Number(game[stat]), 0);

  const average = (stat: keyof GamePerformance): number =>
    gamesPlayed === 0 ? 0 : total(stat) / gamesPlayed;

  const percentage = (made: number, attempted: number): number =>
    attempted === 0 ? 0 : (made / attempted) * 100;

  return {
    playerId,
    season: `${seasonEndYear - 1}-${seasonEndYear}`,
    gamesPlayed,
    minutespg: average("minutes"),

    fgmpg: average("fgm"),
    fgapg: average("fga"),

    fgPercentage: percentage(total("fgm"), total("fga")),

    ftmpg: average("ftm"),
    ftapg: average("fta"),

    ftPercentage: percentage(total("ftm"), total("fta")),

    threepmpg: average("threepm"),

    rpg: average("rebounds"),
    apg: average("assists"),
    spg: average("steals"),
    bpg: average("blocks"),
    topg: average("to"),
    ppg: average("points"),
  };
}
