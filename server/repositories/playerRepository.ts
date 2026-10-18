import type { TrackedPlayer } from "../../shared/types/player";
import { prisma } from "../db/prisma";


export async function saveTrackedPlayer(
    player: TrackedPlayer
): Promise<void> {
    await prisma.trackedPlayer.upsert({
        where: {
            id: player.id
        },
        update: {
            firstName: player.firstName,
            lastName: player.lastName,
            position: player.position,
            team: player.team.abbreviation
        },
        create: {
            id: player.id,
            espnId: player.espnId,
            firstName: player.firstName,
            lastName: player.lastName,
            position: player.position,
            team: player.team.abbreviation
        }
    });
}

export async function findTrackedPlayer(
    playerId: string
): Promise<TrackedPlayer | null>{
    const player = await prisma.trackedPlayer.findUnique({
        where: {
            id: playerId
        }
    });

    if (!player) return null;

    return {
        id: player.id,
        espnId: player.espnId,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        team: {
            abbreviation: player.team
        }
    };

}