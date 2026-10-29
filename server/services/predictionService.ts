import type {
  ModelPredictionRequest,
  ModelPredictionResult,
  PredictionModel,
} from "../../shared/types/prediction";

const statServiceUrl = (process.env.PREDICTION_SERVICE_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

export async function requestPlayerPrediction(
  request: ModelPredictionRequest,
): Promise<ModelPredictionResult> {
  const response = await fetch(`${statServiceUrl}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Prediction service returned ${response.status}`);
  }

  return (await response.json()) as ModelPredictionResult;
}

export function isPredictionModel(value: string): value is PredictionModel {
  return ["seasonAverage", "recentAverage", "weightedAverage", "ridge"].includes(value);
}
