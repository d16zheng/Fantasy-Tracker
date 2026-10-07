import type {
    EspnFantasyTeam,
    EspnRosterPlayer,
} from "../../shared/types/fantasy";

import { fetchEspnRoster } from "../integrations/espn/client";

export async function getFantasyRoster(
    fantasyTeam: EspnFantasyTeam
): Promise<EspnRosterPlayer[]> {
    const rawRoster =  await fetchEspnRoster(fantasyTeam);

    return [];
}