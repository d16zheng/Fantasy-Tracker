import { useEffect, useRef, useState } from 'react';
import type { PlayerSeasonSummary } from '../../shared/types/playerStats';
import { getRosterStats } from '../api/statsApi';
import { readSavedRosterSelection, saveRosterSelection } from '../api/rosterSelectionStorage';
import type { TeamSelection } from '../api/rosterSelectionStorage';
import PlayerTable from '../components/PlayerTable';
import { nextTableSort } from '../components/playerTableSort';
import type { TableSort } from '../components/playerTableSort';
import PlayerDetails from '../components/PlayerDetails';
import { formatSeason, getCurrentSeasonEndYear } from '../../shared/season';

const defaultSeason = getCurrentSeasonEndYear();
const seasons = Array.from({ length: 4 }, (_, index) => defaultSeason - index);

export default function RosterPage({ leagueId, teamId, teamName, owner, initialPlayerId, initialSeasonEndYear, returnTo }: { leagueId: string; teamId: string; teamName: string; owner: string; initialPlayerId: string; initialSeasonEndYear: number | null; returnTo: string }) {
  const [seasonEndYear, setSeasonEndYear] = useState(defaultSeason);
  const [loadedTeam, setLoadedTeam] = useState<TeamSelection | null>(null);
  const [players, setPlayers] = useState<PlayerSeasonSummary[] | null>(null);
  const [displayedSeasonEndYear, setDisplayedSeasonEndYear] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<TableSort>({ column: 'player', direction: 'ascending' });
  const request = useRef<AbortController | null>(null);
  const initialPlayerOpened = useRef(false);

  useEffect(() => () => request.current?.abort(), []);

  async function loadRoster(team: TeamSelection, statsSeason: number, preserveVisibleRoster = false, keepPlayerOpen = false) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    if (!preserveVisibleRoster) {
      setPlayers(null);
      setDisplayedSeasonEndYear(null);
    }
    if (!keepPlayerOpen) setSelectedPlayerId(null);

    try {
      const roster = await getRosterStats({ ...team, seasonEndYear: statsSeason }, controller.signal);
      if (controller.signal.aborted) return;
      setPlayers(roster);
      setDisplayedSeasonEndYear(statsSeason);
      saveRosterSelection(team, statsSeason);
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : 'Could not load your roster. Please try again.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const saved = readSavedRosterSelection(seasons);
    const team = { leagueId, teamId };
    const initialSeason = initialSeasonEndYear && seasons.includes(initialSeasonEndYear)
      ? initialSeasonEndYear
      : saved?.leagueId === leagueId && saved.teamId === teamId ? saved.seasonEndYear : defaultSeason;
    setSeasonEndYear(initialSeason);
    setLoadedTeam(team);
    void loadRoster(team, initialSeason);
  }, [leagueId, teamId, initialSeasonEndYear]);

  useEffect(() => {
    if (!initialPlayerOpened.current && initialPlayerId && players?.some(({ player }) => player.id === initialPlayerId)) {
      initialPlayerOpened.current = true;
      setSelectedPlayerId(initialPlayerId);
    }
  }, [initialPlayerId, players]);

  function changeSeason(season: number, keepPlayerOpen = false) {
    setSeasonEndYear(season);
    if (loadedTeam) {
      void loadRoster(loadedTeam, season, players !== null, keepPlayerOpen);
    }
  }

  function closePlayerDetails() {
    if (initialPlayerId && returnTo) {
      window.location.href = returnTo;
      return;
    }
    setSelectedPlayerId(null);
  }

  const selectedPlayer = players?.find(({ player }) => player.id === selectedPlayerId);
  const displayedSeason = displayedSeasonEndYear ?? seasonEndYear;
  const isUpdatingStats = loading && players !== null;
  const filteredPlayers = (players ?? [])
    .filter(({ player }) => `${player.firstName} ${player.lastName}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <main className="container">
      <header className="page-header">
        <p className="eyebrow">Sports Tracker <span>/ NBA Fantasy</span></p>
        <h1>{teamName || `Team ${teamId}`}</h1>
        <p>{owner ? `Managed by ${owner} · ` : ''}League {leagueId} · current fantasy season roster with player stats.</p>
      </header>
      <a className="back-button" href="/" aria-label="Back to league rosters" title="Back to league rosters">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 7-7m-7 7 7 7" /></svg>
      </a>

      {error && players === null && <p className="error" role="alert">{error}</p>}

      <section className="panel roster-panel" aria-labelledby="roster-heading" aria-busy={loading}>
        <div className="roster-header">
          <div>
            <h2 id="roster-heading">Your roster</h2>
            <p className="help">{players ? `${players.length} players · regular season` : 'Player statistics will appear here.'}</p>
            {loadedTeam && (
              <p className="season-context">
                <span><strong>Roster</strong> {formatSeason(defaultSeason)}</span>
                <span><strong>Stats</strong> {formatSeason(displayedSeason)}</span>
              </p>
            )}
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
            </div>
          )}

        {isUpdatingStats && (
          <div className="stats-update" role="status">Updating every player to {formatSeason(seasonEndYear)} stats…</div>
        )}
        {error && players !== null && (
          <div className="stats-update stats-update-error" role="alert">
            Couldn’t load {formatSeason(seasonEndYear)}. Showing {formatSeason(displayedSeason)} stats instead.
            <button onClick={() => void loadRoster(loadedTeam!, seasonEndYear, true)}>Retry</button>
          </div>
        )}
        {loading && players === null ? (
          <div className="empty-state" role="status"><h3>Loading {formatSeason(seasonEndYear)} stats…</h3><p>The first load may take a moment while player stats are fetched.</p></div>
        ) : error && players === null && loadedTeam ? (
          <div className="empty-state"><h3>Stats could not be loaded</h3><p>Try again or choose another stats season.</p><button className="retry-button" onClick={() => void loadRoster(loadedTeam, seasonEndYear)}>Retry</button></div>
        ) : players === null ? (
          <div className="empty-state"><h3>No roster loaded yet</h3><p>Enter your team details above to get started.</p></div>
        ) : players.length === 0 ? (
          <div className="empty-state" role="status"><h3>No players found</h3><p>Check your league and team IDs, or add players to your current-season roster.</p></div>
        ) : filteredPlayers.length === 0 ? (
          <div className="empty-state" role="status"><h3>No matching players</h3><p>Try another name or clear your search.</p></div>
        ) : (
          <PlayerTable
            players={filteredPlayers}
            seasonLabel={formatSeason(displayedSeason)}
            isUpdating={isUpdatingStats}
            sort={sort}
            onSort={(column) => setSort((current) => nextTableSort(current, column))}
            onSelect={setSelectedPlayerId}
          />
        )}
        {players && players.length > 0 && <p className="table-note">Select a column heading to sort, or a player for season averages, totals, and game logs. Stats are regular-season averages per game; shooting-pair columns sort by makes. A dash means no games recorded.</p>}
      </section>
      {selectedPlayer && <PlayerDetails
        summary={selectedPlayer}
        seasonEndYear={displayedSeason}
        selectedSeasonEndYear={seasonEndYear}
        availableSeasons={seasons}
        loadingSeason={loading && seasonEndYear !== displayedSeason}
        seasonError={error && seasonEndYear !== displayedSeason ? error : ''}
        onSeasonChange={(season) => changeSeason(season, true)}
        onClose={closePlayerDetails}
      />}
      <footer>Stats provided by ESPN.</footer>
    </main>
  );
}
