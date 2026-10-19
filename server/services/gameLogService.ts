import type { GamePerformance } from "../../shared/types/stats";
import { fetchEspnGameLog } from "../integrations/espn/gameLogClient";
import { mapEspnGameLog } from "../integrations/espn/gameLogMapper";
import { findGameLog, getGameLogLastFetched, saveGameLog } from "../repositories/gameLogRepository";
import { getCurrentSeasonEndYear } from "../../shared/season";

export async function getPlayerGameLog(
    playerId: string,
    espnPlayerId: string,
    seasonEndYear: number
): Promise<GamePerformance[]> {
    
    const lastFetched = await getGameLogLastFetched(
        playerId,
        seasonEndYear
    );

    const currentSeasonEndYear = getCurrentSeasonEndYear();
    
    const isHistorical = seasonEndYear < currentSeasonEndYear;
    const oneHourMs = 60 * 60 * 1000;

    const isFresh = 
        lastFetched !== null &&
        (isHistorical ||
            Date.now() - lastFetched.getTime() < oneHourMs);

    if (isFresh) {
        return findGameLog(playerId, seasonEndYear);
    }
        
    let response: Awaited<ReturnType<typeof fetchEspnGameLog>>;
    try {
        response = await fetchEspnGameLog(espnPlayerId, seasonEndYear);
    } catch (error) {
        const cachedGameLog = await findGameLog(playerId, seasonEndYear);
        if (cachedGameLog.length > 0) {
            return cachedGameLog;
        }
        throw error;
    }

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
