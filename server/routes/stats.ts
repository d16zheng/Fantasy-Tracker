import { Router } from "express";
import { getPlayerGameLog } from "../services/gameLogService";

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
        console.error("fFailed to fetch game log:", error);

        return res.status(500).json({
            error: "Failed to fetch player game log",
        });
    }
});

export default router;