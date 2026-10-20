# Manual Weekly Fantasy Comparison: Development Guide

This guide is for building the head-to-head comparison feature incrementally by hand. It describes the current repository structure and a suggested implementation path. It does not assume ESPN matchup metadata or league settings are available. Start with the default nine categories and manually selected teams and week dates.

## Goal and first-version scope

For a selected pair of fantasy teams and a selected date range:

1. Load the players on both rosters through the existing fantasy league/roster paths.
2. Load each player's game log for the chosen NBA season.
3. Keep regular-season game performances dated within the selected week.
4. Sum team counting stats and shooting makes/attempts across the roster.
5. Calculate FG% and FT% from the summed makes and attempts.
6. Compare the category totals and show a winner or tie for each category.

Use these nine categories: FG%, FT%, 3PM, PTS, REB, AST, STL, BLK, TO. For turnovers, fewer is better. Team percentages must be calculated as total makes divided by total attempts; do not average player percentages. The selected week is a manual date range, not an ESPN matchup period.

The first version can return an individual team evaluation using the same team totals. Adding per-player category contribution detail can follow after team totals are correct.

## Existing shared types

### Fantasy teams and rosters

File: [`shared/types/fantasy.ts`](../shared/types/fantasy.ts)

- `EspnFantasyTeam` carries `leagueId`, `teamId`, and `seasonEndYear` for a requested ESPN team.
- `EspnRosterPlayer` is the app's roster-player shape. `espnPlayerId` is ESPN's player ID; the player stats flow maps it to an app player record ID.
- `FantasyLeagueTeam` contains `teamId`, `name`, `owner`, and `players`.
- `FantasyLeague` contains the league ID, roster season end year, and teams.

League team IDs are strings in the shared/API-facing type. Validate and convert them where a server function needs numeric ESPN IDs.

### Player and performance types

Files: [`shared/types/player.ts`](../shared/types/player.ts), [`shared/types/stats.ts`](../shared/types/stats.ts), [`shared/types/playerStats.ts`](../shared/types/playerStats.ts)

- `TrackedPlayer` has the app `id`, external `espnId`, name, position, and NBA team.
- `GameStats` is the base box-score shape. It already has the needed values: `fgm`, `fga`, `ftm`, `fta`, `threepm`, `threepa`, `rebounds`, `assists`, `steals`, `blocks`, `to`, and `points` (plus `minutes`).
- `GamePerformance` extends `GameStats` with app/player/event IDs, `seasonEndYear`, `phase`, ISO date, player team, opponent, and home/away status.
- `SeasonStats` contains per-game season averages and season FG%/FT%. Those averages are useful for the existing display but should not be used to compute a weekly head-to-head total.
- `PlayerSeasonSummary` groups a `TrackedPlayer`, its season averages, and its full `gameLog`; it may also include `statsError`.

### Season helpers

File: [`shared/season.ts`](../shared/season.ts)

- `getCurrentSeasonEndYear()` determines which ESPN roster season to load.
- `formatSeason()` formats a season label for UI.

Keep roster-season selection separate from the stats season chosen by the user; the existing stats endpoint already does this.

## Existing server functions and data flow

### ESPN roster import

Files: [`server/integrations/espn/client.ts`](../server/integrations/espn/client.ts), `server/integrations/espn/types.ts`, `server/integrations/espn/mapper.ts`, [`server/services/fantasyLeagueService.ts`](../server/services/fantasyLeagueService.ts), `server/services/fantasyRosterService.ts`

- `fetchEspnLeague(leagueId, seasonEndYear)` requests league teams and rosters using the server's ESPN cookie authentication.
- `fetchEspnRoster(fantasyTeam)` requests one roster.
- `mapEspnPlayer(...)` converts an ESPN player into the application roster-player type.
- `getFantasyLeague(leagueId)` fetches and locally upserts league teams/rosters, then returns a `FantasyLeague`.
- `getFantasyRoster(fantasyTeam)` selects/maps the requested team's roster from ESPN data.

For the first matchup implementation, reuse the league's current team/player IDs. Do not create a separate roster import system. Be aware that `getFantasyLeague()` refreshes and persists rosters, whereas the matchup request should avoid re-importing the entire league for every individual game-log lookup if a usable roster is already available.

### Game logs and stat aggregation

Files: [`server/services/gameLogService.ts`](../server/services/gameLogService.ts), `server/integrations/espn/gameLogClient.ts`, `server/integrations/espn/gameLogTypes.ts`, `server/integrations/espn/gameLogMapper.ts`, [`server/repositories/gameLogRepository.ts`](../server/repositories/gameLogRepository.ts), [`server/services/playerStatsService.ts`](../server/services/playerStatsService.ts), [`server/services/seasonStatsService.ts`](../server/services/seasonStatsService.ts)

- `fetchEspnGameLog(espnPlayerId, seasonEndYear)` retrieves the raw ESPN player log.
- `mapEspnGameLog(response, playerId, seasonEndYear)` converts it to sorted `GamePerformance[]`, with NBA regular-season and postseason phase labels and dates.
- `getPlayerGameLog(playerId, espnPlayerId, seasonEndYear)` uses cached game logs when available, fetches/maps/saves stale or missing logs, and can fall back to existing cached games if ESPN is unavailable.
- `findGameLog(playerId, seasonEndYear)` reads saved performances.
- `getRosterPlayerStats(fantasyTeam, seasonEndYear)` retrieves a roster, ensures tracked-player records exist, and returns summaries including full `gameLog` data and season averages. This is a natural building block for an initial service, though it currently handles one team per call.
- `calculateSeasonStats(...)` computes season averages from a game-log list. It is not a weekly team-total calculator; a matchup service should implement weekly sum aggregation over `GamePerformance[]`.

