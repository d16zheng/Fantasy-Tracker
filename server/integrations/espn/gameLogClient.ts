import type { EspnGameLogResponse } from "./gameLogTypes";

const ESPN_GAME_LOG_BASE_URL = "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes";

export async function fetchEspnGameLog(
    espnPlayerId: string,
    seasonEndYear: number
): Promise<EspnGameLogResponse> {

    const url = new URL(
        `${ESPN_GAME_LOG_BASE_URL}/${encodeURIComponent(espnPlayerId)}/gamelog`
    );

    url.searchParams.set(
        "season",
        String(seasonEndYear)
    );

    const response = await fetch(url, {
        headers: {
            Accept: "application/json"
        }
    });

    if (!response.ok){
        throw new Error(
            `ESPN game-log request failed: ${response.status} ${response.statusText}`
        );
    }
    return await response.json() as EspnGameLogResponse;
}
