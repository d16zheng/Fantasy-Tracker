import type {
  EspnRosterPlayer as LeaguePlayer,
  FantasyLeague as League,
  FantasyLeagueTeam as LeagueTeam,
} from '../../shared/types/fantasy';

export type { League, LeagueTeam, LeaguePlayer };

export async function getLeague(leagueId: string, signal?: AbortSignal): Promise<League> {
  const params = new URLSearchParams({ leagueId });
  const response = await fetch(`/api/fantasy/league?${params}`, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? 'Could not load this league. Check the league ID and try again.');
  }
  return response.json();
}

export async function saveTeamOwner(leagueId: string, teamId: string, owner: string): Promise<void> {
  const response = await fetch('/api/fantasy/owner', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId, teamId: Number(teamId), owner }),
  });
  if (!response.ok) throw new Error('Could not save the owner name.');
}
