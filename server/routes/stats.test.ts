import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getRosterPlayerStats } from "../services/playerStatsService";
import statsRouter from "./stats";

vi.mock("../services/playerStatsService", () => ({ getRosterPlayerStats: vi.fn() }));
vi.mock("../services/gameLogService", () => ({ getPlayerGameLog: vi.fn() }));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use("/api/stats", statsRouter);
  server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", (error?: Error) =>
      error ? reject(error) : resolve(listener),
    );
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/stats/roster`;
});

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      if (!server?.listening) return resolve();
      server.close((error) => (error ? reject(error) : resolve()));
    }),
);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 18));
  vi.mocked(getRosterPlayerStats).mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GET /api/stats/roster", () => {
  it("keeps the current roster season for all four stats seasons", async () => {
    for (const seasonEndYear of [2027, 2026, 2025, 2024]) {
      const response = await fetch(
        `${baseUrl}?leagueId=123&teamId=5&seasonEndYear=${seasonEndYear}`,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
      expect(getRosterPlayerStats).toHaveBeenLastCalledWith(
        { leagueId: "123", teamId: 5, seasonEndYear: 2027 },
        seasonEndYear,
      );
    }
  });

  it.each([
    [new Date(2026, 5, 30, 23, 59), 2026],
    [new Date(2026, 6, 1), 2027],
    [new Date(2027, 0, 1), 2027],
  ])("uses the current fantasy season at %s", async (date, rosterSeason) => {
    vi.setSystemTime(date);
    const response = await fetch(
      `${baseUrl}?leagueId=123&teamId=5&seasonEndYear=2025&seasonId=2000`,
    );
    expect(response.status).toBe(200);
    expect(getRosterPlayerStats).toHaveBeenCalledWith(
      { leagueId: "123", teamId: 5, seasonEndYear: rosterSeason },
      2025,
    );
  });

  it.each(["", "NaN", "2025.5", "1946", "2028", "Infinity", "2e3", "2025&seasonEndYear=2026"])(
    "rejects invalid stats years: %s",
    async (year) => {
      const response = await fetch(`${baseUrl}?leagueId=123&teamId=5&seasonEndYear=${year}`);
      expect(response.status).toBe(400);
      expect(getRosterPlayerStats).not.toHaveBeenCalled();
    },
  );

  it.each([
    "leagueId=123&teamId=5&seasonId=2025",
    "leagueId=123&seasonEndYear=2025",
    "teamId=5&seasonEndYear=2025",
    "leagueId=abc&teamId=5&seasonEndYear=2025",
    "leagueId=123&teamId=0&seasonEndYear=2025",
    "leagueId=123&teamId=1.5&seasonEndYear=2025",
    "leagueId=123&teamId=5&teamId=6&seasonEndYear=2025",
  ])("rejects missing or invalid parameters: %s", async (query) => {
    expect((await fetch(`${baseUrl}?${query}`)).status).toBe(400);
    expect(getRosterPlayerStats).not.toHaveBeenCalled();
  });

  it("returns service failures as errors, not an empty roster", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      vi.mocked(getRosterPlayerStats).mockRejectedValueOnce(new Error("ESPN unavailable"));
      const response = await fetch(`${baseUrl}?leagueId=123&teamId=5&seasonEndYear=2025`);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Failed to fetch roster statistics" });
    } finally {
      log.mockRestore();
    }
  });
});
