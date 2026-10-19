import type { EspnFantasyTeam } from "../../shared/types/fantasy";
import type { PlayerSeasonSummary } from "../../shared/types/playerStats";
import { getFantasyRoster } from "./fantasyRosterService";
import { getPlayerGameLog } from "./gameLogService";
import { calculateSeasonStats } from "./seasonStatsService";
import { createTrackedPlayers } from "./trackedPlayerService";
import { saveTrackedPlayer } from "../repositories/playerRepository";

export async function getRosterPlayerStats(
    fantasyTeam: EspnFantasyTeam,
    seasonEndYear: number,
): Promise<PlayerSeasonSummary[]> {
    
    const roster = await getFantasyRoster(fantasyTeam);

    const trackedPlayers = createTrackedPlayers(roster);

    const playerStats: PlayerSeasonSummary[] = new Array(trackedPlayers.length);
    let nextIndex = 0;
    const workerCount = Math.min(4, trackedPlayers.length);

    await Promise.all(Array.from({ length: workerCount }, async () => {
        while (nextIndex < trackedPlayers.length) {
            const index = nextIndex++;
            const player = trackedPlayers[index];
            await saveTrackedPlayer(player);

            try {
                const gameLog = await getPlayerGameLog(player.id, player.espnId, seasonEndYear);
                playerStats[index] = {
                    player,
                    seasonStats: calculateSeasonStats(gameLog, player.id, seasonEndYear),
                    gameLog,
                };
            } catch {
                playerStats[index] = {
                    player,
                    seasonStats: calculateSeasonStats([], player.id, seasonEndYear),
                    gameLog: [],
                    statsError: "Stats could not be loaded for this player.",
                };
            }
        }
    }));

    return playerStats;
}
