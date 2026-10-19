import type { TrackedPlayer } from "./player";
import type { GamePerformance, SeasonStats } from "./stats";

export type PlayerSeasonSummary = {
    player: TrackedPlayer;
    seasonStats: SeasonStats;
    gameLog: GamePerformance[];
    statsError?: string;
};
