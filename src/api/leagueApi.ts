export type LeaguePlayer = { espnPlayerId: string; firstName: string; lastName: string; position?: string; nbaTeamAbbreviation?: string };
export type LeagueTeam = { teamId: string; name: string; owner: string; players: LeaguePlayer[] };
export type League = { leagueId: string; seasonId: number; teams: LeagueTeam[] };

export async function getLeague(leagueId: string, teamCount: number, signal?: AbortSignal): Promise<League> {
  const params = new URLSearchParams({ leagueId, teamCount: String(teamCount) });
  const response = await fetch(`/api/fantasy/league?${params}`, { signal });
  if (!response.ok) throw new Error('Could not load this league. Check the league ID and try again.');
  return response.json();
}

export async function saveTeamOwner(leagueId: string, teamId: string, owner: string): Promise<void> {
  const response = await fetch('/api/fantasy/owner', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId, teamId: Number(teamId), owner }),
  });
  if (!response.ok) throw new Error('Could not save the owner name.');
}
