# ESPN Stats, Analytics, and Modeling Roadmap

Implement one milestone at a time. ESPN is the selected initial stats source. Build reliable historical game data first; analytics and regression models consume that normalized data later.

## Current project state

- ESPN Fantasy roster retrieval works through `server/integrations/espn/`, `fantasyRosterService.ts`, and `server/routes/fantasy.ts`.
- `GET /roster` and `POST /import` both return `EspnRosterPlayer[]`. Import currently fetches the roster only; it does not create tracked players, retrieve statistics, or persist data.
- Shared `TrackedPlayer`, `Team`, `GamePerformance`, and `SeasonStats` types already exist.
- There is no server entrypoint, database, game-log integration, analytics layer, or model yet.

## What was removed and what needs replacing

The BALLDONTLIE scaffold was deliberately removed because it was no longer the selected stats source. The removed code was:

| Removed item | Former responsibility | Replacement needed |
| --- | --- | --- |
| `server/integrations/balldontlie/client.ts` | Search BALLDONTLIE players by name | None for normal ESPN roster players: `espnPlayerId` is already the verified game-log ID |
| `server/integrations/balldontlie/mapper.ts` | Convert a BALLDONTLIE team to application `Team` | Canonical NBA team catalog and ESPN-to-catalog lookup |
| `server/integrations/balldontlie/types.ts` | Raw provider player/team/stat shapes | ESPN game-log raw types |
| `server/integrations/balldontlie/stats.ts` | Unfinished stats request scaffold | ESPN game-log client |
| `server/services/playerMatchingService.ts` | Build transient `TrackedPlayer` values from roster-plus-search results | ESPN tracked-player resolver/service |
| `TrackedPlayer.bdlId` | BALLDONTLIE source identity | No direct replacement; preserve `espnId` as the source identity |
| `PlayerMatchResult` | `{ matched, unmatched }` response contract | A replacement import result when player creation is restored |
| `BALLDONTLIE_API_KEY` | Provider credential | No ESPN key is required for the tested game-log request |

The old `POST /import` route was intended to fetch the ESPN roster, search BALLDONTLIE for each player, and return `{ matched, unmatched }`. It was not a completed, verified import pipeline: its BALLDONTLIE client had an undefined base URL, there was no persistence, and game-stat retrieval was unfinished. The current route intentionally returns the roster directly instead.

### Exact holes to restore the old import behavior with ESPN

These pieces restore the useful behavior that the old scaffold was aiming for, without reintroducing a second-provider ID matching problem:

| File | Add or change | Result |
| --- | --- | --- |
| `server/data/nbaTeams.ts` | **Add.** Export canonical `Team` records and lookup by ESPN team ID and abbreviation. | Roster players can receive a complete application `Team`. |
| `server/services/trackedPlayerService.ts` | **Add.** Convert `EspnRosterPlayer` to `TrackedPlayer`, using a stable provisional ID such as `espn:<espnPlayerId>` until the database owns IDs. Return unresolved players when team lookup fails. | Replaces name search with deterministic ESPN-ID resolution. |
| `shared/types/fantasy.ts` | **Add.** Restore a result type, preferably named `RosterImportResult`, with `tracked: TrackedPlayer[]` and `unresolved: EspnRosterPlayer[]`. | Replaces the removed `PlayerMatchResult` without BALLDONTLIE terminology. |
| `server/routes/fantasy.ts` | **Change.** Make `POST /import` call `getFantasyRoster()` then the tracked-player service, and return `RosterImportResult`. Keep `GET /roster` unchanged. | Restores an import response containing application-ready tracked players. |

At that point, the feature equivalence is:

```text
Old intended path:
ESPN roster → name/team search in BALLDONTLIE → transient matched players

ESPN replacement path:
ESPN roster → canonical team lookup → transient tracked players
```

For ordinary NBA roster players, `unresolved` should normally be empty because the ESPN player ID works directly with the verified ESPN game-log endpoint. An unresolved player indicates bad or missing roster/team data, not a failed external name search.

The following holes are **not** needed merely to restore that old route behavior, but are required for the actual product goal:

- `gameLogTypes.ts`, `gameLogClient.ts`, and `gameLogMapper.ts` for actual statistics;
- repositories and a database for stable IDs and repeatable imports;
- `gamePerformanceService.ts` for loading and storing game history;
- analytics, feature building, and the offline modeling pipeline.

