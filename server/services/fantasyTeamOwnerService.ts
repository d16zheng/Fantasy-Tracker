import { prisma } from "../db/prisma";

export async function updateFantasyTeamOwner(
    leagueId: string,
    teamId: number,
    owner: string
): Promise<string | null> {
    const value = owner.trim().slice(0, 80);
    const result = await prisma.fantasyLeagueTeam.updateMany({
        where: { leagueId, teamId },
        data: { owner: value },
    });

    return result.count > 0 ? value : null;
}
