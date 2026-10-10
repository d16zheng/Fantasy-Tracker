import { Router } from "express";
import { getFantasyRoster } from "../services/fantasyRosterService";
import { matchRosterPlayers } from "../services/playerMatchingService";

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

router.post("/import", async (req, res) => {
    try{
        const {
            leagueId,
            teamId,
            seasonId,
        } = req.body;
    
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
        const result = await matchRosterPlayers(roster);
        
        res.json(result);
    } catch (error) {
        console.error("Failed to import fantasy roster:", error);
        res.status(500).json({
            error: "Failed to import fantasy roster",
        });
    }
});

export default router;
