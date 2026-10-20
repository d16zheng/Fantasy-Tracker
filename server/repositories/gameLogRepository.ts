import type { GamePerformance } from "../../shared/types/stats";
import { prisma } from "../db/prisma";

export async function saveGameLog(
  playerId: string,
  seasonEndYear: number,
  games: GamePerformance[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const game of games) {
      await tx.gamePerformanceRecord.upsert({
        where: { id: game.id },
        update: {
          data: JSON.stringify(game),
          phase: game.phase,
          date: game.date,
        },
        create: {
          id: game.id,
          playerId: game.playerId,
          espnEventId: game.espnEventId,
          seasonEndYear: game.seasonEndYear,
          phase: game.phase,
          date: game.date,
          data: JSON.stringify(game),
        },
      });
    }

    await tx.gameLogSync.upsert({
      where: {
        playerId_seasonEndYear: {
          playerId,
          seasonEndYear,
        },
      },
      update: {
        fetchedAt: new Date(),
      },
      create: {
        playerId,
        seasonEndYear,
        fetchedAt: new Date(),
      },
    });
  });
}

export async function findGameLog(
  playerId: string,
  seasonEndYear: number,
): Promise<GamePerformance[]> {
  const records = await prisma.gamePerformanceRecord.findMany({
    where: {
      playerId,
      seasonEndYear,
    },
    orderBy: {
      date: "asc",
    },
  });

  return records.map((record) => JSON.parse(record.data) as GamePerformance);
}

export async function getGameLogLastFetched(
  playerId: string,
  seasonEndYear: number,
): Promise<Date | null> {
  const sync = await prisma.gameLogSync.findUnique({
    where: {
      playerId_seasonEndYear: {
        playerId,
        seasonEndYear,
      },
    },
  });

  return sync?.fetchedAt ?? null;
}
