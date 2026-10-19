import { Router } from "express";
import { getPlayerGameLog } from "../services/gameLogService";
import { getRosterPlayerStats } from "../services/playerStatsService";
import { getCurrentSeasonEndYear } from "../../shared/season";

const router = Router()

router.get("/gamelog", async (req, res) => {
    try {
        const {playerId, espnPlayerId, seasonEndYear} = req.query

        if(!playerId || !espnPlayerId || !seasonEndYear) {
            return res.status(400).json({
                error: "playerId, espnPlayerId, and seasonEndYear are required",
            });
        }

        const season = Number(seasonEndYear);

        if (
            typeof playerId !== "string" ||
            typeof espnPlayerId !== "string" ||
            !Number.isInteger(season) ||
            season < 1947
        ) {
            return res.status(400).json({
                error: "Invalid player IDs or seasonEndYear",
            });
        }
        const gameLog = await getPlayerGameLog(
            playerId,
            espnPlayerId,
            season
        );

        return res.json(gameLog);
    } catch (error) {
        console.error("Failed to fetch game log:", error);

        return res.status(500).json({
            error: "Failed to fetch player game log",
        });
    }
});

router.get("/roster", async (req, res) =>{
    try {
        const {leagueId, teamId, seasonEndYear} = req.query;

        if (
            typeof leagueId !== "string" ||
            typeof teamId !== "string" ||
            typeof seasonEndYear !== "string"
        ) {
            return res.status(400).json({
                error: "leagueId, teamId, and seasonEndYear are required",
            });
        }

        const team = Number(teamId);
        const season = Number(seasonEndYear);
        const currentRosterSeason = getCurrentSeasonEndYear();
        
        if (
            !/^\d+$/.test(leagueId.trim()) ||
            !Number.isSafeInteger(team) ||
            team <= 0 ||
            !/^\d{4}$/.test(seasonEndYear) ||
            !Number.isInteger(season) ||
            season < 1947 ||
            season > currentRosterSeason
        ) {
            return res.status(400).json({
                error: `Invalid leagueId, teamId, or seasonEndYear (expected 1947–${currentRosterSeason})`,
            });
        }

        const playerStats = await getRosterPlayerStats(
            {
                leagueId: leagueId.trim(),
                teamId: team,
                seasonId: currentRosterSeason
            },
            season
        );

        return res.json(playerStats)

    } catch (error) {
        console.error("Failed to fetch roster stats:", error);

        return res.status(500).json({
            error: "Failed to fetch roster statistics"
        });
    }
})
export default router;
