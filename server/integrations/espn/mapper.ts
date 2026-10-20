import type { EspnPlayerResponse } from "./types";
import type { EspnRosterPlayer } from "../../../shared/types/fantasy";

function mapEspnPosition(positionId: number): string | undefined {
  const positions: Record<number, string> = {
    1: "PG",
    2: "SG",
    3: "SF",
    4: "PF",
    5: "C",
  };

  return positions[positionId];
}

function mapEspnEligibleSlot(slotId: number): string | undefined {
  const positions: Record<number, string> = {
    0: "PG",
    1: "SG",
    2: "SF",
    3: "PF",
    4: "C",
  };

  return positions[slotId];
}

function mapEspnEligiblePositions(player: EspnPlayerResponse): string | undefined {
  const eligiblePositions = [
    ...new Set(
      (player.eligibleSlots ?? [])
        .map(mapEspnEligibleSlot)
        .filter((position): position is string => position !== undefined),
    ),
  ];

  if (eligiblePositions.length > 0) {
    return eligiblePositions.join(" / ");
  }

  return mapEspnPosition(player.defaultPositionId);
}

function mapEspnTeam(teamId?: number): string | undefined {
  if (teamId === undefined) {
    return undefined;
  }

  const teams: Record<number, string> = {
    1: "ATL",
    2: "BOS",
    3: "NOP",
    4: "CHI",
    5: "CLE",
    6: "DAL",
    7: "DEN",
    8: "DET",
    9: "GSW",
    10: "HOU",
    11: "IND",
    12: "LAC",
    13: "LAL",
    14: "MIA",
    15: "MIL",
    16: "MIN",
    17: "BKN",
    18: "NYK",
    19: "ORL",
    20: "PHI",
    21: "PHX",
    22: "POR",
    23: "SAC",
    24: "SAS",
    25: "OKC",
    26: "UTA",
    27: "WAS",
    28: "TOR",
    29: "MEM",
    30: "CHA",
  };

  return teams[teamId];
}

export function mapEspnPlayer(player: EspnPlayerResponse): EspnRosterPlayer {
  return {
    espnPlayerId: String(player.id),

    firstName: player.firstName ?? "",
    lastName: player.lastName ?? "",

    position: mapEspnEligiblePositions(player),
    nbaTeamAbbreviation: mapEspnTeam(player.proTeamId),
  };
}
