# Sports Tracker Architecture

## Current flow

```text
GET /roster or POST /import
  -> fantasyRosterService.getFantasyRoster()
  -> espn.client.fetchEspnRoster()
  -> espn.mapper.mapEspnPlayer()
  -> EspnRosterPlayer[]
```

The router is defined in `server/routes/fantasy.ts`. There is no server entrypoint or mounted HTTP server yet. If mounted at `/api/fantasy`, the routes will be:

- `GET /api/fantasy/roster`: query parameters `leagueId`, `teamId`, `seasonId`.
- `POST /api/fantasy/import`: JSON body with `leagueId`, `teamId`, `seasonId`.

Both return `EspnRosterPlayer[]`. The import route currently retrieves the roster only; it does not match players to a stats source or persist anything. It no longer returns a matched/unmatched wrapper. Missing required fields return `400`; provider failures return a generic `500` response.

## Boundaries

- Routes handle HTTP input and responses.
- Services coordinate use cases.
- Integration clients fetch provider data.
- Integration mappers transform provider data into application types.
- Raw provider types belong under `server/integrations/<provider>/`.
- Application types belong under `shared/types/`.

ESPN currently supplies roster membership, player IDs, names, positions, and NBA team abbreviations. The roster mapper does not supply a complete application `Team`.

`Player`, `TrackedPlayer`, `Team`, `SeasonStats`, and `GamePerformance` remain as application models for future work. No current service constructs a `TrackedPlayer`. When implementing that service, assign a stable application player ID and store external source IDs separately. Do not assume IDs from different providers are interchangeable.

## Future flow — not implemented

```text
ESPN Fantasy roster
  -> determine tracked players
  -> resolve players to a replaceable stats source
  -> fetch game logs
  -> map to GamePerformance[]
  -> persist in a database
  -> calculate SeasonStats and analytics
  -> React
```

ESPN is the selected initial stats source. Its game-log endpoint was verified for one player-season, but the application integration is not implemented yet. See [the implementation roadmap](next-steps.md) for verified response details, filtering requirements, and staged work through regression modeling. Source-specific parsing and IDs should not leak into analytics. Resolve provider team representations to application teams, and establish stable game IDs before persistence. Future models should consume historical application data through a separate feature-building and evaluation pipeline.
