import type { EspnFantasyTeam } from "../../shared/types/fantasy";
import type { PlayerSeasonSummary } from "../../shared/types/playerStats";
import { getFantasyRoster } from "./fantasyRosterService";
import { getPlayerGameLog } from "./gameLogService";
import { calculateSeasonStats } from "./seasonStatsService";
import { createTrackedPlayers } from "./trackedPlayerService";

export async function getRosterPlayerStats(
    fantasyTeam: EspnFantasyTeam,
    seasonEndYear: number,
): Promise<PlayerSeasonSummary[]> {
    
    const roster = await getFantasyRoster(fantasyTeam);

    const trackedPlayers = createTrackedPlayers(roster);

    const playerStats = await Promise.all(
        trackedPlayers.map(async (player) => {
            const gameLog = await getPlayerGameLog(
                player.id,
                player.espnId,
                seasonEndYear
            );

            const seasonStats = calculateSeasonStats(
                gameLog,
                player.id,
                seasonEndYear
            );

            return {
                player,
                seasonStats,
                gameLog
            };

        })
    );

    return playerStats;
}