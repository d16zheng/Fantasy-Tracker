import { Router } from "express";

import { getTeamComparison } from "../services/teamComparisonService";
import { getWeeklyMatchup } from "../services/matchupService";

const router = Router();

function singleString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseComparison(query: Record<string, unknown>) {
  const leagueId = singleString(query.leagueId);
  const firstTeamId = singleString(query.firstTeamId);
  const secondTeamId = singleString(query.secondTeamId);
  const seasonValue = singleString(query.seasonEndYear);

  if (
    !leagueId?.trim() ||
    !firstTeamId ||
    !secondTeamId ||
    !seasonValue ||
    !/^\d+$/.test(firstTeamId) ||
    !/^\d+$/.test(secondTeamId) ||
    !/^\d+$/.test(seasonValue) ||
    firstTeamId === secondTeamId
  ) {
    return null;
  }

  const seasonEndYear = Number(seasonValue);

  if (!Number.isSafeInteger(seasonEndYear) || seasonEndYear < 1947) {
    return null;
  }

  return {
    leagueId,
    firstTeamId,
    secondTeamId,
    seasonEndYear,
  };
}

// Base per-game comparison.
router.get("/comparison", async (req, res) => {
  const request = parseComparison(req.query);

  if (!request) {
    return res.status(400).json({
      error: "Invalid comparison parameters",
    });
  }

  try {
    const result = await getTeamComparison(request);
    return res.json(result);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to compare teams",
    });
  }
});

// Historical weekly comparison.
router.get("/", async (req, res) => {
  const request = parseComparison(req.query);
  const startDate = singleString(req.query.startDate);
  const endDate = singleString(req.query.endDate);

  if (
    !request ||
    !startDate ||
    !endDate ||
    !isValidDate(startDate) ||
    !isValidDate(endDate) ||
    startDate > endDate
  ) {
    return res.status(400).json({
      error: "Invalid matchup parameters",
    });
  }

  try {
    const result = await getWeeklyMatchup({
      ...request,
      startDate,
      endDate,
    });

    return res.json(result);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to calculate weekly matchup",
    });
  }
});

export default router;
