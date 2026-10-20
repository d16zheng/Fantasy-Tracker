export type EspnFantasyTeam = {
  leagueId: string | number;
  teamId: string | number;
  seasonEndYear: number;
};

export type EspnRosterPlayer = {
  espnPlayerId: string;

  firstName: string;
  lastName: string;

  position?: string;
  nbaTeamAbbreviation?: string;
};

export type FantasyLeagueTeam = {
  teamId: string;
  name: string;
  owner: string;
  players: EspnRosterPlayer[];
};

export type FantasyLeague = {
  leagueId: string;
  seasonEndYear: number;
  teams: FantasyLeagueTeam[];
};
