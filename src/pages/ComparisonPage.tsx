import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerSeasonSummary } from '../../shared/types/playerStats';
import { getCurrentSeasonEndYear, formatSeason } from '../../shared/season';
import { getRosterStats } from '../api/statsApi';
import type { League, LeagueTeam } from '../api/leagueApi';

const overviewKey = 'sports-tracker:league-overview';
const currentSeason = getCurrentSeasonEndYear();
const seasons = Array.from({ length: 4 }, (_, index) => currentSeason - index);

function readLeague(): League | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(overviewKey) ?? 'null') as { league?: League } | null;
    return saved?.league && Array.isArray(saved.league.teams) ? saved.league : null;
  } catch {
    return null;
  }
}

function PlayerAverages({ team, players, onSelect }: { team: LeagueTeam; players: PlayerSeasonSummary[]; onSelect: (playerId: string) => void }) {
  return <section className="comparison-team panel">
    <header><h2>{team.name}</h2><p>{team.owner || `Team ${team.teamId}`} · {players.length} players</p></header>
    <div className="table-scroll"><table className="comparison-table">
      <thead><tr><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG%</th><th>3PM</th></tr></thead>
      <tbody>{Array.from({ length: 15 }, (_, index) => {
        const summary = players[index];
        if (!summary) return <tr className="empty-comparison-slot" key={`empty-${index}`} aria-hidden="true"><th>&nbsp;</th>{Array.from({ length: 7 }, (_, cell) => <td key={cell}>&nbsp;</td>)}</tr>;
        const { player, seasonStats } = summary;
        const active = seasonStats.gamesPlayed > 0;
        return <tr key={player.id}>
          <th scope="row"><button className="comparison-player-link" onClick={() => onSelect(player.id)}>{player.firstName} {player.lastName}</button></th>
          <td>{active ? seasonStats.ppg.toFixed(1) : '—'}</td>
          <td>{active ? seasonStats.rpg.toFixed(1) : '—'}</td>
          <td>{active ? seasonStats.apg.toFixed(1) : '—'}</td>
          <td>{active ? seasonStats.spg.toFixed(1) : '—'}</td>
          <td>{active ? seasonStats.bpg.toFixed(1) : '—'}</td>
          <td>{active ? `${seasonStats.fgPercentage.toFixed(1)}%` : '—'}</td>
          <td>{active ? seasonStats.threepmpg.toFixed(1) : '—'}</td>
        </tr>;
      })}</tbody>
    </table></div>
  </section>;
}

