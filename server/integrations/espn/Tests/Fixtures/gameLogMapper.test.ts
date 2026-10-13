import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { isNbaTeam } from "../../../../data/nbaTeam";
import type { EspnGameLogResponse } from "../../gameLogTypes";
import { mapEspnGameLog } from "../../gameLogMapper";

async function loadFixture(): Promise<EspnGameLogResponse> {
    const fixtureUrl = new URL(
        "./fixtures/playerGameLog.json",
        import.meta.url,
    );
    const fixture = await readFile(fixtureUrl, "utf8");

    return JSON.parse(fixture) as EspnGameLogResponse;
}

describe("mapEspnGameLog", () => {
    it("maps the NBA regular-season games and excludes All-Star events", async () => {
        const performances = mapEspnGameLog(
            await loadFixture(),
            "espn:3112335",
            2025,
        );
        const regularSeason = performances.filter(
            (performance) => performance.phase === "regular",
        );

        expect(regularSeason).toHaveLength(70);
        expect(new Set(regularSeason.map((game) => game.espnEventId)).size).toBe(70);

        for (const game of regularSeason) {
            expect(isNbaTeam(game.playerTeam.abbreviation)).toBe(true);
            expect(isNbaTeam(game.opponent.abbreviation)).toBe(true);
        }

        const totals = regularSeason.reduce(
            (sum, game) => ({
                points: sum.points + game.points,
                rebounds: sum.rebounds + game.rebounds,
                assists: sum.assists + game.assists,
            }),
            { points: 0, rebounds: 0, assists: 0 },
        );

        expect(totals).toEqual({
            points: 2071,
            rebounds: 892,
            assists: 716,
        });
    });
});
