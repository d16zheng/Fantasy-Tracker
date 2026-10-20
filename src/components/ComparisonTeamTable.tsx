import type { PlayerSeasonSummary } from "../../shared/types/playerStats";
import type { LeagueTeam } from "../api/leagueApi";

type Props = {
  team: LeagueTeam;
  players: PlayerSeasonSummary[];
  onSelect: (playerId: string) => void;
};

export default function ComparisonTeamTable({ team, players, onSelect }: Props) {
  return (
    <section className="comparison-team panel">
      <header>
        <h2>{team.name}</h2>
        <p>
          {team.owner || `Team ${team.teamId}`} · {players.length} players
        </p>
      </header>
      <div className="table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>STL</th>
              <th>BLK</th>
              <th>FG%</th>
              <th>3PM</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 15 }, (_, index) => {
              const summary = players[index];
              if (!summary) {
                return (
                  <tr className="empty-comparison-slot" key={`empty-${index}`} aria-hidden="true">
                    <th>&nbsp;</th>
                    {Array.from({ length: 7 }, (_, cell) => (
                      <td key={cell}>&nbsp;</td>
                    ))}
                  </tr>
                );
              }

              const { player, seasonStats } = summary;
              const active = seasonStats.gamesPlayed > 0;
              const formatStat = (value: string) => {
                if (summary.statsError) return "Unavailable";
                return active ? value : "—";
              };

              return (
                <tr key={player.id} title={summary.statsError}>
                  <th scope="row">
                    <button className="comparison-player-link" onClick={() => onSelect(player.id)}>
                      {player.firstName} {player.lastName}
                    </button>
                  </th>
                  <td>{formatStat(seasonStats.ppg.toFixed(1))}</td>
                  <td>{formatStat(seasonStats.rpg.toFixed(1))}</td>
                  <td>{formatStat(seasonStats.apg.toFixed(1))}</td>
                  <td>{formatStat(seasonStats.spg.toFixed(1))}</td>
                  <td>{formatStat(seasonStats.bpg.toFixed(1))}</td>
                  <td>{formatStat(`${seasonStats.fgPercentage.toFixed(1)}%`)}</td>
                  <td>{formatStat(seasonStats.threepmpg.toFixed(1))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
