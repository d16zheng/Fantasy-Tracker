import type { GamePerformance } from "../../shared/types/stats";
import { getPlayerGameLog } from "./gameLogService";

export interface PlayerSeasonHistory {
  seasonEndYear: number;
  games: GamePerformance[];
}

export async function getPlayerHistory(
  playerId: string,
  espnPlayerId: string,
  seasonEndYear: number,
  numberOfSeasons = 3,
): Promise<PlayerSeasonHistory[]> {
  if (!Number.isInteger(numberOfSeasons) || numberOfSeasons < 1) {
    throw new Error("numberOfSeasons must be a positive integer");
  }

  const history: PlayerSeasonHistory[] = [];

  for (let index = 0; index < numberOfSeasons; index += 1) {
    const year = seasonEndYear - index;
    const games = await getPlayerGameLog(playerId, espnPlayerId, year);
    const regularGames = games
      .filter((game) => game.phase === "regular")
      .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());

    history.push({ seasonEndYear: year, games: regularGames });
  }

  return history;
}