Run these checks after each implementation milestone:

```bash
npx tsc -p server/tsconfig.json --noEmit
npm run typecheck
npm run lint
npm run build
```

## Verified ESPN game-log source

The following endpoint was tested successfully for Nikola Jokic (`3112335`) and returned JSON without Fantasy cookies or an API key:

```text
https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/3112335/gamelog?season=2025
```

In this endpoint, `season=2025` means the **2024–25** season. Name the future client parameter `seasonEndYear` so that is clear in code.

The response provides:

- `names`: stat-field names.
- `events`: game metadata by ESPN event ID, including date, home team, away team, player team, and opponent.
- `seasonTypes`: regular-season, postseason, and preseason sections containing game rows.

Each game row has an `eventId` and a `stats` array. Pair `names[]` with `stats[]`; do not rely on unexplained array indexes. Relevant mappings are:

| ESPN field | Application field(s) |
| --- | --- |
| `minutes` | `minutes` |
| `fieldGoalsMade-fieldGoalsAttempted` | `fgm`, `fga` |
| `threePointFieldGoalsMade-threePointFieldGoalsAttempted` | `threepm`, `threepa` |
| `freeThrowsMade-freeThrowsAttempted` | `ftm`, `fta` |
| `totalRebounds` | `rebounds` |
| `assists`, `blocks`, `steals`, `turnovers`, `points` | matching `GamePerformance` fields |

The test found 72 entries in ESPN's Regular Season section. Two were All-Star appearances; filtering to supported NBA teams left 70 actual regular-season games. The filtered totals matched ESPN's season totals: 2,071 points, 892 rebounds, 716 assists, 127 steals, 45 blocks, 230 turnovers, 786–1364 FG, 138–331 3PT, and 361–451 FT.

