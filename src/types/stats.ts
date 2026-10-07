import type {Team} from "./team"

export type SeasonStats = {
    playerId: string;
    season: string;
    gamesPlayed: number;

    minutespg: number;

    fgPercentage: number;
    ftPercentage: number;
    threepmpg: number;

    rpg: number;
    apg: number;

    spg: number;
    bpg: number;
    topg: number;

    ppg: number;
}

export type GamePerformance = {
    gameId: string;
    playerId: string;

    date: string;

    opponent: Team;

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
}