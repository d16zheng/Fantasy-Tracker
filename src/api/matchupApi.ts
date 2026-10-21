import type {
  ComparisonResult,
  MatchupResult,
  WeeklyProjectionResult,
} from "../../shared/types/matchup";

export type ComparisonRequest = {
  leagueId: string;
  firstTeamId: string;
  secondTeamId: string;
  seasonEndYear: number;
};

export type MatchupRequest = ComparisonRequest & {
  startDate: string;
  endDate: string;
};

async function fetchResult<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not load team comparison.");
  }
  return response.json() as Promise<T>;
}

function queryString(params: Record<string, string | number>): string {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
  ).toString();
}

export function getTeamComparison(
  request: ComparisonRequest,
  signal?: AbortSignal,
): Promise<ComparisonResult> {
  return fetchResult(`/api/matchup/comparison?${queryString(request)}`, signal);
}

export function getWeeklyMatchup(
  request: MatchupRequest,
  signal?: AbortSignal,
): Promise<MatchupResult> {
  return fetchResult(`/api/matchup?${queryString(request)}`, signal);
}

export function getWeeklyProjection(
  request: MatchupRequest,
  signal?: AbortSignal,
): Promise<WeeklyProjectionResult> {
  return fetchResult(`/api/matchup/projection?${queryString(request)}`, signal);
}

export function getTeamScheduledGames(
  startDate: string,
  endDate: string,
  nbaTeamAbbreviation: string,
  signal?: AbortSignal,
): Promise<{ nbaTeamAbbreviation: string; scheduledGames: number }> {
  return fetchResult(
    `/api/matchup/schedule?${queryString({ startDate, endDate, nbaTeamAbbreviation })}`,
    signal,
  );
}
