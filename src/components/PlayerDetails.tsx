import { useEffect, useRef } from 'react';
import type { PlayerSeasonSummary } from '../../shared/types/playerStats';
import { formatSeason } from '../../shared/season';

type Props = {
  summary: PlayerSeasonSummary;
  seasonEndYear: number;
  selectedSeasonEndYear: number;
  availableSeasons: number[];
  loadingSeason: boolean;
  seasonError: string;
  onSeasonChange: (seasonEndYear: number) => void;
  onClose: () => void;
};

type SummaryStat = [label: string, value: string];

const gameDate = (date: string) => new Date(date).toLocaleDateString(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

function SeasonSummaryTable({ id, title, stats }: { id: string; title: string; stats: SummaryStat[] }) {
  return (
    <section className="summary-table-section" aria-labelledby={`${id}-heading`}>
      <h4 id={`${id}-heading`}>{title}</h4>
      <div className="table-scroll summary-table-scroll" role="region" aria-label={`${title} season statistics`} tabIndex={0}>
        <table className="summary-table">
          <thead><tr>{stats.map(([label]) => <th key={label} scope="col" className="numeric">{label}</th>)}</tr></thead>
          <tbody><tr>{stats.map(([label, value]) => <td key={label} className="numeric">{value}</td>)}</tr></tbody>
        </table>
      </div>
    </section>
  );
}

export default function PlayerDetails({ summary, seasonEndYear, selectedSeasonEndYear, availableSeasons, loadingSeason, seasonError, onSeasonChange, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { player, seasonStats, gameLog } = summary;
  const games = [...gameLog].sort((a, b) => b.date.localeCompare(a.date));
  const regularGames = games.filter((game) => game.phase === 'regular');
  const totals = regularGames.reduce((total, game) => ({
    minutes: total.minutes + game.minutes,
    fgm: total.fgm + game.fgm,
    fga: total.fga + game.fga,
    ftm: total.ftm + game.ftm,
    fta: total.fta + game.fta,
    threepm: total.threepm + game.threepm,
    rebounds: total.rebounds + game.rebounds,
    assists: total.assists + game.assists,
    steals: total.steals + game.steals,
    blocks: total.blocks + game.blocks,
    to: total.to + game.to,
    points: total.points + game.points,
  }), { minutes: 0, fgm: 0, fga: 0, ftm: 0, fta: 0, threepm: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, to: 0, points: 0 });
  const averageRows: SummaryStat[] = [
    ['GP', String(seasonStats.gamesPlayed)], ['MIN', seasonStats.gamesPlayed > 0 ? seasonStats.minutespg.toFixed(1) : '—'], ['FGM / FGA', seasonStats.gamesPlayed > 0 ? `${seasonStats.fgmpg.toFixed(1)} / ${seasonStats.fgapg.toFixed(1)}` : '—'], ['FG%', seasonStats.gamesPlayed > 0 ? `${seasonStats.fgPercentage.toFixed(1)}%` : '—'],
    ['FTM / FTA', seasonStats.gamesPlayed > 0 ? `${seasonStats.ftmpg.toFixed(1)} / ${seasonStats.ftapg.toFixed(1)}` : '—'], ['FT%', seasonStats.gamesPlayed > 0 ? `${seasonStats.ftPercentage.toFixed(1)}%` : '—'], ['3PM', seasonStats.gamesPlayed > 0 ? seasonStats.threepmpg.toFixed(1) : '—'], ['REB', seasonStats.gamesPlayed > 0 ? seasonStats.rpg.toFixed(1) : '—'],
    ['AST', seasonStats.gamesPlayed > 0 ? seasonStats.apg.toFixed(1) : '—'], ['STL', seasonStats.gamesPlayed > 0 ? seasonStats.spg.toFixed(1) : '—'], ['BLK', seasonStats.gamesPlayed > 0 ? seasonStats.bpg.toFixed(1) : '—'], ['TO', seasonStats.gamesPlayed > 0 ? seasonStats.topg.toFixed(1) : '—'], ['PTS', seasonStats.gamesPlayed > 0 ? seasonStats.ppg.toFixed(1) : '—'],
  ];
  const totalRows: SummaryStat[] = [
    ['GP', String(regularGames.length)], ['MIN', String(totals.minutes)], ['FGM / FGA', `${totals.fgm} / ${totals.fga}`], ['FG%', totals.fga > 0 ? `${((totals.fgm / totals.fga) * 100).toFixed(1)}%` : '—'],
    ['FTM / FTA', `${totals.ftm} / ${totals.fta}`], ['FT%', totals.fta > 0 ? `${((totals.ftm / totals.fta) * 100).toFixed(1)}%` : '—'], ['3PM', String(totals.threepm)], ['REB', String(totals.rebounds)],
    ['AST', String(totals.assists)], ['STL', String(totals.steals)], ['BLK', String(totals.blocks)], ['TO', String(totals.to)], ['PTS', String(totals.points)],
  ];

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} className="player-dialog" aria-labelledby="player-detail-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className="detail-header">
        <div>
          <p className="eyebrow">{formatSeason(seasonEndYear)} season</p>
          <h2 id="player-detail-title">{player.firstName} {player.lastName}</h2>
          <p className="help">{player.team.abbreviation || 'No team'} · {player.position || 'Position unavailable'}</p>
        </div>
        <div className="detail-actions">
          <label className="detail-season-select">Stats season<select value={selectedSeasonEndYear} onChange={(event) => onSeasonChange(Number(event.target.value))}>
            {availableSeasons.map((season) => <option key={season} value={season}>{formatSeason(season)}</option>)}
          </select></label>
          <button className="close-button" onClick={onClose} autoFocus aria-label="Close player details">Close <span aria-hidden="true">×</span></button>
        </div>
      </header>
      {loadingSeason && <div className="stats-update" role="status">Loading {formatSeason(selectedSeasonEndYear)} stats…</div>}
      {seasonError && <div className="stats-update stats-update-error" role="alert">{seasonError}</div>}
      {summary.statsError && <div className="stats-update stats-update-error" role="alert">{summary.statsError}</div>}
      <section className="season-summary" aria-labelledby="season-summary-heading">
        <h3 id="season-summary-heading">Season summary</h3>
        <SeasonSummaryTable id="season-averages" title="Regular-season averages" stats={averageRows} />
        <SeasonSummaryTable id="season-totals" title="Regular-season totals" stats={totalRows} />
      </section>
      <section className="game-log" aria-labelledby="game-log-heading">
        <div className="game-log-heading"><h3 id="game-log-heading">Game logs</h3><p className="help">Newest first · {games.length} games</p></div>
        {games.length === 0 ? <p className="empty-log">No game logs available for this season.</p> : (
          <>
            <p className="game-log-scroll-hint">Scroll horizontally to see shooting details.</p>
            <div className="table-scroll game-log-scroll" role="region" aria-label="Player game logs" tabIndex={0}>
            <table>
              <caption className="sr-only">{player.firstName} {player.lastName} game logs for {formatSeason(seasonEndYear)}</caption>
              <thead><tr>{['Date', 'Team', 'Opponent', 'Phase', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FGM/A', '3PM/A', 'FTM/A'].map((label, index) => <th key={label} scope="col" className={index >= 4 ? 'numeric' : undefined}>{label}</th>)}</tr></thead>
              <tbody>{games.map((game) => (
                <tr key={game.id}>
                  <th scope="row">{gameDate(game.date)}</th>
                  <td>{game.playerTeam.abbreviation || '—'}</td>
                  <td>{game.isHome ? 'vs' : '@'} {game.opponent.abbreviation || '—'}</td>
                  <td>{game.phase === 'regular' ? 'Regular' : 'Postseason'}</td>
                  {[game.minutes, game.points, game.rebounds, game.assists, game.steals, game.blocks, game.to, `${game.fgm}/${game.fga}`, `${game.threepm}/${game.threepa}`, `${game.ftm}/${game.fta}`].map((value, index) => <td key={index} className="numeric">{value}</td>)}
                </tr>
              ))}</tbody>
            </table>
            </div>
          </>
        )}
        <p className="table-note">MIN: minutes · PTS: points · REB: rebounds · AST: assists · STL: steals · BLK: blocks · TO: turnovers. Shooting columns show makes/attempts.</p>
      </section>
    </dialog>
  );
}
