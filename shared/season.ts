export function getCurrentSeasonEndYear(date = new Date()): number {
  return date.getFullYear() + (date.getMonth() >= 6 ? 1 : 0);
}

export function formatSeason(seasonEndYear: number): string {
  return `${seasonEndYear - 1}–${String(seasonEndYear).slice(-2)}`;
}
