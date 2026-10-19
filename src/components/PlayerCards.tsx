import type { PlayerSeasonSummary } from '../../shared/types/playerStats';

type Props = {
  players: PlayerSeasonSummary[];
  onSelect: (playerId: string) => void;
};

export default function PlayerCards({ players, onSelect }: Props) {
  return (
    <div className="player-grid">
      {players.map(({ player, seasonStats }) => (
        <button className="player-card" key={player.id} onClick={() => onSelect(player.id)} aria-haspopup="dialog">
          <span className="player-card-heading">
            <span className="player-avatar" aria-hidden="true">{player.firstName.charAt(0)}{player.lastName.charAt(0)}</span>
            <span>
              <span className="player-name">{player.firstName} {player.lastName}</span>
              <span className="player-meta">{player.team.abbreviation || 'No team'} · {player.position || 'Position unavailable'}</span>
            </span>
          </span>
          <span className="card-stats">
            {([['PPG', seasonStats.ppg], ['RPG', seasonStats.rpg], ['APG', seasonStats.apg]] as const).map(([label, value]) => (
              <span key={label}><strong>{seasonStats.gamesPlayed > 0 ? value.toFixed(1) : '—'}</strong><span>{label}</span></span>
            ))}
          </span>
          <span className="card-footer">{seasonStats.gamesPlayed > 0 ? `${seasonStats.gamesPlayed} games played · View details →` : 'No stats available for this season'}</span>
        </button>
      ))}
    </div>
  );
}
