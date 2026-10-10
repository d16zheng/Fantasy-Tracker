import type { Team } from "../../../shared/types/team";
import type {BalldontlieTeamResponse} from "./types";

export function mapBalldontlieTeam(
    team: BalldontlieTeamResponse
): Team { 
    return {
        id: String(team.id),
        name: team.name,
        fullName: team.full_name,
        abbreviation: team.abbreviation,
        city: team.city,
        conference: team.conference,
        division: team.division,
    };
}
