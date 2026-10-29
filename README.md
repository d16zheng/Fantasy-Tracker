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

Player predictions also need the Python service running in a second terminal:

```sh
python3 -m venv ml/.venv
source ml/.venv/bin/activate
pip install -r ml/requirements.txt
uvicorn main:app --app-dir ml --host 127.0.0.1 --port 8000
```

The Express API forwards predictions to `PREDICTION_SERVICE_URL` (default `http://127.0.0.1:8000`). The prediction page supports season-average, recent-ten-game, and weighted-average baselines. Ridge regression is not implemented yet.

### Evaluate prediction baselines

To backtest the three supported baselines against game logs already cached in SQLite, run:

```sh
python ml/evaluate_backtest.py
```

The evaluator replays each tracked player's regular-season appearances in date order. For each target game, it requires at least 10 earlier appearances in that season and predicts using only games from before the target date. It reports mean absolute error (MAE), mean signed error (predicted minus actual), sample count, and player count. FG% and FT% errors are shown in percentage points and are calculated from predicted/actual makes and attempts. These are per-game stat forecasts conditional on the player appearing; they do not evaluate availability.

Use `--season 2026` to evaluate one season, `--min-history 20` to require more history, or `--csv ml/evaluation-results.csv` to save the summary as a CSV. The default database path is the project's `dev.db`; pass `--db /path/to/dev.db` to use another local database.

### Simulate a nine-category matchup

The Python API also exposes `POST /simulate-matchup`. Each team contains players with a scheduled-game count, per-game projected stats, and prior regular-season game stat lines. The simulator bootstraps complete historical stat lines and shifts them around each player's projected average, preserving relationships among stats. It then sums makes and attempts for team FG%/FT%, compares all nine categories (lower turnovers wins), and returns category probabilities plus matchup score probabilities. Pass an optional `seed` for repeatable simulations; `simulations` defaults to 10,000 and accepts 100–50,000.

This first version assumes every player appears in every scheduled game and samples player games independently. It does not model injuries, shared game context, or lineup changes. The Express app does not call this endpoint yet; frontend probability display and historical simulator evaluation are the next steps.

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
