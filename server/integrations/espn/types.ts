export type EspnPlayerResponse = {
    id: number;
    proTeamId: number;

    fullName: string;
    firstName?: string;
    lastName?: string;

    defaultPositionId: number;
};

export type EspnRosterEntryResponse = {
    playerPoolEntry: {
        player: EspnPlayerResponse
    };
};

export type EspnTeamResponse = {
    id: number;

    roster?: {
        entries: EspnRosterEntryResponse[];
    };
};

export type EspnRosterResponse = {
    teams: EspnTeamResponse[];
};