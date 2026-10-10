import type { TrackedPlayer } from "./player";

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

export type PlayerMatchResult = {
  matched: TrackedPlayer[];
  unmatched: EspnRosterPlayer[];
};
