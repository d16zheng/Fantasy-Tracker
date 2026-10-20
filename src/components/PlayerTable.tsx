import type { PlayerSeasonSummary } from "../../shared/types/playerStats";
import { playerTableColumns, sortPlayerSummaries } from "./playerTableSort";
import type { SortColumn, TableSort } from "./playerTableSort";

type Props = {
  players: PlayerSeasonSummary[];
  seasonLabel: string;
  isUpdating?: boolean;
  sort: TableSort;
  onSort: (column: SortColumn) => void;
  onSelect: (playerId: string) => void;
};

const statsHeaders = playerTableColumns.slice(3);

function average(value: number, gamesPlayed: number) {
  return gamesPlayed > 0 ? value.toFixed(1) : "—";
}

function shootingAverage(made: number, attempted: number, gamesPlayed: number) {
  return gamesPlayed > 0 ? `${made.toFixed(1)} / ${attempted.toFixed(1)}` : "—";
}

export default function PlayerTable({
  players,
  seasonLabel,
  isUpdating = false,
  sort,
  onSort,
  onSelect,
}: Props) {
  const sortedPlayers = sortPlayerSummaries(players, sort);

  return (
    <div
      className="table-scroll player-table-scroll"
      role="region"
      aria-label={`${seasonLabel} player averages`}
      tabIndex={0}
      aria-busy={isUpdating}
    >
      <table className="player-table">
        <caption className="sr-only">
          {seasonLabel} regular-season player averages. Select a column heading to sort or a player
          for game logs and season totals.
        </caption>
        <thead>
          <tr>
            {playerTableColumns.map(({ key, label }, index) => {
              const active = sort.column === key;
              const nextDirection =
                active && sort.direction === "descending" ? "ascending" : "descending";
              return (
                <th
                  key={key}
                  scope="col"
                  className={index >= 3 ? "numeric" : undefined}
                  aria-sort={active ? sort.direction : undefined}
                >
                  <button
                    type="button"
                    className="player-table-sort"
                    disabled={isUpdating}
                    aria-label={`${label}: sort ${nextDirection}`}
                    onClick={() => onSort(key)}
                  >
                    {label}{" "}
                    <span aria-hidden="true">
                      {active ? (sort.direction === "ascending" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map(({ player, seasonStats, statsError }) => {
            const statValues = [
              average(seasonStats.minutespg, seasonStats.gamesPlayed),
              shootingAverage(seasonStats.fgmpg, seasonStats.fgapg, seasonStats.gamesPlayed),
              `${average(seasonStats.fgPercentage, seasonStats.gamesPlayed)}${seasonStats.gamesPlayed > 0 ? "%" : ""}`,
              shootingAverage(seasonStats.ftmpg, seasonStats.ftapg, seasonStats.gamesPlayed),
              `${average(seasonStats.ftPercentage, seasonStats.gamesPlayed)}${seasonStats.gamesPlayed > 0 ? "%" : ""}`,
              average(seasonStats.threepmpg, seasonStats.gamesPlayed),
              average(seasonStats.rpg, seasonStats.gamesPlayed),
              average(seasonStats.apg, seasonStats.gamesPlayed),
              average(seasonStats.spg, seasonStats.gamesPlayed),
              average(seasonStats.bpg, seasonStats.gamesPlayed),
              average(seasonStats.topg, seasonStats.gamesPlayed),
              average(seasonStats.ppg, seasonStats.gamesPlayed),
            ];

            return (
              <tr
                className="player-table-row"
                key={player.id}
                onClick={() => !isUpdating && onSelect(player.id)}
              >
                <th scope="row" title={statsError}>
                  <button
                    type="button"
                    className="player-table-name"
                    disabled={isUpdating}
                    aria-haspopup="dialog"
                  >
                    {player.firstName} {player.lastName}
                  </button>
                  {statsError && <span className="player-stats-error"> Stats unavailable</span>}
                </th>
                <td>{player.team.abbreviation || "—"}</td>
                <td>{player.position || "—"}</td>
                {statValues.map((value, index) => (
                  <td
                    key={statsHeaders[index].key}
                    className={`numeric${index === statValues.length - 1 ? " points" : ""}`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {isUpdating && (
        <div className="table-update" aria-hidden="true">
          Updating stats…
        </div>
      )}
    </div>
  );
}
