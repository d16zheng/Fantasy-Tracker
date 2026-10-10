import type { EspnRosterPlayer, PlayerMatchResult } from "../../shared/types/fantasy";
import type { TrackedPlayer } from "../../shared/types/player";

import { searchBalldontliePlayers } from "../integrations/balldontlie/client";
import { mapBalldontlieTeam } from "../integrations/balldontlie/mapper";

export async function matchPlayer(
    espnPlayer: EspnRosterPlayer
): Promise<TrackedPlayer | undefined> {
    const search = `${espnPlayer.firstName} ${espnPlayer.lastName}`.trim();

    const response = await searchBalldontliePlayers(search);
    

    const match = response.data.find((candidate) => {
        const sameFirstName = 
            candidate.first_name.toLowerCase() ===
            espnPlayer.firstName.toLowerCase();

        const sameLastName = 
            candidate.last_name.toLowerCase() ===
            espnPlayer.lastName.toLowerCase();
        
        const team = mapBalldontlieTeam(candidate.team);

        const sameTeam = 
            !espnPlayer.nbaTeamAbbreviation ||
            team.abbreviation === espnPlayer.nbaTeamAbbreviation;
            
    
    return sameFirstName && sameLastName && sameTeam;
    
    });

    if (!match) {
        return undefined;
    }

    return {
        id: String(match.id),

        espnId: espnPlayer.espnPlayerId,
        bdlId: match.id,

        firstName: match.first_name,
        lastName: match.last_name,

        position: espnPlayer.position ?? match.position,

        team: mapBalldontlieTeam(match.team)

    };
}

export async function matchRosterPlayers(
    roster: EspnRosterPlayer[]
): Promise<PlayerMatchResult>{
    const matched: TrackedPlayer[] = []
    const unmatched: EspnRosterPlayer[] = []

    for (const player of roster) {
        const match = await matchPlayer(player);
        if(match) {
            matched.push(match);
        } else {
            unmatched.push(player);
        }
    }
    return {
        matched,
        unmatched,
    };
}
