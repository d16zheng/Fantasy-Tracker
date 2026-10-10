import type { GamePerformance } from "../../../shared/types/stats";
import type { EspnGameLogResponse } from "./gameLogTypes";

function parseNumber(value: string): number {
    if (value.trim() === "") {
        throw new Error("Empty ESPN statistic")
    }

    const number = Number(value);

    if(!Number.isFinite(number)) {
        throw new Error(`Invalid statistics: ${value}`);
    }
    return number;
}

function parseShooting(value: string): {
    made: number;
    attempted: number;
} {
    const parts = value.split("-");
    if (parts.length !== 2) {
        throw new Error(`Invalid shooting stat: ${value}`)
    }
    const [made, attempted] = parts

    if (made === undefined || attempted === undefined){
        throw new Error(`Invalid shooting stats: ${value}`);
    }

    return {
        made: parseNumber(made),
        attempted: parseNumber(attempted)
    };
}

function mapStatValues (
    names: string[],
    stats: string[]
): Record<string, string> {
    if (names.length !== stats.length) {
        throw new Error(
            "ESPN stat names and values have different lengths"
        );
    }

    return Object.fromEntries(
        names.map((name, index) => [
            name, 
            stats[index]
        ])
    )
}

function getRequiredStat(
    stats: Record<string, string>,
    name: string
): string {
    const value = stats[name];
    
    if(value === undefined) {
        throw new Error(`Missing ESPN statistic: ${name}`)
    }

    return value;
}

function mapGameStats(
    stats: Record<string, string>
) {
    const get = (name: string) =>
        getRequiredStat(stats, name);

    const fg = parseShooting(get("fieldGoalsMade-fieldGoalsAttempted"));
    const ft = parseShooting(get("freeThrowsMade-freeThrowsAttempted"));
    const three = parseShooting(
        get("threePointFieldGoalsMade-threePointFieldGoalsAttempted")
    );

    return {
        minutes: parseNumber(get("minutes")),

        fgm: fg.made,
        fga: fg.attempted,

        ftm: ft.made,
        fta: ft.attempted,

        threepm: three.made,
        threepa: three.attempted,

        rebounds: parseNumber(get("totalRebounds")),
        assists: parseNumber(get("assists")),
        steals: parseNumber(get("steals")),
        blocks: parseNumber(get("blocks")),
        to: parseNumber(get("turnovers")),
        points: parseNumber(get("points"))
    };
}

export function mapEspnGameLog(
    response: EspnGameLogResponse,
    playerId: string,
    seasonEndYear: number
): GamePerformance[] {
    const performances: GamePerformance[] = [];
    const seenEvents = new Set<string>();

    for (const seasonType of response.seasonTypes) {
        const name = seasonType.displayName?.toLowerCase() ?? "";

        const phase = name.includes("regular season")
            ? "regular"
            : name.includes("postseason") || name.includes("playoffs")
                ? "postseason"
                : undefined
        
            if (!phase) continue;

            for (const category of seasonType.categories ?? []) {
                if (category.type !== "event") continue;

                for (const row of category.events ?? []) {
                    if (seenEvents.has(row.eventId)) continue;

                    const event = response.events[row.eventId];

                    if (!event) {
                        throw new Error(
                            `Missing ESPN event: ${row.eventId}`
                        );
                    }

                    const namedStats = mapStatValues(
                        response.names,
                        row.stats
                    );

                    const gameStats = mapGameStats(namedStats);

                    const playerTeam = event.team?.abbreviation;
                    const opponent = event.opponent?.abbreviation;
                    const atVs = event.atVs;

                    if (
                        !event.gameDate ||
                        Number.isNaN(Date.parse(event.gameDate)) ||
                        !playerTeam ||
                        !opponent ||
                        (atVs !== "@" && atVs !== "vs")
                    ) {
                        throw new Error(
                            `Incomplete game metadata: ${row.eventId}`,
                        );
                    }

                    if (event.team?.isAllStar || event.opponent?.isAllStar) {
                        continue;
                    }

                    const performance: GamePerformance = {
                        id: `${playerId}:${row.eventId}`,
                        playerId,
                        espnEventId: row.eventId,

                        seasonEndYear,
                        phase,

                        date: new Date(event.gameDate).toISOString(),

                        playerTeam: {
                            abbreviation: playerTeam
                        },

                        opponent: {
                            abbreviation: opponent
                        },

                        isHome: atVs === "vs",

                        ...gameStats
                    };

                        performances.push(performance);
                        seenEvents.add(row.eventId)
                    }
                }
    }
    return performances.sort(
        (a,b) => a.date.localeCompare(b.date)
    );
}
