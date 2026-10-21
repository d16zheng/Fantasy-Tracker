import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerSeasonSummary } from "../../shared/types/playerStats";
import type {
  ComparisonResult,
  MatchupCategory,
  WeeklyProjectionResult,
} from "../../shared/types/matchup";
import { getCurrentSeasonEndYear, formatSeason } from "../../shared/season";
import { getRosterStats } from "../api/statsApi";
import { getTeamComparison, getWeeklyProjection } from "../api/matchupApi";
import type { League, LeagueTeam } from "../api/leagueApi";
import ComparisonTeamTable from "../components/ComparisonTeamTable";
import SelectedRosterComparison from "../components/SelectedRosterComparison";

const overviewKey = "sports-tracker:league-overview";
const currentSeason = getCurrentSeasonEndYear();
const seasons = Array.from({ length: 4 }, (_, index) => currentSeason - index);
const regularWeeks = 18;
const playoffWeeks = 4;
const seasonStart = new Date(Date.UTC(2026, 9, 19));
const labels: Record<MatchupCategory, string> = {
  fgPercentage: "FG%",
  ftPercentage: "FT%",
  threepm: "3PM",
  points: "PTS",
  rebounds: "REB",
  assists: "AST",
  steals: "STL",
  blocks: "BLK",
  to: "TO",
};

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

function PlayerAverages({
  team,
  players,
  onSelect,
}: {
  team: LeagueTeam;
  players: PlayerSeasonSummary[];
  onSelect: (playerId: string) => void;
}) {
  return <ComparisonTeamTable team={team} players={players} onSelect={onSelect} />;
}

