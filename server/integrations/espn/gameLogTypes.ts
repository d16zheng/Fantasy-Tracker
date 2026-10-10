export type EspnGameLogRow =  {
    eventId: string;
    stats: string[];
};

export type EspnGameLogEvent = {
    id: string;
    gameDate?: string;
    atVs?: "@" | "vs";
    team?: {
        id?: string;
        abbreviation?: string;
        isAllStar?: boolean;
    };
    opponent?: {
        id?: string;
        abbreviation?: string;
        displayName?: string;
        isAllStar?: boolean;
    };
    gameResult?: string;
};

export type EspnGameLogSeasonType = {
    displayName?: string;
    categories?: {
        displayName?: string;
        type?: string;
        events?: EspnGameLogRow[];
    }[];
};

export type EspnGameLogResponse = {
    names: string[];
    events: Record<string, EspnGameLogEvent>;
    seasonTypes: EspnGameLogSeasonType[];
};
