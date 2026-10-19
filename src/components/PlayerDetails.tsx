import { useEffect, useRef } from 'react';
import type { PlayerSeasonSummary } from '../../shared/types/playerStats';
import { formatSeason } from '../../shared/season';

type Props = {
  summary: PlayerSeasonSummary;
  seasonEndYear: number;
  onClose: () => void;
};

const gameDate = (date: string) => new Date(date).toLocaleDateString(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

export default function PlayerDetails({ summary, seasonEndYear, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { player, seasonStats: stats, gameLog } = summary;
  const games = [...gameLog].sort((a, b) => b.date.localeCompare(a.date));
  const average = (value: number, percentage = false) => stats.gamesPlayed > 0 ? `${value.toFixed(1)}${percentage ? '%' : ''}` : '—';

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
        <button className="close-button" onClick={onClose} autoFocus aria-label="Close player details">Close <span aria-hidden="true">×</span></button>
      </header>
      <section className="season-details" aria-labelledby="averages-heading">
        <h3 id="averages-heading">Regular-season stats</h3>
        {stats.gamesPlayed === 0 && <p className="help">No stats available for this season</p>}
        <dl className="detail-stats">
          {[
            ['Games played', String(stats.gamesPlayed)],
            ['Points / game', average(stats.ppg)],
            ['Rebounds / game', average(stats.rpg)],
            ['Assists / game', average(stats.apg)],
            ['Minutes / game', average(stats.minutespg)],
            ['Steals / game', average(stats.spg)],
            ['Blocks / game', average(stats.bpg)],
            ['Turnovers / game', average(stats.topg)],
            ['Threes made / game', average(stats.threepmpg)],
            ['Field goal %', average(stats.fgPercentage, true)],
            ['Free throw %', average(stats.ftPercentage, true)],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>
      <section className="game-log" aria-labelledby="game-log-heading">
        <div className="game-log-heading"><h3 id="game-log-heading">Game logs</h3><p className="help">Newest first · {games.length} games</p></div>
        {games.length === 0 ? <p className="empty-log">No game logs available for this season.</p> : (
          <div className="table-scroll" role="region" aria-label="Player game logs" tabIndex={0}>
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
        )}
        <p className="table-note">MIN: minutes · PTS: points · REB: rebounds · AST: assists · STL: steals · BLK: blocks · TO: turnovers. Shooting columns show makes/attempts.</p>
      </section>
    </dialog>
  );
}
