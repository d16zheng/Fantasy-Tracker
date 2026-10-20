import type { EspnRosterPlayer } from "../../shared/types/fantasy";
import type { TrackedPlayer } from "../../shared/types/player";

export function createTrackedPlayer(espnPlayer: EspnRosterPlayer): TrackedPlayer {
  return {
    id: `espn:${espnPlayer.espnPlayerId}`,
    espnId: espnPlayer.espnPlayerId,
    firstName: espnPlayer.firstName,
    lastName: espnPlayer.lastName,
    position: espnPlayer.position ?? "",
    team: {
      abbreviation: espnPlayer.nbaTeamAbbreviation ?? "",
    },
  };
}

export function createTrackedPlayers(roster: EspnRosterPlayer[]): TrackedPlayer[] {
  return roster.map(createTrackedPlayer);
}
