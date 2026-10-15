import type { GamePerformance } from "../../shared/types/stats";
import { fetchEspnGameLog } from "../integrations/espn/gameLogClient";
import { mapEspnGameLog } from "../integrations/espn/gameLogMapper";
import { findGameLog, getGameLogLastFetched, saveGameLog } from "../repositories/gameLogRepository";

export async function getPlayerGameLog(
    playerId: string,
    espnPlayerId: string,
    seasonEndYear: number
): Promise<GamePerformance[]> {
    
    const lastFetched = await getGameLogLastFetched(
        playerId,
        seasonEndYear
    );

    const currentSeasonEndYear = 
        new Date().getMonth() >= 6
        ? new Date().getFullYear() + 1
        : new Date().getFullYear();
    
    const isHistorical = seasonEndYear < currentSeasonEndYear;

    const isFresh = 
        lastFetched !== null &&
        (isHistorical ||
            Date.now() - lastFetched.getTime() < 60 * 60 * 1000);

    if (isFresh) {
        return findGameLog(playerId, seasonEndYear);
    }
        
    const response = await fetchEspnGameLog(
        espnPlayerId,
        seasonEndYear
    );

    const gameLog = mapEspnGameLog(
        response,
        playerId,
        seasonEndYear
    );

    await saveGameLog(
        playerId,
        seasonEndYear,
        gameLog
    );

    return gameLog;
}