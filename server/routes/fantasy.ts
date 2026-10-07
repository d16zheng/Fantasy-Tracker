import { Router } from "express";
import { getFantasyRoster } from "../services/fantasyRosterService";

const router = Router();

router.get("/roster", async (req, res) => {
    try {
        const {leagueId, teamId, seasonId} = req.query;

        if (!leagueId || !teamId || !seasonId) {
            return res.status(400).json({
                error: "leagueId, teamId, and seasonId are required",
            });
        }
        const fantasyTeam = {
            leagueId: String(leagueId),
            teamId: Number(teamId),
            seasonId: Number(seasonId),
        };

        const roster = await getFantasyRoster(fantasyTeam);

        res.json(roster);
    } catch (error) {
        console.error("Failed to fetch fantasy roster:", error);

        res.status(500).json({
            error: "Failed to fetch fantasy roster",
        });
    }
});

export default router;
