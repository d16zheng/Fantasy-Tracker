import { Router } from "express";
import { fetchEspnLeague } from "../integrations/espn/client";
import { mapEspnPlayer } from "../integrations/espn/mapper";
import { getCurrentSeasonEndYear } from "../../shared/season";
import { prisma } from "../db/prisma";
import { getFantasyRoster } from "../services/fantasyRosterService";
import { createTrackedPlayers } from "../services/trackedPlayerService";

const router = Router();

router.get("/league", async (req, res) => {
    try {
        const leagueId = req.query.leagueId;
        const teamCount = Number(req.query.teamCount);
        if (typeof leagueId !== "string" || !/^\d+$/.test(leagueId.trim()) || !Number.isInteger(teamCount) || teamCount < 1 || teamCount > 30) {
            return res.status(400).json({ error: "A numeric leagueId and teamCount from 1 to 30 are required" });
        }
        const seasonId = getCurrentSeasonEndYear();
        const response = await fetchEspnLeague(leagueId.trim(), seasonId);
        const allTeams = response.teams.map((team) => ({
            teamId: String(team.id),
            name: team.name || `Team ${team.id}`,
            owner: team.owner || "",
            players: (team.roster?.entries ?? []).map(({ playerPoolEntry }) => mapEspnPlayer(playerPoolEntry.player)),
        }));
        const savedOwners = await prisma.fantasyTeamOwner.findMany({ where: { leagueId: leagueId.trim() } });
        const ownersByTeam = new Map(savedOwners.map(({ teamId, owner }) => [String(teamId), owner]));
        await prisma.$transaction(allTeams.map((team) => prisma.fantasyLeagueTeam.upsert({
            where: { leagueId_teamId: { leagueId: leagueId.trim(), teamId: Number(team.teamId) } },
            create: { leagueId: leagueId.trim(), teamId: Number(team.teamId), name: team.name, rosterJson: JSON.stringify(team.players) },
            update: { name: team.name, rosterJson: JSON.stringify(team.players) },
        })));
        const teams = allTeams.slice(0, teamCount).map((team) => ({ ...team, owner: ownersByTeam.get(team.teamId) || team.owner }));
        return res.json({ leagueId: leagueId.trim(), seasonId, teams });
    } catch (error) {
        console.error("Failed to fetch fantasy league:", error);
        return res.status(500).json({ error: "Failed to fetch fantasy league" });
    }
});

router.put("/owner", async (req, res) => {
    const { leagueId, teamId, owner } = req.body ?? {};
    if (typeof leagueId !== "string" || !/^\d+$/.test(leagueId.trim()) || !Number.isSafeInteger(Number(teamId)) || Number(teamId) < 1 || typeof owner !== "string") {
        return res.status(400).json({ error: "leagueId, teamId, and owner are required" });
    }
    try {
        const value = owner.trim().slice(0, 80);
        await prisma.fantasyTeamOwner.upsert({
            where: { leagueId_teamId: { leagueId: leagueId.trim(), teamId: Number(teamId) } },
            create: { leagueId: leagueId.trim(), teamId: Number(teamId), owner: value },
            update: { owner: value },
        });
        return res.json({ owner: value });
    } catch (error) {
        console.error("Failed to save fantasy team owner:", error);
        return res.status(500).json({ error: "Failed to save team owner" });
    }
});

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
        const {leagueId, teamId, seasonId,} = req.body;
    
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

        const players = createTrackedPlayers(roster);

        res.json(players);
    } catch (error) {
        console.error("Failed to import fantasy roster:", error);
        res.status(500).json({
            error: "Failed to import fantasy roster",
        });
    }
});

export default router;
