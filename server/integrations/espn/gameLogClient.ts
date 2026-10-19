import type { EspnGameLogResponse } from "./gameLogTypes";

const ESPN_GAME_LOG_BASE_URL = "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes";

function parseGameLogResponse(value: unknown): EspnGameLogResponse {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        throw new Error("Invalid ESPN game-log response");
    }

    const data = value as Record<string, unknown>;

    if (
        Object.keys(data).every((key) => key === 'filters') &&
        Array.isArray(data.filters) &&
        data.filters.some((filter: unknown) =>
            typeof filter === 'object' && filter !== null &&
            'name' in filter && filter.name === 'league' &&
            'value' in filter && filter.value === 'nba' &&
            'options' in filter && Array.isArray(filter.options) &&
            filter.options.some((option: unknown) =>
                typeof option === 'object' && option !== null &&
                'value' in option && option.value === 'nba'
            )
        )
    ) {
        return {
            names: [],
            events: {},
            seasonTypes: []
        }
    }
    if (
        !Array.isArray(data.names) ||
        !data.names.every((name) => typeof name === 'string') ||
        typeof data.events !== 'object' || data.events === null || Array.isArray(data.events) ||
        !Array.isArray(data.seasonTypes) ||
        !data.seasonTypes.every((seasonType) =>
            typeof seasonType === 'object' && seasonType !== null && !Array.isArray(seasonType)
        )
    ) {
        throw new Error("Invalid ESPN game-log response")
    }

    return data as EspnGameLogResponse
}

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
    return parseGameLogResponse(await response.json());
}
