export interface EspnFantasyTeam {
  leagueId: string | number;
  teamId: string | number;
  seasonId: string | number;
}

export type EspnRosterPlayer = {
    espnPlayerId: string;

    firstName: string
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
    seasonId: number;
    teams: FantasyLeagueTeam[];
};
