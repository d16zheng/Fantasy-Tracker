import type { LeagueTeam } from "../api/leagueApi";

type Props = {
  team: LeagueTeam;
  saving: boolean;
  ownerError?: string;
  onOpen: (playerId?: string) => void;
  onOwnerChange: (owner: string) => void;
  onOwnerSave: (owner: string) => void;
};

export default function LeagueTeamCard({
  team,
  saving,
  ownerError,
  onOpen,
  onOwnerChange,
  onOwnerSave,
}: Props) {
  const rosterSlots = Array.from({ length: 15 }, (_, index) => team.players[index]);

  return (
    <article className="panel team-card">
      {/* Team information */}
      <button
        className="team-card-open"
        onClick={() => onOpen()}
        aria-label={`Open ${team.name} roster`}
      >
        <span className="team-name">{team.name}</span>
        <span className="team-count">
          {team.players.length} players · Team {team.teamId}
        </span>
      </button>

      {/* Owner input */}
      <label className="owner-field">
        Owner
        <input
          aria-label={`${team.name} owner`}
          aria-invalid={Boolean(ownerError)}
          aria-describedby={ownerError ? `owner-error-${team.teamId}` : undefined}
          placeholder="Add owner name"
          value={team.owner}
          disabled={saving}
          onChange={(event) => onOwnerChange(event.target.value)}
          onBlur={(event) => onOwnerSave(event.target.value)}
        />
      </label>

      {saving && (
        <span className="owner-saving" role="status">
          Saving…
        </span>
      )}
      {ownerError && (
        <span className="owner-save-error" id={`owner-error-${team.teamId}`} role="alert">
          {ownerError}
        </span>
      )}

      {/* Player roster */}
      <ul className="compact-roster" aria-label={`${team.name} roster`}>
        {rosterSlots.map((player, index) =>
          player ? (
            <li key={player.espnPlayerId}>
              <button
                className="compact-player-link"
                onClick={() => onOpen(`espn:${player.espnPlayerId}`)}
              >
                {player.firstName} {player.lastName}
              </button>
              <small>{player.position ?? "—"}</small>
            </li>
          ) : (
            <li key={`empty-${index}`} className="empty-roster-slot" aria-hidden="true">
              <span>&nbsp;</span>
              <small>&nbsp;</small>
            </li>
          ),
        )}
      </ul>

      <button className="team-card-link" onClick={() => onOpen()}>
        View stats and details →
      </button>
    </article>
  );
}
