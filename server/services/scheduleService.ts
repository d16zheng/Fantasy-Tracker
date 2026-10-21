import { fetchDailyGames } from "../integrations/espn/schedule/client";

const aliases: Record<string, string> = {
  GS: "GSW",
  NY: "NYK",
  NO: "NOP",
  SA: "SAS",
  UT: "UTA",
  WSH: "WAS",
  PHO: "PHX",
};

export function normalizeTeam(abbreviation: string): string {
  const team = abbreviation.toUpperCase();
  return aliases[team] ?? team;
}

function getDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const date = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (date <= end) {
    dates.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return dates;
}

export async function getWeeklyGameCounts(
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const dates = getDates(startDate, endDate);
  const dailyGames = await Promise.all(dates.map(fetchDailyGames));
  const counts: Record<string, number> = {};
  const seenEvents = new Set<string>();

  for (const games of dailyGames) {
    for (const game of games) {
      if (seenEvents.has(game.id)) continue;
      seenEvents.add(game.id);

      const competitors = game.competitions[0]?.competitors ?? [];
      const teams = new Set(
        competitors
          .map((competitor) => normalizeTeam(competitor.team.abbreviation))
          .filter(Boolean),
      );
      for (const team of teams) counts[team] = (counts[team] ?? 0) + 1;
    }
  }

  return counts;
}
