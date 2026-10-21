import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LeagueTeam } from "../api/leagueApi";
import type { PlayerSeasonSummary } from "../../shared/types/playerStats";
import { formatSeason } from "../../shared/season";
import type {
  CategoryComparison,
  ComparisonResult,
  MatchupCategory,
  MatchupTeamResult,
  SummedStatKey,
  TeamCategoryTotals,
  WeeklyProjectionResult,
} from "../../shared/types/matchup";

const SLOT_COUNT = 13;
const editableStats: SummedStatKey[] = [
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "to",
  "fgm",
  "fga",
  "ftm",
  "fta",
  "threepm",
];
const categoryKeys: MatchupCategory[] = [
  "fgPercentage",
  "ftPercentage",
  "threepm",
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "to",
];
const categoryLabels: Record<MatchupCategory, string> = {
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
type Mode = "base" | "weekly";
type PlayerOverride = Partial<Record<SummedStatKey, string>> & { games?: string };
type Overrides = Record<string, PlayerOverride>;
type WeekRange = { startDate: string; endDate: string };

function initialSelection(players: PlayerSeasonSummary[]): string[] {
  return players.slice(0, SLOT_COUNT).map(({ player }) => player.id);
}

function normalizedSelection(current: string[], players: PlayerSeasonSummary[]): string[] {
  const available = new Set(players.map(({ player }) => player.id));
  const retained = [...new Set(current.filter((id) => available.has(id)))].slice(0, SLOT_COUNT);
  const filled = [
    ...retained,
    ...players.map(({ player }) => player.id).filter((id) => !retained.includes(id)),
  ].slice(0, SLOT_COUNT);
  return filled;
}

function roundValue(value: number): string {
  return value.toFixed(1);
}

function makeBaseline(summary: PlayerSeasonSummary): Record<SummedStatKey, string> {
  const blank = Object.fromEntries(editableStats.map((stat) => [stat, ""])) as Record<
    SummedStatKey,
    string
  >;
  if (summary.statsError) return blank;

  const { seasonStats } = summary;
  if (seasonStats.gamesPlayed === 0) return blank;
  return {
    points: roundValue(seasonStats.ppg),
    rebounds: roundValue(seasonStats.rpg),
    assists: roundValue(seasonStats.apg),
    steals: roundValue(seasonStats.spg),
    blocks: roundValue(seasonStats.bpg),
    to: roundValue(seasonStats.topg),
    fgm: roundValue(seasonStats.fgmpg),
    fga: roundValue(seasonStats.fgapg),
    ftm: roundValue(seasonStats.ftmpg),
    fta: roundValue(seasonStats.ftapg),
    threepm: roundValue(seasonStats.threepmpg),
  };
}

function playerValues(
  summary: PlayerSeasonSummary,
  override: PlayerOverride | undefined,
): Record<SummedStatKey, string> {
  return { ...makeBaseline(summary), ...override };
}

function totalsForPlayers(
  summaries: PlayerSeasonSummary[],
  selectedIds: string[],
  mode: Mode,
  overrides: Overrides,
  overrideKey: (playerId: string) => string,
  scheduledGames: Map<string, number>,
): { totals: TeamCategoryTotals; missingPlayerIds: string[] } {
  const totals: TeamCategoryTotals = {
    fgm: 0,
    fga: 0,
    fgPercentage: null,
    ftm: 0,
    fta: 0,
    ftPercentage: null,
    threepm: 0,
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    to: 0,
  };
  const byId = new Map(summaries.map((summary) => [summary.player.id, summary]));
  const missingPlayerIds: string[] = [];

  for (const playerId of selectedIds.filter(Boolean)) {
    const summary = byId.get(playerId);
    if (!summary) {
      missingPlayerIds.push(playerId);
      continue;
    }
    if (summary.statsError) missingPlayerIds.push(playerId);
    const values = playerValues(summary, overrides[overrideKey(playerId)]);
    const games =
      mode === "weekly"
        ? Math.max(
            0,
            Number(overrides[overrideKey(playerId)]?.games ?? scheduledGames.get(playerId)) || 0,
          )
        : 1;
    for (const stat of editableStats) {
      totals[stat] += (Number(values[stat]) || 0) * games;
    }
  }

  totals.fgPercentage = totals.fga > 0 ? totals.fgm / totals.fga : null;
  totals.ftPercentage = totals.fta > 0 ? totals.ftm / totals.fta : null;
  return { totals, missingPlayerIds };
}

function compareTotals(
  first: TeamCategoryTotals,
  second: TeamCategoryTotals,
): CategoryComparison[] {
  return categoryKeys.map((category) => {
    const a = first[category];
    const b = second[category];
    if (a == null || b == null || a === b) return { category, winner: "tie" };
    const firstWins = category === "to" ? a < b : a > b;
    return { category, winner: firstWins ? "win" : "lose" };
  });
}

function TeamRosterEditor({
  team,
  players,
  selectedIds,
  onToggle,
  rowCount,
  mode,
  overrides,
  setOverrides,
  overrideKey,
  scheduledGames,
}: {
  team: LeagueTeam;
  players: PlayerSeasonSummary[];
  selectedIds: string[];
  onToggle: (playerId: string, checked: boolean) => void;
  rowCount: number;
  mode: Mode;
  overrides: Overrides;
  setOverrides: Dispatch<SetStateAction<Overrides>>;
  overrideKey: (playerId: string) => string;
  scheduledGames: Map<string, number>;
}) {
  const selected = new Set(selectedIds.filter(Boolean));
  return (
    <section className="panel selected-roster-panel">
      <header>
        <h3>{team.name} · selected players</h3>
        <p>
          {selected.size} of {SLOT_COUNT} selected · edit any stat; blank fields count as zero
        </p>
      </header>
      <div className="table-scroll">
        <table className="selected-roster-table">
          <thead>
            <tr>
              <th>Player</th>
              {mode === "weekly" && <th>GP</th>}
              {editableStats.map((stat) => (
                <th key={stat}>{stat.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, index) => {
              const summary = players[index];
              if (!summary) {
                return (
                  <tr key={`${team.teamId}-empty-${index}`} aria-hidden="true">
                    <th>&nbsp;</th>
                    {editableStats.map((stat) => (
                      <td key={stat}>&nbsp;</td>
                    ))}
                  </tr>
                );
              }
              const playerId = summary.player.id;
              const key = overrideKey(playerId);
              const values = playerValues(summary, overrides[key]);
              const defaultGames = scheduledGames.get(playerId);
              const isSelected = selected.has(playerId);
              const canSelect = selected.size < SLOT_COUNT || isSelected;
              return (
                <tr key={playerId} className={isSelected ? "selected-roster-row" : ""}>
                  <th scope="row">
                    <label className="selected-player-toggle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!canSelect}
                        onChange={(event) => onToggle(playerId, event.target.checked)}
                        aria-label={`Include ${summary.player.firstName} ${summary.player.lastName} in comparison`}
                      />
                      <span>
                        {summary.player.firstName} {summary.player.lastName}
                      </span>
                    </label>
                  </th>
                  {mode === "weekly" && (
                    <td>
                      <input
                        aria-label={`${summary.player.firstName} games this week`}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={
                          overrides[key]?.games ??
                          (defaultGames === undefined ? "" : String(defaultGames))
                        }
                        disabled={!isSelected}
                        onChange={(event) => {
                          setOverrides((current) => ({
                            ...current,
                            [key]: { ...current[key], games: event.target.value },
                          }));
                        }}
                        onBlur={(event) => {
                          const entered = event.currentTarget.value;
                          if (entered === "" || !Number.isFinite(Number(entered))) return;
                          setOverrides((current) => ({
                            ...current,
                            [key]: {
                              ...current[key],
                              games: String(Math.max(0, Math.round(Number(entered)))),
                            },
                          }));
                        }}
                      />
                    </td>
                  )}
                  {editableStats.map((stat) => (
                    <td key={stat}>
                      <input
                        aria-label={`${summary?.player.firstName ?? "Empty slot"} ${stat}`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={values?.[stat] ?? ""}
                        disabled={!isSelected}
                        onChange={(event) => {
                          const entryKey = overrideKey(playerId);
                          setOverrides((current) => ({
                            ...current,
                            [entryKey]: { ...current[entryKey], [stat]: event.target.value },
                          }));
                        }}
                        onBlur={(event) => {
                          const entered = event.currentTarget.value;
                          if (entered === "" || !Number.isFinite(Number(entered))) return;
                          const entryKey = overrideKey(playerId);
                          setOverrides((current) => ({
                            ...current,
                            [entryKey]: {
                              ...current[entryKey],
                              [stat]: roundValue(Number(entered)),
                            },
                          }));
                        }}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SelectedRosterComparison({
  firstTeam,
  secondTeam,
  firstPlayers,
  secondPlayers,
  seasonEndYear,
  mode,
  week,
  weeklyProjection,
}: {
  firstTeam: LeagueTeam;
  secondTeam: LeagueTeam;
  firstPlayers: PlayerSeasonSummary[];
  secondPlayers: PlayerSeasonSummary[];
  seasonEndYear: number;
  mode: Mode;
  week: WeekRange;
  weeklyProjection: WeeklyProjectionResult | null;
}) {
  const [firstSelection, setFirstSelection] = useState<string[]>(() =>
    initialSelection(firstPlayers),
  );
  const [secondSelection, setSecondSelection] = useState<string[]>(() =>
    initialSelection(secondPlayers),
  );
  const [overrides, setOverrides] = useState<Overrides>({});
  useEffect(() => {
    setFirstSelection((current) => {
      if (current.length === 0) return initialSelection(firstPlayers);
      return normalizedSelection(current, firstPlayers);
    });
  }, [firstPlayers]);
  useEffect(() => {
    setSecondSelection((current) => {
      if (current.length === 0) return initialSelection(secondPlayers);
      return normalizedSelection(current, secondPlayers);
    });
  }, [secondPlayers]);

  const overrideKey = useCallback(
    (playerId: string) =>
      `${seasonEndYear}:${mode}:${mode === "weekly" ? week.startDate : "season"}:${playerId}`,
    [mode, seasonEndYear, week.startDate],
  );
  const scheduledGames = useMemo(() => {
    const byPlayer = new Map<string, number>();
    for (const player of [
      ...(weeklyProjection?.firstTeam.players ?? []),
      ...(weeklyProjection?.secondTeam.players ?? []),
    ]) {
      byPlayer.set(player.playerId, player.scheduledGames);
    }
    return byPlayer;
  }, [weeklyProjection]);
  const comparison = useMemo<ComparisonResult>(() => {
    const first = totalsForPlayers(
      firstPlayers,
      firstSelection,
      mode,
      overrides,
      overrideKey,
      scheduledGames,
    );
    const second = totalsForPlayers(
      secondPlayers,
      secondSelection,
      mode,
      overrides,
      overrideKey,
      scheduledGames,
    );
    const firstTeamResult: MatchupTeamResult = {
      teamId: String(firstTeam.teamId),
      name: firstTeam.name,
      totals: first.totals,
      missingPlayerIds: first.missingPlayerIds,
    };
    const secondTeamResult: MatchupTeamResult = {
      teamId: String(secondTeam.teamId),
      name: secondTeam.name,
      totals: second.totals,
      missingPlayerIds: second.missingPlayerIds,
    };
    return {
      firstTeam: firstTeamResult,
      secondTeam: secondTeamResult,
      seasonEndYear,
      categories: compareTotals(first.totals, second.totals),
    };
  }, [
    firstPlayers,
    firstSelection,
    mode,
    overrides,
    secondPlayers,
    secondSelection,
    seasonEndYear,
    firstTeam,
    secondTeam,
    overrideKey,
    scheduledGames,
  ]);

  function updateSelection(
    setter: Dispatch<SetStateAction<string[]>>,
    playerId: string,
    checked: boolean,
  ) {
    setter((values) => {
      if (checked) return values.length >= SLOT_COUNT ? values : [...values, playerId];
      return values.filter((id) => id !== playerId);
    });
  }

  const rowCount = Math.max(firstPlayers.length, secondPlayers.length);

  return (
    <section className="selected-roster-comparison">
      <header className="selected-roster-heading">
        <h2>Selected 13 · live comparison</h2>
        <p>
          Choose up to 13 players per team. Change any value and the category score updates
          immediately. In projected weekly mode, scheduled games load automatically and can be
          edited. Per-game stats are multiplied by GP, and FG% and FT% use makes and attempts.
        </p>
      </header>
      <div className="selected-roster-grid">
        <TeamRosterEditor
          team={firstTeam}
          players={firstPlayers}
          selectedIds={firstSelection}
          onToggle={(id, checked) => updateSelection(setFirstSelection, id, checked)}
          rowCount={rowCount}
          mode={mode}
          overrides={overrides}
          setOverrides={setOverrides}
          overrideKey={overrideKey}
          scheduledGames={scheduledGames}
        />
        <TeamRosterEditor
          team={secondTeam}
          players={secondPlayers}
          selectedIds={secondSelection}
          onToggle={(id, checked) => updateSelection(setSecondSelection, id, checked)}
          rowCount={rowCount}
          mode={mode}
          overrides={overrides}
          setOverrides={setOverrides}
          overrideKey={overrideKey}
          scheduledGames={scheduledGames}
        />
      </div>
      <SelectedCategorySummary result={comparison} mode={mode} week={week} />
    </section>
  );
}

function SelectedCategorySummary({
  result,
  mode,
  week,
}: {
  result: ComparisonResult;
  mode: Mode;
  week: WeekRange;
}) {
  const firstWins = result.categories.filter(({ winner }) => winner === "win").length;
  const secondWins = result.categories.filter(({ winner }) => winner === "lose").length;
  return (
    <section className="panel matchup-results selected-category-summary" aria-live="polite">
      <h3>
        {mode === "weekly"
          ? `Projected weekly totals · ${formatSeason(result.seasonEndYear)} · ${week.startDate} to ${week.endDate}`
          : `Selected 13 · ${formatSeason(result.seasonEndYear)} season projection`}
      </h3>
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
            {result.categories.map(({ category, winner }) => (
              <tr key={category}>
                <th scope="row">{categoryLabels[category]}</th>
                <td className={winner === "win" ? "category-winner" : ""}>
                  {formatTotal(category, result.firstTeam.totals[category])}
                </td>
                <td>{winner === "tie" ? "Tie" : winner === "win" ? "›" : "‹"}</td>
                <td className={winner === "lose" ? "category-winner" : ""}>
                  {formatTotal(category, result.secondTeam.totals[category])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(result.firstTeam.missingPlayerIds.length > 0 ||
        result.secondTeam.missingPlayerIds.length > 0) && (
        <p className="help">Unavailable stats are blank and count as zero until entered.</p>
      )}
    </section>
  );
}

function formatTotal(category: MatchupCategory, value: number | null): string {
  if (value === null) return "—";
  return category === "fgPercentage" || category === "ftPercentage"
    ? `${(value * 100).toFixed(1)}%`
    : value.toFixed(1);
}