export default function ComparisonPage() {
  const [league] = useState(readLeague);
  const [routeParams] = useState(() => new URLSearchParams(window.location.search));
  const autoComparePending = useRef(routeParams.has('firstTeamId') && routeParams.has('secondTeamId'));
  const [firstTeamId, setFirstTeamId] = useState(() => {
    const requested = routeParams.get('firstTeamId');
    return requested && league?.teams.some(({ teamId }) => teamId === requested) ? requested : league?.teams[0]?.teamId ?? '';
  });
  const [secondTeamId, setSecondTeamId] = useState(() => {
    const requested = routeParams.get('secondTeamId');
    return requested && requested !== routeParams.get('firstTeamId') && league?.teams.some(({ teamId }) => teamId === requested) ? requested : league?.teams[1]?.teamId ?? '';
  });
  const requestedSeason = Number(routeParams.get('seasonEndYear'));
  const [seasonEndYear, setSeasonEndYear] = useState(seasons.includes(requestedSeason) ? requestedSeason : currentSeason);
  const [displayedSeasonEndYear, setDisplayedSeasonEndYear] = useState(seasons.includes(requestedSeason) ? requestedSeason : currentSeason);
  const [firstPlayers, setFirstPlayers] = useState<PlayerSeasonSummary[] | null>(null);
  const [secondPlayers, setSecondPlayers] = useState<PlayerSeasonSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const compare = useCallback(async (requestedSeasonEndYear = seasonEndYear) => {
    if (!league || !firstTeamId || !secondTeamId || firstTeamId === secondTeamId) return;
    setLoading(true); setError('');
    try {
      const [first, second] = await Promise.all([
        getRosterStats({ leagueId: league.leagueId, teamId: firstTeamId, seasonEndYear: requestedSeasonEndYear }),
        getRosterStats({ leagueId: league.leagueId, teamId: secondTeamId, seasonEndYear: requestedSeasonEndYear }),
      ]);
      setFirstPlayers(first); setSecondPlayers(second); setDisplayedSeasonEndYear(requestedSeasonEndYear);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load team statistics.');
    } finally { setLoading(false); }
  }, [firstTeamId, league, secondTeamId, seasonEndYear]);

  useEffect(() => {
    if (!autoComparePending.current) return;
    autoComparePending.current = false;
    void compare();
  }, [compare]);

  const firstTeam = league?.teams.find(({ teamId }) => teamId === firstTeamId);
  const secondTeam = league?.teams.find(({ teamId }) => teamId === secondTeamId);

  function openPlayer(team: LeagueTeam, playerId: string) {
    const returnParams = new URLSearchParams({ firstTeamId, secondTeamId, seasonEndYear: String(displayedSeasonEndYear) });
    const params = new URLSearchParams({ name: team.name, owner: team.owner, playerId, seasonEndYear: String(displayedSeasonEndYear), returnTo: `/compare?${returnParams}` });
    window.location.href = `/team/${encodeURIComponent(league?.leagueId ?? '')}/${team.teamId}?${params}`;
  }

  return <main className="container">
    <header className="page-header"><p className="eyebrow">Sports Tracker <span>/ NBA Fantasy</span></p><h1>Compare teams.</h1><p>Compare each roster’s {formatSeason(displayedSeasonEndYear)} season averages side by side.</p></header>
    <nav className="page-tabs" aria-label="League pages"><a href="/">League rosters</a><a href="/compare" aria-current="page">Compare teams</a></nav>
    {!league || league.teams.length < 2 ? <section className="panel empty-state"><h2>Load a league first</h2><p>Open the league rosters page and load a league with at least two teams.</p><a href="/">← League rosters</a></section> : <>
      <section className="panel" aria-labelledby="comparison-heading">
        <h2 id="comparison-heading">Choose two teams</h2>
        <div className="comparison-controls">
          <label>First team<select value={firstTeamId} disabled={loading} onChange={(e) => { setFirstTeamId(e.target.value); setFirstPlayers(null); setSecondPlayers(null); }}>{league.teams.map((team) => <option key={team.teamId} value={team.teamId} disabled={team.teamId === secondTeamId}>{team.name}</option>)}</select></label>
          <span className="versus">vs</span>
          <label>Second team<select value={secondTeamId} disabled={loading} onChange={(e) => { setSecondTeamId(e.target.value); setFirstPlayers(null); setSecondPlayers(null); }}>{league.teams.map((team) => <option key={team.teamId} value={team.teamId} disabled={team.teamId === firstTeamId}>{team.name}</option>)}</select></label>
          <button onClick={() => void compare()} disabled={loading || firstTeamId === secondTeamId}>{loading ? 'Loading stats…' : 'Compare rosters'}</button>
        </div>
        <p className="help">Choose the two teams independently, then load their rosters. Player names open their detail page.</p>
      </section>
      {firstPlayers && secondPlayers && <section className="comparison-season-bar" aria-label="Comparison season">
        <p>Comparing <strong>{firstTeam?.name}</strong> and <strong>{secondTeam?.name}</strong></p>
        <label>Stats season<select value={seasonEndYear} disabled={loading} onChange={(e) => {
          const selectedSeason = Number(e.target.value);
          setSeasonEndYear(selectedSeason);
          void compare(selectedSeason);
        }}>
          {seasons.map((season) => <option key={season} value={season}>{formatSeason(season)}{season === currentSeason ? ' (current)' : ''}</option>)}
        </select></label>
      </section>}
      {loading && firstPlayers && secondPlayers && <div className="stats-update" role="status">Updating both rosters to {formatSeason(seasonEndYear)}…</div>}
      {error && <p className="error" role="alert">{error}</p>}
      {loading && !firstPlayers && <div className="empty-state" role="status"><h3>Loading both rosters and season averages…</h3></div>}
      {firstPlayers && secondPlayers && firstTeam && secondTeam && <div className="comparison-grid">
        <PlayerAverages team={firstTeam} players={firstPlayers} onSelect={(playerId) => openPlayer(firstTeam, playerId)} />
        <PlayerAverages team={secondTeam} players={secondPlayers} onSelect={(playerId) => openPlayer(secondTeam, playerId)} />
      </div>}
    </>}
    <footer>Player statistics provided by ESPN.</footer>
  </main>;
}
