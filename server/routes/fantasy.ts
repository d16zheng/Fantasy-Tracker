import { Router } from "express";
import { getFantasyRoster } from "../services/fantasyRosterService";
import { getFantasyLeague } from "../services/fantasyLeagueService";
import { updateFantasyTeamOwner } from "../services/fantasyTeamOwnerService";
import { createTrackedPlayers } from "../services/trackedPlayerService";

const router = Router();

router.get("/league", async (req, res) => {
  try {
    const leagueId = req.query.leagueId;

    if (typeof leagueId !== "string" || !/^\d+$/.test(leagueId.trim())) {
      return res.status(400).json({ error: "A numeric leagueId is required" });
    }

    const league = await getFantasyLeague(leagueId.trim());

    return res.json(league);
  } catch (error) {
    console.error("Failed to fetch fantasy league:", error);
    return res.status(500).json({ error: "Failed to fetch fantasy league" });
  }
});

router.put("/owner", async (req, res) => {
  const { leagueId, teamId, owner } = req.body ?? {};
  if (
    typeof leagueId !== "string" ||
    !/^\d+$/.test(leagueId.trim()) ||
    !Number.isSafeInteger(Number(teamId)) ||
    Number(teamId) < 1 ||
    typeof owner !== "string"
  ) {
    return res.status(400).json({ error: "leagueId, teamId, and owner are required" });
  }
  try {
    const value = await updateFantasyTeamOwner(leagueId.trim(), Number(teamId), owner);
    if (value === null) {
      return res.status(404).json({ error: "Fantasy team was not found" });
    }
    return res.json({ owner: value });
  } catch (error) {
    console.error("Failed to save fantasy team owner:", error);
    return res.status(500).json({ error: "Failed to save team owner" });
  }
});

router.get("/roster", async (req, res) => {
  try {
    const { leagueId, teamId, seasonEndYear } = req.query;

    if (!leagueId || !teamId || !seasonEndYear) {
      return res.status(400).json({
        error: "leagueId, teamId, and seasonEndYear are required",
      });
    }
    const fantasyTeam = {
      leagueId: String(leagueId),
      teamId: Number(teamId),
      seasonEndYear: Number(seasonEndYear),
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
  try {
    const { leagueId, teamId, seasonEndYear } = req.body;

    if (!leagueId || !teamId || !seasonEndYear) {
      return res.status(400).json({
        error: "leagueId, teamId, and seasonEndYear are required",
      });
    }

    const fantasyTeam = {
      leagueId: String(leagueId),
      teamId: Number(teamId),
      seasonEndYear: Number(seasonEndYear),
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
