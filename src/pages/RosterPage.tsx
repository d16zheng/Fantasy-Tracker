import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PlayerSeasonSummary } from '../../shared/types/playerStats';
import { getRosterStats } from '../api/statsApi';
import PlayerCards from '../components/PlayerCards';
import PlayerDetails from '../components/PlayerDetails';
import { formatSeason, getCurrentSeasonEndYear } from '../../shared/season';

const defaultSeason = getCurrentSeasonEndYear();
const seasons = Array.from({ length: 4 }, (_, index) => defaultSeason - index);
type TeamSelection = { leagueId: string; teamId: string };

export default function RosterPage() {
  const [leagueId, setLeagueId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [seasonEndYear, setSeasonEndYear] = useState(defaultSeason);
  const [loadedTeam, setLoadedTeam] = useState<TeamSelection | null>(null);
  const [players, setPlayers] = useState<PlayerSeasonSummary[] | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function loadRoster(team: TeamSelection, statsSeason: number) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    setPlayers(null);
    setSelectedPlayerId(null);

    try {
      const roster = await getRosterStats({ ...team, seasonEndYear: statsSeason }, controller.signal);
      if (controller.signal.aborted) return;
      setPlayers(roster);
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : 'Could not load your roster. Please try again.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = { leagueId: leagueId.trim(), teamId };
    setLoadedTeam(team);
    setSearch('');
    void loadRoster(team, seasonEndYear);
  }

  function changeSeason(season: number) {
    setSeasonEndYear(season);
    if (loadedTeam) void loadRoster(loadedTeam, season);
  }

  const selectedPlayer = players?.find(({ player }) => player.id === selectedPlayerId);

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
            <button type="submit">{loading ? 'Loading…' : 'Load roster'}</button>
          </fieldset>
        </form>
        <p className="help">Find leagueId and teamId in your ESPN team URL. Your roster always comes from the current {formatSeason(defaultSeason)} fantasy season.</p>
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      <section className="panel roster-panel" aria-labelledby="roster-heading" aria-busy={loading}>
        <div className="roster-header">
          <div>
            <h2 id="roster-heading">Your roster</h2>
            <p className="help">{players ? `${players.length} players · ${formatSeason(seasonEndYear)} regular-season stats` : 'Player statistics will appear here.'}</p>
            {loadedTeam && <p className="help">League {loadedTeam.leagueId} · Team {loadedTeam.teamId} · Current-season roster</p>}
          </div>
          <label className="season-select">
            Stats season
            <select value={seasonEndYear} onChange={(event) => changeSeason(Number(event.target.value))}>
              {seasons.map((season) => <option key={season} value={season}>{formatSeason(season)}{season === defaultSeason ? ' (current)' : ''}</option>)}
            </select>
          </label>
        </div>
          {players && players.length > 0 && (
            <div className="roster-controls">
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

        {loading ? (
          <div className="empty-state" role="status"><h3>Loading {formatSeason(seasonEndYear)} stats…</h3><p>The first load may take a moment while player stats are fetched.</p></div>
        ) : error && loadedTeam ? (
          <div className="empty-state"><h3>Stats could not be loaded</h3><p>Try again or choose another stats season.</p><button className="retry-button" onClick={() => void loadRoster(loadedTeam, seasonEndYear)}>Retry</button></div>
        ) : players === null ? (
          <div className="empty-state"><h3>No roster loaded yet</h3><p>Enter your team details above to get started.</p></div>
        ) : players.length === 0 ? (
          <div className="empty-state" role="status"><h3>No players found</h3><p>Check your league and team IDs, or add players to your current-season roster.</p></div>
        ) : filteredPlayers.length === 0 ? (
          <div className="empty-state" role="status"><h3>No matching players</h3><p>Try another name or clear your search.</p></div>
        ) : (
          <PlayerCards players={filteredPlayers} onSelect={setSelectedPlayerId} />
        )}
        {players && players.length > 0 && <p className="table-note">PPG: points · RPG: rebounds · APG: assists per game. Select a player for full stats and game logs. A dash means no games recorded.</p>}
      </section>
      {selectedPlayer && <PlayerDetails summary={selectedPlayer} seasonEndYear={seasonEndYear} onClose={() => setSelectedPlayerId(null)} />}
      <footer>Stats provided by ESPN.</footer>
    </main>
  );
}
