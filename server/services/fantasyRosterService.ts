import type { EspnFantasyTeam, EspnRosterPlayer } from "../../shared/types/fantasy";

import { fetchEspnRoster } from "../integrations/espn/client";
import { mapEspnPlayer } from "../integrations/espn/mapper";

export async function getFantasyRoster(fantasyTeam: EspnFantasyTeam): Promise<EspnRosterPlayer[]> {
  const rawRoster = await fetchEspnRoster(fantasyTeam);

  const team = rawRoster.teams.find((team) => team.id === fantasyTeam.teamId);
  if (!team?.roster) {
    return [];
  }

  const rosterPlayers = team.roster.entries.map((entry) =>
    mapEspnPlayer(entry.playerPoolEntry.player),
  );

  return rosterPlayers;
}
