import type {
  ModelPredictionResult,
  PredictionHorizon,
  PredictionModel,
} from "../../shared/types/prediction";

export type PlayerPredictionRequest = {
  playerId: string;
  espnPlayerId: string;
  seasonEndYear: number;
  model: PredictionModel;
  horizon: PredictionHorizon;
  asOfDate: string;
};

export async function getPlayerPrediction(
  request: PlayerPredictionRequest,
  signal?: AbortSignal,
): Promise<ModelPredictionResult> {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(request).map(([key, value]) => [key, String(value)])),
  );
  const response = await fetch(`/api/prediction/player?${query}`, { signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not load player prediction.");
  }
  return response.json() as Promise<ModelPredictionResult>;
}
