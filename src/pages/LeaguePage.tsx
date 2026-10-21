import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getLeague, saveTeamOwner } from "../api/leagueApi";
import type { League } from "../api/leagueApi";
import LeagueTeamCard from "../components/LeagueTeamCard";

const savedOverviewKey = "sports-tracker:league-overview";
type SavedOverview = { leagueId: string; league: League | null };

function readSavedOverview(): SavedOverview | null {
  try {
    const raw = sessionStorage.getItem(savedOverviewKey);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedOverview;
    if (typeof saved.leagueId !== "string" || !saved.league || !Array.isArray(saved.league.teams))
      return null;
    return saved;
  } catch {
    return null;
  }
}

export default function LeaguePage() {
  const [initialOverview] = useState(readSavedOverview);
  const [leagueId, setLeagueId] = useState(initialOverview?.leagueId ?? "");
  const [league, setLeague] = useState<League | null>(initialOverview?.league ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingTeam, setSavingTeam] = useState("");
  const [ownerErrors, setOwnerErrors] = useState<Record<string, string>>({});
  const savedOwners = useRef<Record<string, string>>(
    Object.fromEntries(
      (initialOverview?.league?.teams ?? []).map((team) => [team.teamId, team.owner]),
    ),
  );
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!league) return;
    try {
      sessionStorage.setItem(
        savedOverviewKey,
        JSON.stringify({ leagueId: league.leagueId, league }),
      );
    } catch {
      // Keep the loaded overview usable if browser storage is unavailable.
    }
  }, [league]);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setLeague(null);
    try {
      const loaded = await getLeague(leagueId.trim(), controller.signal);
      if (controller.signal.aborted) return;
      savedOwners.current = Object.fromEntries(
        loaded.teams.map((team) => [team.teamId, team.owner]),
      );
      setOwnerErrors({});
      setLeague(loaded);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Could not load this league.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function updateOwner(teamId: string, owner: string) {
    if (!league) return;
    setSavingTeam(teamId);
    setError("");
    try {
      await saveTeamOwner(league.leagueId, teamId, owner);
      savedOwners.current[teamId] = owner;
      setOwnerErrors((current) => {
        const next = { ...current };
        delete next[teamId];
        return next;
      });
      setLeague(
        (current) =>
          current && {
            ...current,
            teams: current.teams.map((team) =>
              team.teamId === teamId ? { ...team, owner } : team,
            ),
          },
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save the owner name.";
      setOwnerErrors((current) => ({ ...current, [teamId]: message }));
      setLeague(
        (current) =>
          current && {
            ...current,
            teams: current.teams.map((team) =>
              team.teamId === teamId ? { ...team, owner: savedOwners.current[teamId] ?? "" } : team,
            ),
          },
      );
    } finally {
      setSavingTeam("");
    }
  }

  function openTeam(teamId: string, name: string, owner: string, playerId?: string) {
    const params = new URLSearchParams({ name, owner });
    if (playerId) {
      params.set("playerId", playerId);
      params.set("returnTo", "/");
    }
    window.location.href = `/team/${encodeURIComponent(leagueId.trim())}/${teamId}?${params}`;
  }

  return (
    <main className="container">
      <header className="page-header">
        <p className="eyebrow">
          Sports Tracker <span>/ NBA Fantasy</span>
        </p>
        <h1>Your league, at a glance.</h1>
        <p>Load your ESPN league to see every team roster side by side.</p>
      </header>
      <nav className="page-tabs" aria-label="League pages">
        <a href="/" aria-current="page">
          League rosters
        </a>
        <a href="/compare">Compare teams</a>
        <a href="/predict">Player predictions</a>
      </nav>
      <section className="panel" aria-labelledby="league-heading">
        <h2 id="league-heading">Connect your league</h2>
        <form onSubmit={load}>
          <fieldset disabled={loading} className="league-form">
            <label>
              League ID
              <input
                required
                inputMode="numeric"
                pattern="[0-9]+"
                placeholder="e.g. 1428686661"
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
              />
            </label>
            <button type="submit">{loading ? "Loading…" : "Load league"}</button>
          </fieldset>
        </form>
        <p className="help">
          Rosters for every team come from the current ESPN fantasy season. Open any team to see its
          player stats.
        </p>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <div className="empty-state" role="status">
          <h3>Loading league rosters…</h3>
        </div>
      )}
      {league && (
        <section className="league-grid" aria-label={`${league.teams.length} team rosters`}>
          {league.teams.map((team) => (
            <LeagueTeamCard
              key={team.teamId}
              team={team}
              saving={savingTeam === team.teamId}
              ownerError={ownerErrors[team.teamId]}
              onOpen={(playerId) => openTeam(team.teamId, team.name, team.owner, playerId)}
              onOwnerChange={(owner) => {
                setOwnerErrors((current) => {
                  const next = { ...current };
                  delete next[team.teamId];
                  return next;
                });
                setLeague(
                  (current) =>
                    current && {
                      ...current,
                      teams: current.teams.map((entry) =>
                        entry.teamId === team.teamId ? { ...entry, owner } : entry,
                      ),
                    },
                );
              }}
              onOwnerSave={(owner) => void updateOwner(team.teamId, owner)}
            />
          ))}
        </section>
      )}
      <footer>Rosters and player information provided by ESPN.</footer>
    </main>
  );
}
