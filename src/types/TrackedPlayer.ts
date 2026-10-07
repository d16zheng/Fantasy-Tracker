import type { Team } from "./team"
export type TrackedPlayer = {
    
    id: string;

    espnId?: string;
    bdlId: number;

    firstName: string;
    lastName: string;

    position: string;
    team: Team;
};