ESPN supplies combined shooting strings such as `"7-10"` and whole-minute values in this response. It is an undocumented integration and can change. Its successful retrieval does not establish permission or long-term availability. Review [Disney's applicable terms](https://disneytermsofuse.com/english-canada/) before using automated extraction.

## 1. Fetch a single raw game log

Add these files without changing the existing Fantasy-roster client:

```text
server/integrations/espn/
  gameLogTypes.ts
  gameLogClient.ts
```

The client should expose:

```ts
fetchEspnGameLogs(
  espnPlayerId: string,
  seasonEndYear: number,
): Promise<EspnGameLogResponse>
```

Tasks:

- Define raw types only for the response parts the application reads.
- Fetch the endpoint using the supplied ESPN player ID and season.
- Handle timeout, failed responses, invalid JSON, and malformed response shapes.
- Add runtime validation; a TypeScript cast does not validate downloaded JSON.
- Keep fetching separate from mapping and do not send Fantasy cookies with the stats request.
- Save a permitted, credential-free development fixture for repeatable mapping checks.

**Checkpoint:** a development script fetches and displays one player-season. Do not add a database or HTTP route yet.

## 2. Establish application identities and historical context

`TrackedPlayer.id` is the stable application identity. `espnId` is only an ESPN source reference. Create an application player ID once and reuse it on later roster imports.

The roster currently provides only a team abbreviation. Add a canonical NBA team catalog, for example `server/data/nbaTeams.ts`, before constructing complete `Team` objects. Resolve ESPN team IDs and abbreviations through it; flag unknown values.

Extend `GamePerformance`, or introduce a companion game record, to retain:

- season end year and phase (regular season or playoffs);
- full game timestamp;
- player team for that historical game;
- home/away status;
- ESPN event ID.

This context handles trades, prevents duplicate imports, powers analytics, and supports future model features. Do not use the player's current roster team for a past game.

**Checkpoint:** each player and game has a stable application identity, a source reference, and enough context to represent historical games accurately.

## 3. Map game logs to `GamePerformance[]`

Add `server/integrations/espn/gameLogMapper.ts` as a pure function. It should:

```text
Select a requested phase
→ read individual game rows and exclude summary rows
→ join each row to events[eventId]
→ validate teams and exclude exhibitions
→ pair names[] with stats[]
→ parse shooting pairs and numeric values
→ resolve historical player team and opponent
→ return chronological GamePerformance[]
```

Use the application player ID in `GamePerformance.playerId`, not the ESPN ID. Validate event references, stat-array lengths, shooting pairs, and numeric values. Do not turn absent rows, DNPs, or missing values into zero-stat appearances. Flag malformed records clearly.

**Checkpoint:** verify one mapped game manually, then confirm the Jokic example produces 70 regular-season games and reconciles to the totals above.

## 4. Persist imported history

Use a small relational database such as SQLite for the first local version. Keep data access separate from ESPN clients and mappers.

Suggested logical tables:

| Table | Responsibility |
| --- | --- |
| `players` | Stable application players |
| `player_sources` | Player-to-ESPN-ID mappings |
| `teams` | Canonical NBA teams |
| `games` | Timestamp, season, phase, participating teams, ESPN event ID |
| `performances` | One player's statistics for one game |
| `imports` | Fetch time, requested scope, parser version, and outcome |

Enforce uniqueness for source player IDs, source game IDs, and `(player_id, game_id)` performances. Reimports should update corrections without duplicates. A failed or partial import must not erase existing history.

Add a `gamePerformanceService.ts` to coordinate fetch, validation, mapping, and transactional persistence.

**Checkpoint:** importing the same player-season twice creates no duplicates, and a changed source record updates the existing performance.

## 5. Connect roster import and backend routes

Only after one-player imports work, extend the roster workflow:

```text
getFantasyRoster()
→ resolve or create application players
→ record tracked-player membership
→ import each player's history
→ return an explicit per-player import summary
```

Keep roster membership separate from player identity and game history. Removing a player from a roster must not delete their past performances. Start with sequential imports, cache successful work, and report failures per player for retry.

Add the missing Express entrypoint to load environment variables, enable JSON bodies, mount the router, and listen on a local port. Validate numeric inputs rather than only checking that values are present. Keep normal read routes backed by the database so visiting React screens does not trigger full external imports.

## 6. Add descriptive analytics and React views

Create pure analytics functions, for example:

```text
server/analytics/
  seasonStats.ts
  rollingStats.ts
```

Start with season averages, last-5 and last-10 appearance averages, minutes trends, and variability for points, rebounds, and assists. Calculate shooting percentage from total makes divided by total attempts; never average game percentages. Define how short histories, zero attempts, season boundaries, and postseason work.

Expose stored game logs and summaries through backend read routes, then build the React screens on those routes. Analytics must consume your normalized data and know nothing about ESPN response arrays.

## 7. Build a prediction dataset

Use a narrow first target: **points in a player's next appearance, conditional on that player appearing**. Predicting whether a player will play requires schedule, injury, and availability data that game appearances alone do not provide.

Each training row should represent a target game. Potential features available before it include:

| Feature | Definition |
| --- | --- |
| `pointsLast5` | Mean points in earlier appearances only |
| `minutesLast10` | Mean minutes in earlier appearances only |
| `pointsStdLast10` | Prior scoring variability |
| `daysSinceLastAppearance` | Time since the player's preceding appearance |
| `isHome` | Target game location, known before play |
| `targetPoints` | Actual target-game points; label only |

Prevent data leakage:

- Shift rolling features so the target game never appears in its own inputs.
- Do not use target-game minutes, shooting, or end-of-season averages.
- Fit scalers, imputers, and feature selection using training data only.
- Document a minimum-history rule and missing-data handling.
- Add a schedule source later for forecasts of future games and opponent-based features.

## 8. Train and evaluate a first model

Keep the web backend in TypeScript. Add a Python `modeling/` folder later for dataset building, training, evaluation, and prediction scripts.

Start with two baselines: previous-five-game average and season-to-date average. Compare them with linear regression or Ridge regression. Evaluate in chronological order:

```text
Earlier games → training
Later games   → validation and model choice
Newest games  → final held-out test
```

Do not randomly split player-game rows. For pooled player data, split by dates and keep records from the same game together. Compare mean absolute error against the baselines, inspect results by player and history length, and version the model, features, training cutoff, and evaluation results.

Initially run models offline. Store predictions with the player, target game, value, model version, feature version, generation time, and training cutoff. Keep predictions separate from actual performances.

## Immediate next task

Implement only `gameLogTypes.ts`, `gameLogClient.ts`, and a one-player development script. Stop after you can reliably retrieve and understand the raw response. Continue with identity/context, mapping, persistence, analytics, and modeling as separate milestones.
