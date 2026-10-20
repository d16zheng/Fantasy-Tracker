import type { PlayerSeasonSummary } from "../../shared/types/playerStats";

export type RosterStatsRequest = {
  leagueId: string;
  teamId: string;
  seasonEndYear: number;
};

export async function getRosterStats(
  team: RosterStatsRequest,
  signal?: AbortSignal,
): Promise<PlayerSeasonSummary[]> {
  const params = new URLSearchParams({
    leagueId: String(team.leagueId).trim(),
    teamId: String(team.teamId),
    seasonEndYear: String(team.seasonEndYear),
  });

  const response = await fetch(`/api/stats/roster?${params}`, { signal });
  if (!response.ok) {
    throw new Error(
      "Could not load your roster. Check your league, team, and season, then try again.",
    );
  }

  return response.json();
}
