import type { GamePerformance, GameStats } from "./stats";

// The period being predicted.
export type PredictionHorizon = "next5" | "next10" | "restOfSeason" | "finalSeason";

// The mathematical model generating the prediction.
export type PredictionModel = "seasonAverage" | "recentAverage" | "weightedAverage" | "ridge";

// Predicted per-game values for every stat.
export type PredictedStats = GameStats;

// Expected averages for a future group of games.
export interface ForecastPoint {
  gameNumber: number;
  predictedStats: PredictedStats;
}

// Input sent from React to Express.
export interface PlayerProjectionRequest {
  playerId: string;
  espnPlayerId: string;
  seasonEndYear: number;
  horizon: PredictionHorizon;
  model: PredictionModel;
}

// Data sent from Express to Python.
export interface ModelPredictionRequest {
  playerId: string;
  seasonEndYear: number;
  horizon: PredictionHorizon;
  model: PredictionModel;
  asOfDate: string;

  // Needed for rest-of-season and final-season forecasts.
  expectedRemainingGames?: number;

  // Historical games from multiple seasons, filtered to games before asOfDate.
  gameLogs: {
    seasonEndYear: number;
    games: GamePerformance[];
  }[];
}

// Prediction returned by Python.
export interface ModelPredictionResult {
  predictedStats: PredictedStats;
  forecast: ForecastPoint[];
  expectedGames: number;
}

// Final response returned to React.
export interface PlayerProjectionResult {
  playerId: string;
  seasonEndYear: number;
  horizon: PredictionHorizon;
  model: PredictionModel;
  asOfDate: string;
  predictedStats: PredictedStats;
  expectedGames: number;
  forecast: ForecastPoint[];
}

// Historical prediction accuracy.
export interface ProjectionAccuracy {
  playerId: string;
  model: PredictionModel;
  horizon: PredictionHorizon;
  predictedStats: PredictedStats;
  actualStats: GameStats;
  absoluteErrors: Partial<Record<keyof GameStats, number>>;
}
