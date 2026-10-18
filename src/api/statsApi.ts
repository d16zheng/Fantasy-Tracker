import type { EspnFantasyTeam } from '../../shared/types/fantasy';
import type { PlayerSeasonSummary } from '../../shared/types/playerStats';

export async function getRosterStats(
  team: EspnFantasyTeam,
  signal?: AbortSignal,
): Promise<PlayerSeasonSummary[]> {
  const params = new URLSearchParams({
    leagueId: String(team.leagueId).trim(),
    teamId: String(team.teamId),
    seasonId: String(team.seasonId),
  });

  const response = await fetch(`/api/stats/roster?${params}`, { signal });
  if (!response.ok) {
    throw new Error('Could not load your roster. Check your league, team, and season, then try again.');
  }

  return response.json();
}
