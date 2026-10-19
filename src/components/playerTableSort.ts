import type { PlayerSeasonSummary } from '../../shared/types/playerStats';

export const playerTableColumns = [
  { key: 'player', label: 'Player' },
  { key: 'team', label: 'Team' },
  { key: 'position', label: 'Eligible positions' },
  { key: 'minutespg', label: 'MIN' },
  { key: 'fgmpg', label: 'FGM / FGA' },
  { key: 'fgPercentage', label: 'FG%' },
  { key: 'ftmpg', label: 'FTM / FTA' },
  { key: 'ftPercentage', label: 'FT%' },
  { key: 'threepmpg', label: '3PM' },
  { key: 'rpg', label: 'REB' },
  { key: 'apg', label: 'AST' },
  { key: 'spg', label: 'STL' },
  { key: 'bpg', label: 'BLK' },
  { key: 'topg', label: 'TO' },
  { key: 'ppg', label: 'PTS' },
] as const;

export type SortColumn = typeof playerTableColumns[number]['key'];
export type TableSort = { column: SortColumn; direction: 'ascending' | 'descending' };

export function nextTableSort(current: TableSort, column: SortColumn): TableSort {
  return {
    column,
    direction: current.column === column && current.direction === 'descending' ? 'ascending' : 'descending',
  };
}

function sortValue(summary: PlayerSeasonSummary, column: SortColumn): string | number | null {
  const { player, seasonStats } = summary;
  if (column === 'player') return `${player.firstName} ${player.lastName}`.trim();
  if (column === 'team') return player.team.abbreviation || null;
  if (column === 'position') return player.position || null;
  if (seasonStats.gamesPlayed === 0) return null;
  const value = seasonStats[column];
  return Number.isFinite(value) ? value : null;
}

export function sortPlayerSummaries(players: PlayerSeasonSummary[], sort: TableSort): PlayerSeasonSummary[] {
  return [...players].sort((a, b) => {
    const aValue = sortValue(a, sort.column);
    const bValue = sortValue(b, sort.column);
    if (aValue === null && bValue !== null) return 1;
    if (bValue === null && aValue !== null) return -1;

    const comparison = typeof aValue === 'string' && typeof bValue === 'string'
      ? aValue.localeCompare(bValue, undefined, { sensitivity: 'base' })
      : typeof aValue === 'number' && typeof bValue === 'number' ? aValue - bValue : 0;
    if (comparison !== 0) return sort.direction === 'ascending' ? comparison : -comparison;

    return `${a.player.firstName} ${a.player.lastName}`.localeCompare(`${b.player.firstName} ${b.player.lastName}`);
  });
}
