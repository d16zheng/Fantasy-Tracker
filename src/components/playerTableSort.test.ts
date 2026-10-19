import { describe, expect, it } from 'vitest';
import type { PlayerSeasonSummary } from '../../shared/types/playerStats';
import { nextTableSort, sortPlayerSummaries } from './playerTableSort';

function player(name: string, points: number, gamesPlayed = 10): PlayerSeasonSummary {
  return {
    player: { id: name, espnId: name, firstName: name, lastName: 'Player', team: { abbreviation: 'TOR' }, position: 'PG' },
    seasonStats: {
      playerId: name, season: '2025-2026', gamesPlayed, minutespg: 30, fgmpg: 4, fgapg: 10,
      fgPercentage: 40, ftmpg: 2, ftapg: 3, ftPercentage: 66.7, threepmpg: 1,
      rpg: 5, apg: 6, spg: 1, bpg: 1, topg: 2, ppg: points,
    },
    gameLog: [],
  };
}

describe('player table sorting', () => {
  it('starts a new column descending and toggles the same column to ascending', () => {
    const descending = nextTableSort({ column: 'player', direction: 'ascending' }, 'ppg');
    expect(descending).toEqual({ column: 'ppg', direction: 'descending' });
    expect(nextTableSort(descending, 'ppg')).toEqual({ column: 'ppg', direction: 'ascending' });
    expect(nextTableSort(descending, 'player')).toEqual({ column: 'player', direction: 'descending' });
  });

  it('sorts stats numerically and keeps players without games last in either direction', () => {
    const players = [player('No Games', 0, 0), player('Low', 9), player('High', 30)];
    expect(sortPlayerSummaries(players, { column: 'ppg', direction: 'descending' }).map(({ player }) => player.id)).toEqual(['High', 'Low', 'No Games']);
    expect(sortPlayerSummaries(players, { column: 'ppg', direction: 'ascending' }).map(({ player }) => player.id)).toEqual(['Low', 'High', 'No Games']);
    expect(players.map(({ player }) => player.id)).toEqual(['No Games', 'Low', 'High']);
  });

  it('sorts player names alphabetically in both directions', () => {
    const players = [player('Ada', 10), player('Zoe', 10)];
    expect(sortPlayerSummaries(players, { column: 'player', direction: 'descending' }).map(({ player }) => player.id)).toEqual(['Zoe', 'Ada']);
    expect(sortPlayerSummaries(players, { column: 'player', direction: 'ascending' }).map(({ player }) => player.id)).toEqual(['Ada', 'Zoe']);
  });
});
