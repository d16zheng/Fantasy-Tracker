import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEspnGameLog } from "../gameLogClient";
import { mapEspnGameLog } from "../gameLogMapper";
import { calculateSeasonStats } from "../../../services/seasonStatsService";

async function loadFixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
}

function mockResponse(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchEspnGameLog", () => {
  it("handles the observed filters-only response as no games, with zero season averages", async () => {
    mockResponse(await loadFixture("emptyPlayerGameLog.json"));

    const response = await fetchEspnGameLog("3102531", 2027);
    const games = mapEspnGameLog(response, "espn:3102531", 2027);

    expect(games).toEqual([]);
    expect(calculateSeasonStats(games, "espn:3102531", 2027)).toMatchObject({
      gamesPlayed: 0,
      ppg: 0,
      rpg: 0,
      apg: 0,
      minutespg: 0,
      fgmpg: 0,
      fgapg: 0,
      ftmpg: 0,
      ftapg: 0,
    });
  });

  it("preserves a populated game log and its regular-season totals", async () => {
    mockResponse(await loadFixture("playerGameLog.json"));

    const response = await fetchEspnGameLog("3112335", 2025);
    const games = mapEspnGameLog(response, "espn:3112335", 2025).filter(
      (game) => game.phase === "regular",
    );

    expect(games).toHaveLength(70);
    expect(games.reduce((total, game) => total + game.points, 0)).toBe(2071);
  });

  it.each([
    null,
    {},
    { error: "Upstream failure" },
    { filters: [] },
    { filters: [{ name: "league", value: "nba" }] },
    { names: [], events: {} },
    { names: [], events: {}, seasonTypes: null },
    { names: [], events: {}, seasonTypes: [null] },
  ])("rejects malformed responses instead of treating them as no games: %j", async (body) => {
    mockResponse(body);

    await expect(fetchEspnGameLog("3102531", 2027)).rejects.toThrow(
      "Invalid ESPN game-log response",
    );
  });

  it("does not hide errors or partial game data alongside league filters", async () => {
    const filters = (await loadFixture("emptyPlayerGameLog.json")) as Record<string, unknown>;
    for (const extra of [{ error: "Upstream failure" }, { events: {} }]) {
      mockResponse({ ...filters, ...extra });
      await expect(fetchEspnGameLog("3102531", 2027)).rejects.toThrow(
        "Invalid ESPN game-log response",
      );
    }
  });

  it("preserves HTTP failures even if the body resembles an empty game log", async () => {
    mockResponse(await loadFixture("emptyPlayerGameLog.json"), 403);

    await expect(fetchEspnGameLog("3102531", 2027)).rejects.toThrow(
      "ESPN game-log request failed: 403",
    );
  });
});
