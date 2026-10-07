import type {Team} from "./team"
export type Player = {
    id: string;
    name: string;
    team: Team;
    position: string;
    headshotUrl?: string;
}