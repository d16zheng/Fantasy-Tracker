import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PlayerSeasonSummary } from '../../shared/types/playerStats';
import { getRosterStats } from '../api/statsApi';
import PlayerTable from '../components/PlayerTable';

const today = new Date();
const defaultSeason = today.getFullYear() + (today.getMonth() >= 6 ? 1 : 0);

export default function RosterPage() {
  const [leagueId, setLeagueId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [seasonId, setSeasonId] = useState(String(defaultSeason));
  const [players, setPlayers] = useState<PlayerSeasonSummary[] | null>(null);
  const [loadedSeason, setLoadedSeason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    setPlayers(null);

    try {
      const roster = await getRosterStats({ leagueId, teamId, seasonId }, controller.signal);
      if (controller.signal.aborted) return;
      setPlayers(roster);
      setLoadedSeason(`${Number(seasonId) - 1}–${seasonId}`);
      setSearch('');
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : 'Could not load your roster. Please try again.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const filteredPlayers = (players ?? [])
    .filter(({ player }) => `${player.firstName} ${player.lastName}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => sortBy === 'points'
      ? b.seasonStats.ppg - a.seasonStats.ppg
      : `${a.player.firstName} ${a.player.lastName}`.localeCompare(`${b.player.firstName} ${b.player.lastName}`));

  return (
    <main className="container">
      <header className="page-header">
        <p className="eyebrow">Sports Tracker <span>/ NBA Fantasy</span></p>
        <h1>Your roster, at a glance.</h1>
        <p>Load your ESPN fantasy team to see each player’s season averages.</p>
      </header>

      <section className="panel" aria-labelledby="team-heading">
        <h2 id="team-heading">Connect your team</h2>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading} className="roster-form">
            <legend className="sr-only">ESPN fantasy team</legend>
            <label>
              League ID
              <input required inputMode="numeric" pattern="[0-9]+" placeholder="e.g. 1428686661" value={leagueId} onChange={(event) => setLeagueId(event.target.value)} />
            </label>
            <label>
              Team ID
              <input required type="number" min="1" step="1" placeholder="e.g. 5" value={teamId} onChange={(event) => setTeamId(event.target.value)} />
            </label>
            <label>
              Season end year
              <input required type="number" min="1947" max={defaultSeason + 1} step="1" aria-describedby="season-help" value={seasonId} onChange={(event) => setSeasonId(event.target.value)} />
            </label>
            <button type="submit">{loading ? 'Loading…' : 'Load roster'}</button>
          </fieldset>
        </form>
        <p className="help" id="season-help">Find leagueId and teamId in your ESPN team URL. For the 2025–26 season, enter 2026.</p>
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      <section className="panel roster-panel" aria-labelledby="roster-heading" aria-busy={loading}>
        <div className="roster-header">
          <div>
            <h2 id="roster-heading">Your roster</h2>
            <p className="help">{players ? `${loadedSeason} · ${players.length} players · Regular season` : 'Player statistics will appear here.'}</p>
          </div>
          {players && players.length > 0 && (
            <div className="table-controls">
              <label>
                <span className="sr-only">Search players</span>
                <input type="search" placeholder="Search players…" value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
              <label>
                <span className="sr-only">Sort players</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="name">Name A–Z</option>
                  <option value="points">Highest PPG</option>
                </select>
              </label>
            </div>
          )}
        </div>

        {loading ? (
          <div className="empty-state" role="status"><h3>Loading your roster…</h3><p>The first load may take a moment while player stats are fetched.</p></div>
        ) : players === null ? (
          <div className="empty-state"><h3>No roster loaded yet</h3><p>Enter your team details above to get started.</p></div>
        ) : players.length === 0 ? (
          <div className="empty-state" role="status"><h3>No players found</h3><p>Check your team and season, or try a different roster.</p></div>
        ) : filteredPlayers.length === 0 ? (
          <div className="empty-state" role="status"><h3>No matching players</h3><p>Try another name or clear your search.</p></div>
        ) : (
          <PlayerTable players={filteredPlayers} />
        )}
        {players && players.length > 0 && <p className="table-note">GP: games played · PPG: points · RPG: rebounds · APG: assists · MPG: minutes per game. A dash means no games recorded.</p>}
      </section>
      <footer>Stats provided by ESPN.</footer>
    </main>
  );
}
