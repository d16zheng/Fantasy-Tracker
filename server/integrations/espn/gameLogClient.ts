import type { EspnGameLogResponse } from "./gameLogTypes";

const ESPN_GAME_LOG_BASE_URL =
  "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes";

function parseGameLogResponse(value: unknown): EspnGameLogResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid ESPN game-log response");
  }

  const data = value as Record<string, unknown>;

  if (Array.isArray(data.filters) && !data.names) {
    return {
      names: [],
      events: {},
      seasonTypes: [],
    };
  }

  if (
    !Array.isArray(data.names) ||
    !data.events ||
    typeof data.events !== "object" ||
    Array.isArray(data.events) ||
    !Array.isArray(data.seasonTypes)
  ) {
    throw new Error("Invalid ESPN game-log response");
  }

  return data as unknown as EspnGameLogResponse;
}

export async function fetchEspnGameLog(
  espnPlayerId: string,
  seasonEndYear: number,
): Promise<EspnGameLogResponse> {
  const url = new URL(`${ESPN_GAME_LOG_BASE_URL}/${encodeURIComponent(espnPlayerId)}/gamelog`);

  url.searchParams.set("season", String(seasonEndYear));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN game-log request failed: ${response.status} ${response.statusText}`);
  }
  return parseGameLogResponse(await response.json());
}
