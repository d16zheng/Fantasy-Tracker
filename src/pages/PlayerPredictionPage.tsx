import { useEffect, useRef, useState } from "react";
import type { PlayerSeasonSummary } from "../../shared/types/playerStats";
import { formatSeason, getCurrentSeasonEndYear } from "../../shared/season";
import { getRosterStats } from "../api/statsApi";
import { getTeamScheduledGames } from "../api/matchupApi";
import type { League } from "../api/leagueApi";

const overviewKey = "sports-tracker:league-overview";
const currentSeason = getCurrentSeasonEndYear();
const seasons = Array.from({ length: 4 }, (_, index) => currentSeason - index);
const seasonStart = new Date(Date.UTC(2026, 9, 19));
const weekCount = 22;

function readLeague(): League | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(overviewKey) ?? "null") as {
      league?: League;
    } | null;
    return saved?.league && Array.isArray(saved.league.teams) ? saved.league : null;
  } catch {
    return null;
  }
}

function makeWeeks(seasonEndYear: number) {
  const firstMonday = new Date(
    seasonStart.getTime() - (currentSeason - seasonEndYear) * 364 * 24 * 60 * 60 * 1000,
  );
  return Array.from({ length: weekCount }, (_, index) => {
    const start = new Date(firstMonday.getTime() + index * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const format = (date: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date);
    return {
      number: index + 1,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      label: `Week ${index + 1}${index < 18 ? " · Regular season" : " · Playoffs"} · ${format(start)}–${format(end)}`,
    };
  });
}

function StatProjection({
  label,
  perGame,
  games,
  multiply = true,
  percent = false,
}: {
  label: string;
  perGame: number | null;
  games: number;
  multiply?: boolean;
  percent?: boolean;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{perGame == null ? "—" : `${perGame.toFixed(1)}${percent ? "%" : ""}`}</td>
      <td>
        {perGame == null
          ? "—"
          : `${(multiply ? perGame * games : perGame).toFixed(1)}${percent ? "%" : ""}`}
      </td>
    </tr>
  );
}

export default function PlayerPredictionPage() {
  const [league] = useState(readLeague);
  const [teamId, setTeamId] = useState(() => league?.teams[0]?.teamId ?? "");
  const [seasonEndYear, setSeasonEndYear] = useState(currentSeason);
  const [weekNumber, setWeekNumber] = useState(1);
  const [players, setPlayers] = useState<PlayerSeasonSummary[] | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [scheduledGames, setScheduledGames] = useState<number | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const scheduleRequest = useRef<AbortController | null>(null);
  const weeks = makeWeeks(seasonEndYear);
  const week = weeks[weekNumber - 1];
  const selectedTeam = league?.teams.find((team) => team.teamId === teamId);

  useEffect(
    () => () => {
      request.current?.abort();
      scheduleRequest.current?.abort();
    },
    [],
  );

  async function loadPlayers() {
    if (!league || !teamId) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const result = await getRosterStats(
        { leagueId: league.leagueId, teamId, seasonEndYear },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setPlayers(result);
      setPlayerId((current) =>
        result.some(({ player }) => player.id === current) ? current : (result[0]?.player.id ?? ""),
      );
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Could not load player stats.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const selected = players?.find(({ player }) => player.id === playerId);
  useEffect(() => {
    scheduleRequest.current?.abort();
    if (!selected) {
      setScheduledGames(null);
      setScheduleError("");
      setScheduleLoading(false);
      return;
    }
    const controller = new AbortController();
    scheduleRequest.current = controller;
    setScheduledGames(null);
    setScheduleError("");
    setScheduleLoading(true);
    void getTeamScheduledGames(
      week.startDate,
      week.endDate,
      selected.player.team.abbreviation,
      controller.signal,
    )
      .then(({ scheduledGames: count }) => {
        if (!controller.signal.aborted) setScheduledGames(count);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setScheduleError(
            cause instanceof Error ? cause.message : "Could not load the NBA schedule.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setScheduleLoading(false);
      });
    return () => controller.abort();
  }, [selected, week.endDate, week.startDate]);

  const gameCount = scheduledGames ?? 0;
  const stats = selected?.seasonStats;
  const seasonAvailable = Boolean(stats && stats.gamesPlayed > 0 && !selected?.statsError);
  const fgPercent =
    seasonAvailable && stats!.fgapg > 0 ? (stats!.fgmpg / stats!.fgapg) * 100 : null;
  const ftPercent =
    seasonAvailable && stats!.ftapg > 0 ? (stats!.ftmpg / stats!.ftapg) * 100 : null;

  return (
    <main className="container">
      <header className="page-header">
        <p className="eyebrow">
          Sports Tracker <span>/ NBA Fantasy</span>
        </p>
        <h1>Player predictions.</h1>
        <p>
          Project an individual player’s weekly stats from their season averages and expected games.
        </p>
      </header>
      <nav className="page-tabs" aria-label="League pages">
        <a href="/">League rosters</a>
        <a href="/compare">Compare teams</a>
        <a href="/predict" aria-current="page">
          Player predictions
        </a>
      </nav>
      {!league || league.teams.length === 0 ? (
        <section className="panel empty-state">
          <h2>Load a league first</h2>
          <p>Load your ESPN league to choose a roster and its players.</p>
          <a href="/">← League rosters</a>
        </section>
      ) : (
        <>
          <section className="panel">
            <h2>Choose a player and week</h2>
            <div className="comparison-controls prediction-controls">
              <label>
                Team
                <select
                  value={teamId}
                  disabled={loading}
                  onChange={(event) => {
                    setTeamId(event.target.value);
                    setPlayers(null);
                    setPlayerId("");
                  }}
                >
                  {league.teams.map((team) => (
                    <option key={team.teamId} value={team.teamId}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Stats season
                <select
                  value={seasonEndYear}
                  disabled={loading}
                  onChange={(event) => {
                    setSeasonEndYear(Number(event.target.value));
                    setPlayers(null);
                  }}
                >
                  {seasons.map((season) => (
                    <option key={season} value={season}>
                      {formatSeason(season)}
                      {season === currentSeason
                        ? " (current)"
                        : season === currentSeason - 1
                          ? " (previous)"
                          : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Week
                <select
                  value={weekNumber}
                  onChange={(event) => setWeekNumber(Number(event.target.value))}
                >
                  {weeks.map((entry) => (
                    <option key={entry.number} value={entry.number}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => void loadPlayers()} disabled={loading || !teamId}>
                {loading ? "Loading…" : players ? "Refresh player stats" : "Load players"}
              </button>
            </div>
            {players && (
              <div className="prediction-player-picker">
                <label>
                  Player
                  <select value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
                    {players.map(({ player }) => (
                      <option key={player.id} value={player.id}>
                        {player.firstName} {player.lastName}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="prediction-schedule-count" aria-live="polite">
                  <span>Scheduled games</span>
                  <strong>
                    {scheduleLoading ? "Loading…" : scheduledGames === null ? "—" : scheduledGames}
                  </strong>
                </div>
              </div>
            )}
            {scheduleError ? (
              <p className="error" role="alert">
                {scheduleError}
              </p>
            ) : (
              <p className="help">
                NBA schedule: {week.startDate} through {week.endDate}. Weekly stats use the player’s
                scheduled games and selected season averages.
              </p>
            )}
          </section>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {selected && (
            <section className="panel player-prediction-results">
              <div className="player-prediction-heading">
                <div>
                  <p className="eyebrow">
                    {selectedTeam?.name} · {formatSeason(seasonEndYear)}
                  </p>
                  <h2>
                    {selected.player.firstName} {selected.player.lastName}
                  </h2>
                  <p>
                    {selected.player.team.abbreviation} · {selected.player.position} ·{" "}
                    {stats?.gamesPlayed ?? 0} games in the stats sample
                  </p>
                </div>
                <div className="prediction-week-label">
                  <span>Projected games</span>
                  <strong>{gameCount}</strong>
                </div>
              </div>
              {selected.statsError && (
                <p className="error" role="alert">
                  {selected.statsError}
                </p>
              )}
              {!seasonAvailable ? (
                <p className="empty-state">
                  No season average data is available for this player and season yet.
                </p>
              ) : (
                <div className="table-scroll">
                  <table className="matchup-table player-prediction-table">
                    <thead>
                      <tr>
                        <th>Stat</th>
                        <th>Per-game average</th>
                        <th>Projected for week</th>
                      </tr>
                    </thead>
                    <tbody>
                      <StatProjection label="PTS" perGame={stats!.ppg} games={gameCount} />
                      <StatProjection label="REB" perGame={stats!.rpg} games={gameCount} />
                      <StatProjection label="AST" perGame={stats!.apg} games={gameCount} />
                      <StatProjection label="STL" perGame={stats!.spg} games={gameCount} />
                      <StatProjection label="BLK" perGame={stats!.bpg} games={gameCount} />
                      <StatProjection label="TO" perGame={stats!.topg} games={gameCount} />
                      <StatProjection label="3PM" perGame={stats!.threepmpg} games={gameCount} />
                      <StatProjection
                        label="FG%"
                        perGame={fgPercent}
                        games={gameCount}
                        multiply={false}
                        percent
                      />
                      <StatProjection
                        label="FT%"
                        perGame={ftPercent}
                        games={gameCount}
                        multiply={false}
                        percent
                      />
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
      <footer>Player statistics provided by ESPN.</footer>
    </main>
  );
}
