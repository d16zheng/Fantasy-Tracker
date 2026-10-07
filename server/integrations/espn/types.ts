export type EspnPlayerResponse = {
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    defaultPositionId: number;
    teamId?: number;
};

export type EspnRosterEntryResponse = {
    playerPoolEntry?: {
        player?: EspnPlayerResponse
    };
};