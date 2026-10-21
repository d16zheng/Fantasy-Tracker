# Sports Tracker

Simple React and TypeScript MVP for loading an ESPN fantasy basketball roster and viewing regular-season player averages.

## Project structure

- `src/api/statsApi.ts` — requests to the local stats API
- `src/components/PlayerCards.tsx` — clickable player cards with season averages
- `src/components/PlayerDetails.tsx` — full season stats and game logs
- `src/pages/RosterPage.tsx` — team form, request state, search, and sorting
- `src/App.tsx`, `src/main.tsx`, `src/index.css` — application entrypoints and styles
- `shared/types` — types shared by React and Express
- `server` — Express routes, ESPN integrations, and database access

## Getting started

1. Run `npm install`.
2. Create a local `.env` from `.env.example` if one does not already exist. Set `DATABASE_URL="file:./dev.db"` and provide your ESPN cookies for private leagues. These credentials stay on the server.
3. Run `npx prisma generate` and `npx prisma migrate deploy` to prepare the database.
4. Start the API and frontend together:

   ```sh
   npm run dev
   ```

Open the local URL printed by Vite (normally `http://localhost:5173`). To open the app from another device on the same network, use the Network URL Vite prints. Vite forwards `/api` requests to Express on port 3001. If you change the API port with `PORT`, also update the target in `vite.config.ts`.

Enter the `leagueId` and `teamId` from your ESPN fantasy team URL. Click **Load roster**, then search by player name or sort by name or points per game. Select a card to open all available season stats and game logs; close with the Close button or Escape.

The stats dropdown includes the current season and the previous three seasons (2026–27 through 2023–24 as of October 2026). Changing it loads historical stats for your **current-season roster**. Players without games display “No stats available for this season.” The first request fetches game logs; later requests use the backend cache when fresh. Opening player details needs no additional request.

`GET /api/stats/roster?leagueId=123&teamId=5&seasonEndYear=2025` loads the current fantasy roster with 2024–25 player stats. The server determines the roster season automatically using a July rollover; `seasonEndYear` must be an integer from 1947 through the current season's ending year. No database migration is needed.

## Checks

```sh
npm run build
npx tsc -p server/tsconfig.json --noEmit
npm run lint
npm test
```

The Vite production build contains the frontend only. A production deployment also needs the Express API and routing for `/api`.