type ComparisonMode = "base" | "weekly";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getComparisonWeeks(seasonEndYear: number) {
  const seasonOffset = (currentSeason - seasonEndYear) * 364 * 24 * 60 * 60 * 1000;
  const firstMonday = new Date(seasonStart.getTime() - seasonOffset);
  return Array.from({ length: regularWeeks + playoffWeeks }, (_, index) => {
    const start = new Date(firstMonday.getTime() + index * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return {
      number: index + 1,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      label: `Week ${index + 1}${index < regularWeeks ? " · Regular season" : " · Playoffs"} · ${formatDate(start)}–${formatDate(end)}`,
    };
  });
}

function MatchupSummary({
  result,
  weeklyProjection,
}: {
  result: ComparisonResult;
  weeklyProjection: WeeklyProjectionResult | null;
}) {
  const categories = Object.keys(labels) as MatchupCategory[];
  const firstWins = result.categories.filter(({ winner }) => winner === "win").length;
  const secondWins = result.categories.filter(({ winner }) => winner === "lose").length;
  const categoryResult = new Map(
    result.categories.map(({ category, winner }) => [category, winner]),
  );
  const value = (team: ComparisonResult["firstTeam"], category: MatchupCategory) => {
    const amount = team.totals[category];
    return amount == null
      ? "—"
      : category === "fgPercentage" || category === "ftPercentage"
        ? `${(amount * 100).toFixed(1)}%`
        : amount.toFixed(1);
  };
  return (
    <section className="panel matchup-results" aria-live="polite">
      <h2>
        {weeklyProjection
          ? `Projected weekly category score · ${weeklyProjection.startDate} to ${weeklyProjection.endDate}`
          : `Season projection category score · ${formatSeason(result.seasonEndYear)}`}
      </h2>
      <p className="matchup-scoreline">
        <strong>
          {result.firstTeam.name} {firstWins}
        </strong>
        <span>—</span>
        <strong>
          {secondWins} {result.secondTeam.name}
        </strong>
      </p>
      <div className="table-scroll">
        <table className="matchup-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>{result.firstTeam.name}</th>
              <th>Result</th>
              <th>{result.secondTeam.name}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const winner = categoryResult.get(category) ?? "tie";
              return (
                <tr key={category}>
                  <th scope="row">{labels[category]}</th>
                  <td className={winner === "win" ? "category-winner" : ""}>
                    {value(result.firstTeam, category)}
                  </td>
                  <td>{winner === "tie" ? "Tie" : winner === "win" ? "›" : "‹"}</td>
                  <td className={winner === "lose" ? "category-winner" : ""}>
                    {value(result.secondTeam, category)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {weeklyProjection && (
        <p className="help">Weekly totals use ESPN’s scheduled games for each player’s NBA team.</p>
      )}
      {(result.firstTeam.missingPlayerIds.length > 0 ||
        result.secondTeam.missingPlayerIds.length > 0) && (
        <p className="help">
          Unavailable player logs: {result.firstTeam.name} (
          {result.firstTeam.missingPlayerIds.length}), {result.secondTeam.name} (
          {result.secondTeam.missingPlayerIds.length}).
        </p>
      )}
    </section>
  );
}

export default function ComparisonPage() {
  const [league] = useState(readLeague);
  const [routeParams] = useState(() => new URLSearchParams(window.location.search));
  const [firstTeamId, setFirstTeamId] = useState(() => {
    const requested = routeParams.get("firstTeamId");
    return requested && league?.teams.some(({ teamId }) => teamId === requested)
      ? requested
      : (league?.teams[0]?.teamId ?? "");
  });
  const [secondTeamId, setSecondTeamId] = useState(() => {
    const requested = routeParams.get("secondTeamId");
    return requested &&
      requested !== routeParams.get("firstTeamId") &&
      league?.teams.some(({ teamId }) => teamId === requested)
      ? requested
      : (league?.teams[1]?.teamId ?? "");
  });
  const requestedSeason = Number(routeParams.get("seasonEndYear"));
  const [seasonEndYear, setSeasonEndYear] = useState(
    seasons.includes(requestedSeason) ? requestedSeason : currentSeason,
  );
  const [displayedSeasonEndYear, setDisplayedSeasonEndYear] = useState(
    seasons.includes(requestedSeason) ? requestedSeason : currentSeason,
  );
  const [firstPlayers, setFirstPlayers] = useState<PlayerSeasonSummary[] | null>(null);
  const [secondPlayers, setSecondPlayers] = useState<PlayerSeasonSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<ComparisonMode>("base");
  const [weekNumber, setWeekNumber] = useState(1);
  const [matchup, setMatchup] = useState<ComparisonResult | null>(null);
  const [weeklyProjection, setWeeklyProjection] = useState<WeeklyProjectionResult | null>(null);
  const [matchupLoading, setMatchupLoading] = useState(false);
  const [matchupError, setMatchupError] = useState("");
  const weeks = getComparisonWeeks(seasonEndYear);
  const selectedWeek = weeks[weekNumber - 1];
  const comparisonRequest = useRef<AbortController | null>(null);
  const matchupRequest = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      comparisonRequest.current?.abort();
      matchupRequest.current?.abort();
    },
    [],
  );

  const compare = useCallback(
    async (requestedSeasonEndYear = seasonEndYear) => {
      if (!league || !firstTeamId || !secondTeamId || firstTeamId === secondTeamId) return;
      comparisonRequest.current?.abort();
      const controller = new AbortController();
      comparisonRequest.current = controller;
      setLoading(true);
      setError("");
      try {
        const [first, second] = await Promise.all([
          getRosterStats(
            {
              leagueId: league.leagueId,
              teamId: firstTeamId,
              seasonEndYear: requestedSeasonEndYear,
            },
            controller.signal,
          ),
          getRosterStats(
            {
              leagueId: league.leagueId,
              teamId: secondTeamId,
              seasonEndYear: requestedSeasonEndYear,
            },
            controller.signal,
          ),
        ]);
        if (controller.signal.aborted) return;
        setFirstPlayers(first);
        setSecondPlayers(second);
        setDisplayedSeasonEndYear(requestedSeasonEndYear);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Could not load team statistics.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [firstTeamId, league, secondTeamId, seasonEndYear],
  );

  const autoComparePending = useRef(
    routeParams.has("firstTeamId") && routeParams.has("secondTeamId"),
  );
  useEffect(() => {
    if (!autoComparePending.current) return;
    autoComparePending.current = false;
    void compare();
  }, [compare]);

  async function loadMatchup() {
    if (!league || (mode === "weekly" && !selectedWeek)) return;
    matchupRequest.current?.abort();
    const controller = new AbortController();
    matchupRequest.current = controller;
    setMatchupLoading(true);
    setMatchupError("");
    try {
      const request = {
        leagueId: league.leagueId,
        firstTeamId,
        secondTeamId,
        seasonEndYear,
      };
      if (mode === "weekly") {
        const result = await getWeeklyProjection(
          { ...request, startDate: selectedWeek.startDate, endDate: selectedWeek.endDate },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setWeeklyProjection(result);
          setMatchup(result);
        }
      } else {
        const result = await getTeamComparison(request, controller.signal);
        if (!controller.signal.aborted) {
          setWeeklyProjection(null);
          setMatchup(result);
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setMatchupError(
          cause instanceof Error ? cause.message : "Could not load season comparison.",
        );
    } finally {
      if (!controller.signal.aborted) setMatchupLoading(false);
    }
  }

  const firstTeam = league?.teams.find(({ teamId }) => teamId === firstTeamId);
  const secondTeam = league?.teams.find(({ teamId }) => teamId === secondTeamId);
  function openPlayer(team: LeagueTeam, playerId: string) {
    const returnParams = new URLSearchParams({
      firstTeamId,
      secondTeamId,
      seasonEndYear: String(displayedSeasonEndYear),
    });
    const params = new URLSearchParams({
      name: team.name,
      owner: team.owner,
      playerId,
      seasonEndYear: String(displayedSeasonEndYear),
      returnTo: `/compare?${returnParams}`,
    });
    window.location.href = `/team/${encodeURIComponent(league?.leagueId ?? "")}/${team.teamId}?${params}`;
  }

  return (
    <main className="container">
      <header className="page-header">
        <p className="eyebrow">
          Sports Tracker <span>/ NBA Fantasy</span>
        </p>
        <h1>Compare teams.</h1>
        <p>
          Compare each roster’s {formatSeason(displayedSeasonEndYear)} season averages side by side.
        </p>
      </header>
      <nav className="page-tabs" aria-label="League pages">
        <a href="/">League rosters</a>
        <a href="/compare" aria-current="page">
          Compare teams
        </a>
        <a href="/predict">Player predictions</a>
      </nav>
      {!league || league.teams.length < 2 ? (
        <section className="panel empty-state">
          <h2>Load a league first</h2>
          <p>Open the league rosters page and load a league with at least two teams.</p>
          <a href="/">← League rosters</a>
        </section>
      ) : (
        <>
          <section className="panel" aria-labelledby="comparison-heading">
            <h2 id="comparison-heading">Choose two teams</h2>
            <div className="comparison-controls">
              <label>
                First team
                <select
                  value={firstTeamId}
                  disabled={loading || matchupLoading}
                  onChange={(event) => {
                    setFirstTeamId(event.target.value);
                    setFirstPlayers(null);
                    setSecondPlayers(null);
                    setMatchup(null);
                    setWeeklyProjection(null);
                  }}
                >
                  {league.teams.map((team) => (
                    <option
                      key={team.teamId}
                      value={team.teamId}
                      disabled={team.teamId === secondTeamId}
                    >
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="versus">vs</span>
              <label>
                Second team
                <select
                  value={secondTeamId}
                  disabled={loading || matchupLoading}
                  onChange={(event) => {
                    setSecondTeamId(event.target.value);
                    setFirstPlayers(null);
                    setSecondPlayers(null);
                    setMatchup(null);
                    setWeeklyProjection(null);
                  }}
                >
                  {league.teams.map((team) => (
                    <option
                      key={team.teamId}
                      value={team.teamId}
                      disabled={team.teamId === firstTeamId}
                    >
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => void compare()}
                disabled={loading || firstTeamId === secondTeamId}
              >
                {loading ? "Loading stats…" : "Compare rosters"}
              </button>
            </div>
            <p className="help">
              Player names open their detail page. Select a stats season before comparing.
            </p>
          </section>
          <section className="comparison-season-bar" aria-label="Comparison season">
            <p>
              Comparing <strong>{firstTeam?.name}</strong> and <strong>{secondTeam?.name}</strong>
            </p>
            <label>
              Stats season
              <select
                value={seasonEndYear}
                disabled={loading || matchupLoading}
                onChange={(event) => {
                  const selected = Number(event.target.value);
                  setSeasonEndYear(selected);
                  setMatchup(null);
                  setWeeklyProjection(null);
                  if (firstPlayers && secondPlayers) void compare(selected);
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
          </section>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {loading && !firstPlayers && (
            <div className="empty-state" role="status">
              <h3>Loading both rosters and season averages…</h3>
            </div>
          )}
          {firstPlayers && secondPlayers && firstTeam && secondTeam && (
            <>
              <div className="comparison-grid">
                <PlayerAverages
                  team={firstTeam}
                  players={firstPlayers}
                  onSelect={(id) => openPlayer(firstTeam, id)}
                />
                <PlayerAverages
                  team={secondTeam}
                  players={secondPlayers}
                  onSelect={(id) => openPlayer(secondTeam, id)}
                />
              </div>
              <SelectedRosterComparison
                firstTeam={firstTeam}
                secondTeam={secondTeam}
                firstPlayers={firstPlayers}
                secondPlayers={secondPlayers}
                seasonEndYear={displayedSeasonEndYear}
                mode={mode}
                week={selectedWeek}
                weeklyProjection={weeklyProjection}
              />
            </>
          )}
          <section className="panel matchup-controls-panel">
            <h2>Nine-category comparison</h2>
            <p className="help">
              Compare season averages or project weekly totals across one of the season’s 18 regular
              weeks or 4 playoff weeks. Weeks run Monday through Sunday.
            </p>
            <div className="comparison-controls">
              <label>
                Comparison type
                <select
                  value={mode}
                  disabled={matchupLoading}
                  onChange={(event) => {
                    setMode(event.target.value as ComparisonMode);
                    setMatchup(null);
                    setWeeklyProjection(null);
                  }}
                >
                  <option value="base">Base comparison (per-game averages)</option>
                  <option value="weekly">Projected weekly totals</option>
                </select>
              </label>
              {mode === "weekly" && (
                <label>
                  Week
                  <select
                    value={weekNumber}
                    disabled={matchupLoading}
                    onChange={(event) => {
                      setWeekNumber(Number(event.target.value));
                      setMatchup(null);
                      setWeeklyProjection(null);
                    }}
                  >
                    {weeks.map((week) => (
                      <option key={week.number} value={week.number}>
                        {week.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                onClick={() => void loadMatchup()}
                disabled={matchupLoading || firstTeamId === secondTeamId}
              >
                {matchupLoading
                  ? "Calculating…"
                  : mode === "weekly"
                    ? "Load schedule & project"
                    : "Calculate comparison"}
              </button>
              {mode === "weekly" && (
                <p className="help">
                  ESPN schedule games populate the roster GP fields; you can adjust any player’s
                  games or stats and the selected 13 totals update immediately.
                </p>
              )}
            </div>
          </section>
          {matchupError && (
            <p className="error" role="alert">
              {matchupError}
            </p>
          )}
          {matchup && <MatchupSummary result={matchup} weeklyProjection={weeklyProjection} />}
        </>
      )}
      <footer>Player statistics provided by ESPN.</footer>
    </main>
  );
}
