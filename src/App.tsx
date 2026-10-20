import RosterPage from "./pages/RosterPage";
import LeaguePage from "./pages/LeaguePage";
import ComparisonPage from "./pages/ComparisonPage";

export default function App() {
  const match = window.location.pathname.match(/^\/team\/(\d+)\/(\d+)$/);
  if (match) {
    const params = new URLSearchParams(window.location.search);
    return (
      <RosterPage
        leagueId={match[1]}
        teamId={match[2]}
        teamName={params.get("name") ?? ""}
        owner={params.get("owner") ?? ""}
        initialPlayerId={params.get("playerId") ?? ""}
        initialSeasonEndYear={Number(params.get("seasonEndYear")) || null}
        returnTo={params.get("returnTo") ?? ""}
      />
    );
  }
  if (window.location.pathname === "/compare") return <ComparisonPage />;
  return <LeaguePage />;
}
