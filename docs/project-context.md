# Sports Tracker Project Context

## Current state

Sports Tracker is a React, Vite, and TypeScript project being implemented incrementally by hand. Frontend directories contain placeholders. Backend code defines an ESPN Fantasy roster integration and Express router, but there is no complete server entrypoint, database, stats integration, or analytics implementation.

The existing functions are:

```text
fetchEspnRoster(EspnFantasyTeam) -> Promise<EspnRosterResponse>
mapEspnPlayer(EspnPlayerResponse) -> EspnRosterPlayer
getFantasyRoster(EspnFantasyTeam) -> Promise<EspnRosterPlayer[]>
```

The router defines `GET /roster` and `POST /import`. Both return `EspnRosterPlayer[]`. Import now returns the roster directly, without a matched/unmatched wrapper; it does not yet persist players or resolve stats-source identities.

## Environment

The ESPN client uses `ESPN_SWID` and `ESPN_S2` from the ignored local `.env`. Keep real credentials out of documentation, commits, logs, and chat. `.env.example` is for placeholders. The future server entrypoint must load the environment.

## Existing roster example

`docs/espn-roster-response.example.json` contains the saved roster response. The previously documented test used league `1428686661`, season `2026`, and team `5`, with 14 roster players. This describes an earlier result, not a new live verification.

The player path is `teams[].roster.entries[].playerPoolEntry.player`. Raw ESPN numeric player IDs are converted to strings. Team and position IDs are mapped into NBA team abbreviations and positions.

## Important files

- `server/integrations/espn/client.ts`: roster request.
- `server/integrations/espn/types.ts`: raw response shapes.
- `server/integrations/espn/mapper.ts`: roster mapping.
- `server/services/fantasyRosterService.ts`: requested-team selection.
- `server/routes/fantasy.ts`: roster retrieval routes.
- `shared/types/fantasy.ts`: roster input and output types.
- `shared/types/player.ts`: application player types for future tracking.
- `shared/types/team.ts`: full application team shape.
- `shared/types/stats.ts`: application game-performance and season-stat shapes.

## Next development boundary

Implement the next pieces manually, one at a time. ESPN is the selected initial stats source; its game-log endpoint was verified for Nikola Jokic's 2024–25 season, but no game-log integration has been implemented. See [the implementation roadmap](next-steps.md) for the verified endpoint, response structure, All-Star filtering issue, and phased work through persistence, analytics, and regression modeling. Keep application IDs separate from external IDs. The immediate next task is the game-log client, raw types, and a one-player development script.
