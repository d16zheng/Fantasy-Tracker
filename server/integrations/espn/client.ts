import type { EspnFantasyTeam } from '../../../shared/types/fantasy';

const ESPN_FANTASY_BASE_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3";

export async function fetchEspnRoster(
    fantasyTeam: EspnFantasyTeam
) {
    const { leagueId, teamId, seasonId} = fantasyTeam;

    const url = 
        `${ESPN_FANTASY_BASE_URL}` + 
        `/games/fba/seasons/${seasonId}` +
        `/segments/0/leagues/${leagueId}` +
        `?rosterForTeamId=${teamId}` +
        `&view=mRoster`;

    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(
            `ESPN request failed: ${response.status} ${response.statusText}`
        );
    }

    return response.json()
}

