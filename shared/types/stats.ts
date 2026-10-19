import type { Team } from "./team";

export type SeasonPhase = "regular" | "postseason";

export type GameStats = {
    minutes: number;

    fgm: number;
    fga: number;

    ftm: number;
    fta: number;

    threepm: number;
    threepa: number;

    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    to: number;
    points: number;
};

export type SeasonStats = {
    playerId: string;
    season: string;
    gamesPlayed: number;

    minutespg: number;

    fgmpg: number;
    fgapg: number;

    fgPercentage: number;

    ftmpg: number;
    ftapg: number;
    ftPercentage: number;
    threepmpg: number;

    rpg: number;
    apg: number;

    spg: number;
    bpg: number;
    topg: number;

    ppg: number;
};

export type GamePerformance = GameStats & {
    id: string;
    playerId: string;

    espnEventId: string;

    seasonEndYear: number;
    phase: SeasonPhase;

    date: string;

    playerTeam: Team;
    opponent: Team;
    isHome: boolean;
};
