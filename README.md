# Sports Tracker

Simple React and TypeScript MVP for loading an ESPN fantasy basketball roster and viewing regular-season player averages.

## Project structure

- `src/api/statsApi.ts` — requests to the local stats API
- `src/components/PlayerTable.tsx` — player season averages
- `src/pages/RosterPage.tsx` — team form, request state, search, and sorting
- `src/App.tsx`, `src/main.tsx`, `src/index.css` — application entrypoints and styles
- `shared/types` — types shared by React and Express
- `server` — Express routes, ESPN integrations, and database access

## Getting started

1. Run `npm install`.
2. Create a local `.env` from `.env.example` if one does not already exist. Set `DATABASE_URL="file:./dev.db"` and provide your ESPN cookies for private leagues. These credentials stay on the server.
3. Run `npx prisma generate` and `npx prisma migrate deploy` to prepare the database.
4. Start the API in one terminal:

   ```sh
   npm run dev:server
   ```

5. Start React in a second terminal:

   ```sh
   npm run dev
   ```

Open the URL printed by Vite (normally `http://localhost:5173`). Vite forwards `/api` requests to Express on port 3001. If you change the API port with `PORT`, also update the target in `vite.config.ts`.

Enter the `leagueId` and `teamId` from your ESPN fantasy team URL. The season is its ending year: use `2026` for 2025–26. Click **Load roster**, then search by player name or sort by name or points per game. Players without recorded games show a dash for averages.

The first request fetches game logs; later requests use the backend cache when fresh. Player detail pages and charts are deferred beyond this MVP.

## Checks

```sh
npm run build
npx tsc -p server/tsconfig.json --noEmit
npm run lint
npm test
```

The Vite production build contains the frontend only. A production deployment also needs the Express API and routing for `/api`.
