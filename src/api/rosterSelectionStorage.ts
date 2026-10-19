export type TeamSelection = { leagueId: string; teamId: string };
export type SavedRosterSelection = TeamSelection & { seasonEndYear: number };

const savedRosterKey = 'sports-tracker:roster-selection';

export function saveRosterSelection(team: TeamSelection, seasonEndYear: number) {
  try {
    window.localStorage.setItem(savedRosterKey, JSON.stringify({ ...team, seasonEndYear }));
  } catch {
    // The app still works when browser storage is unavailable.
  }
}

export function readSavedRosterSelection(seasons: number[]): SavedRosterSelection | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(savedRosterKey) ?? 'null') as Partial<SavedRosterSelection> | null;
    if (
      !saved ||
      typeof saved.leagueId !== 'string' || !/^\d+$/.test(saved.leagueId) ||
      typeof saved.teamId !== 'string' || !/^\d+$/.test(saved.teamId) ||
      !Number.isSafeInteger(Number(saved.teamId)) || Number(saved.teamId) <= 0 ||
      seasons.length === 0
    ) return null;

    const savedSeasonEndYear = saved.seasonEndYear;
    const seasonEndYear = typeof savedSeasonEndYear === 'number' && seasons.includes(savedSeasonEndYear)
      ? savedSeasonEndYear
      : seasons[0];
    return { leagueId: saved.leagueId, teamId: saved.teamId, seasonEndYear };
  } catch {
    return null;
  }
}
