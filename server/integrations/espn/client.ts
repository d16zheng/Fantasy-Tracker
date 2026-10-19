import type { EspnFantasyTeam } from '../../../shared/types/fantasy';
import type { EspnRosterResponse } from './types';

const ESPN_FANTASY_BASE_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3";

async function fetchEspnFantasyData(url: URL): Promise<EspnRosterResponse> {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            Cookie: [
                `SWID=${process.env.ESPN_SWID ?? ""}`,
                `espn_s2=${process.env.ESPN_S2 ?? ""}`,
            ].join("; "),
        },
    });

    if (!response.ok) {
        throw new Error(
            `ESPN request failed: ${response.status} ${response.statusText}`
        );
    }

    return (await response.json()) as EspnRosterResponse;
}

export async function fetchEspnRoster(
    fantasyTeam: EspnFantasyTeam
): Promise<EspnRosterResponse> {
    const { leagueId, teamId, seasonId} = fantasyTeam;

    const url = new URL(
        `${ESPN_FANTASY_BASE_URL}/games/fba/seasons/${seasonId}/segments/0/leagues/${leagueId}`
    );
    url.searchParams.set("rosterForTeamId", String(teamId));
    url.searchParams.set("view", "mRoster");

    return fetchEspnFantasyData(url);
}

export async function fetchEspnLeague(
    leagueId: string,
    seasonId: number
): Promise<EspnRosterResponse> {
    const url = new URL(
        `${ESPN_FANTASY_BASE_URL}/games/fba/seasons/${seasonId}/segments/0/leagues/${leagueId}`
    );
    url.searchParams.append("view", "mTeam");
    url.searchParams.append("view", "mRoster");

    return fetchEspnFantasyData(url);
}
