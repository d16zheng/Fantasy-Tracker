import type { GamePerformance } from "../../shared/types/stats";
import { fetchEspnGameLog } from "../integrations/espn/gameLogClient";
import { mapEspnGameLog } from "../integrations/espn/gameLogMapper";

export async function getPlayerGameLog(
    playerId: string,
    espnPlayerId: string,
    seasonEndYear: number
): Promise<GamePerformance[]> {
    
    const response = await fetchEspnGameLog(
        espnPlayerId,
        seasonEndYear
    );
    return mapEspnGameLog(
        response,
        playerId,
        seasonEndYear
    );
}