import type { Team } from "./team";

export type Player = {
  id: string;
  name: string;
  team: Team;
  position: string;
  headshotUrl?: string;
};

export type TrackedPlayer = {
  id: string;
  espnId: string;

  firstName: string;
  lastName: string;
  position: string;
  team: Team;
};
