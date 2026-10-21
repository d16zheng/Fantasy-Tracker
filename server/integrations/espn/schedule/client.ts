import type { EspnScheduleEvent, EspnScoreboardResponse } from "./types";

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";

export async function fetchDailyGames(date: string): Promise<EspnScheduleEvent[]> {
  const formatted = date.replace(/-/g, "");
  const response = await fetch(`${BASE_URL}/scoreboard?dates=${formatted}&limit=100`);

  if (!response.ok) {
    throw new Error(`Failed to fetch NBA schedule: ${date}`);
  }

  const data = (await response.json()) as EspnScoreboardResponse;
  if (!Array.isArray(data.events)) {
    throw new Error("Invalid ESPN schedule response");
  }

  return data.events;
}
