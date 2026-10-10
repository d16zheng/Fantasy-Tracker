export type BalldontlieTeamResponse = {
    id: number;
    conference: string;
    division: string;
    city: string;
    name: string;
    full_name: string;
    abbreviation: string;
};

export type BalldontliePlayerResponse = {
    id: number;
    first_name: string;
    last_name: string;
    position: string;

    team: BalldontlieTeamResponse;
};

export type BalldontliePlayerSearchResponse = {
    data: BalldontliePlayerResponse[];
};