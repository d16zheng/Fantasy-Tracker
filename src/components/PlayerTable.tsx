import type { PlayerSeasonSummary } from '../../shared/types/playerStats';

type PlayerTableProps = {
  players: PlayerSeasonSummary[];
};

export default function PlayerTable({ players }: PlayerTableProps) {
  return (
    <div className="table-scroll" role="region" aria-label="Player statistics" tabIndex={0}>
      <table>
        <caption className="sr-only">Regular-season averages for your fantasy roster</caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Team</th>
            <th scope="col">Position</th>
            <th scope="col" className="numeric">GP</th>
            <th scope="col" className="numeric">PPG</th>
            <th scope="col" className="numeric">RPG</th>
            <th scope="col" className="numeric">APG</th>
            <th scope="col" className="numeric">MPG</th>
          </tr>
        </thead>
        <tbody>
          {players.map(({ player, seasonStats }) => {
            const average = (value: number) => seasonStats.gamesPlayed > 0 ? value.toFixed(1) : '—';

            return (
              <tr key={player.id}>
                <th scope="row">{player.firstName} {player.lastName}</th>
                <td>{player.team.abbreviation || '—'}</td>
                <td>{player.position || '—'}</td>
                <td className="numeric">{seasonStats.gamesPlayed}</td>
                <td className="numeric points">{average(seasonStats.ppg)}</td>
                <td className="numeric">{average(seasonStats.rpg)}</td>
                <td className="numeric">{average(seasonStats.apg)}</td>
                <td className="numeric">{average(seasonStats.minutespg)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
