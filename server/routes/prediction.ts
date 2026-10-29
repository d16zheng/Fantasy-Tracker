import { Router } from "express";
import type { ModelPredictionRequest, PredictionHorizon } from "../../shared/types/prediction";
import { getCurrentSeasonEndYear } from "../../shared/season";
import { getPlayerGameLog } from "../services/gameLogService";
import { isPredictionModel, requestPlayerPrediction } from "../services/predictionService";

const router = Router();
function isPredictionHorizon(value: string): value is PredictionHorizon {
  return ["next5", "next10", "restOfSeason", "finalSeason"].includes(value);
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

router.get("/player", async (req, res) => {
  const {
    playerId,
    espnPlayerId,
    seasonEndYear: seasonValue,
    model,
    horizon,
    asOfDate,
  } = req.query;
  const seasonEndYear = typeof seasonValue === "string" ? Number(seasonValue) : NaN;
  if (
    typeof playerId !== "string" ||
    !playerId.trim() ||
    typeof espnPlayerId !== "string" ||
    !/^\d+$/.test(espnPlayerId) ||
    !Number.isInteger(seasonEndYear) ||
    seasonEndYear < 1947 ||
    seasonEndYear > getCurrentSeasonEndYear() ||
    typeof model !== "string" ||
    !isPredictionModel(model) ||
    model === "ridge" ||
    typeof horizon !== "string" ||
    !isPredictionHorizon(horizon) ||
    typeof asOfDate !== "string" ||
    !isDate(asOfDate)
  ) {
    return res.status(400).json({ error: "Invalid player prediction parameters" });
  }

  try {
    const years = Array.from({ length: 4 }, (_, index) => seasonEndYear - index).filter(
      (year) => year >= 1947,
    );
    const gameLogs = await Promise.all(
      years.map(async (year) => ({
        seasonEndYear: year,
        games: await getPlayerGameLog(playerId, espnPlayerId, year),
      })),
    );
    const request: ModelPredictionRequest = {
      playerId,
      seasonEndYear,
      model,
      horizon,
      asOfDate,
      gameLogs,
    };
    const result = await requestPlayerPrediction(request);
    return res.json({ ...result, playerId, seasonEndYear, model, horizon, asOfDate });
  } catch (error) {
    console.error("Failed to predict player stats:", error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Prediction service is unavailable",
    });
  }
});

export default router;