The game log mapper already rejects incomplete stat/date metadata and filters non-NBA teams. Its `date` is an ISO timestamp; define week-boundary semantics deliberately (for example, inclusive start and exclusive end in a chosen timezone) before filtering.

### Existing routes

Files: [`server/routes/fantasy.ts`](../server/routes/fantasy.ts), [`server/routes/stats.ts`](../server/routes/stats.ts), [`server/index.ts`](../server/index.ts)

- `GET /api/fantasy/league?leagueId=...` returns a league and all current rosters.
- `GET /api/fantasy/roster?...` returns a selected ESPN roster.
- `GET /api/stats/roster?leagueId=...&teamId=...&seasonEndYear=...` returns `PlayerSeasonSummary[]` for one fantasy team, including each player's game log.
- `GET /api/stats/gamelog?...` returns one player's game log.
- `server/index.ts` mounts the fantasy and stats routers under `/api/fantasy` and `/api/stats`.

The stats route currently validates the supplied IDs and season, but passes the current season end year for roster selection and the requested year for player stats. A new matchup route should use similarly explicit validation and return a clear 400 for malformed date ranges or team IDs.

## Existing frontend

Files: [`src/pages/LeaguePage.tsx`](../src/pages/LeaguePage.tsx), [`src/pages/ComparisonPage.tsx`](../src/pages/ComparisonPage.tsx), [`src/pages/RosterPage.tsx`](../src/pages/RosterPage.tsx), [`src/api/leagueApi.ts`](../src/api/leagueApi.ts), [`src/api/statsApi.ts`](../src/api/statsApi.ts), [`src/components/ComparisonTeamTable.tsx`](../src/components/ComparisonTeamTable.tsx)

- `LeaguePage` loads a league and stores the overview in `sessionStorage` under `sports-tracker:league-overview`.
- `ComparisonPage` reads that saved league, offers two team selectors and a season selector, and currently makes two `/api/stats/roster` requests.
- It displays the two rosters' individual season averages using `ComparisonTeamTable`; it does not currently calculate or display weekly category standings.
- `getLeague()` and `getRosterStats()` are the existing browser API helpers.
- App routing is simple path dispatch in `src/App.tsx`; `/compare` already renders `ComparisonPage`.

The current comparison page is the natural place to add week inputs and matchup results. Preserve the existing roster table as supporting roster detail or move it behind a separate section; the nine-category team score should be its own clear summary.

## Suggested implementation order

Do each step manually and review it before proceeding.

1. **Define the shared response contract** in a new `shared/types/matchup.ts`. Include league ID, two team IDs/names, chosen start and end dates, team category totals, and a per-category outcome (`first`, `second`, or `tie`). Represent percentage categories with makes and attempts as well as the computed percentage so the result is auditable. Keep this app contract independent from ESPN response types.
2. **Implement the pure aggregation logic** in `server/services/matchupService.ts` (or a small adjacent helper). Given a collection of `GamePerformance[]` and date bounds, sum the fields in `GameStats`; compute FG% and FT% from aggregate makes/attempts; compare 3PM, PTS, REB, AST, STL, and BLK high-to-low and TO low-to-high. Handle zero attempts and ties consistently.
3. **Connect rosters to logs.** Reuse the existing league team/player IDs and `getPlayerGameLog()`/`getRosterPlayerStats()` path. Select the requested teams, get each roster player's performances for the requested stats season, and aggregate the selected week. Consider request volume: the existing player stats service limits parallel work to four players; follow a bounded-concurrency approach rather than launching a full league's requests at once.
4. **Add the API route** in `server/routes/matchup.ts`. A manual-first query can accept `leagueId`, `firstTeamId`, `secondTeamId`, `seasonEndYear`, `startDate`, and `endDate`. Validate numeric identifiers, season, valid dates, ordering, and distinct teams. Return the shared matchup shape.
5. **Register the route** in `server/index.ts` under `/api/matchup`.
6. **Add `src/api/matchupApi.ts`** to call the new endpoint and type its response using `shared/types/matchup.ts`.
7. **Update `ComparisonPage.tsx`** with manual start/end date controls, loading/error state for the matchup request, and a nine-row category score table. Keep team selection linked to the already loaded league overview.
8. **Add single-team evaluation** after the two-team result is stable. Reuse the same aggregation function and show the selected team's totals and optional per-player contributions; this should not require an opponent.
9. **Verify behavior with a few known game-log/date examples** when you choose to add tests or manually inspect the result: date boundary inclusion, a player with multiple games in a week, FG%/FT% from aggregate attempts, zero attempts, ties, and turnovers favoring the smaller number.

## Decisions to make before implementation

- Are week bounds entered as calendar dates, and in which timezone should NBA game dates be grouped?
- Is the end date inclusive in the UI? A clean API convention is inclusive start and exclusive end, with the UI converting its inclusive calendar end to the following day.
- Should incomplete/missing player logs count as zero, be marked unavailable, or prevent a definitive category result? Expose missing data so zero is not mistaken for a true zero.
- Should a category with zero total attempts be a tie/undefined, or follow another explicit league rule?
- Should the first UI show team category totals only, or also list the contributing games/players?

## Out of scope for the manual-first version

- ESPN `mSettings` settings retrieval and league-rule mapper.
- ESPN `mMatchupScore` schedule/opponent retrieval.
- Automatic matchup period/date detection.
- Automatic category discovery or non-nine-category formats.

Those can be added later behind the same application-owned types and service boundary if manual weekly comparison proves useful.
